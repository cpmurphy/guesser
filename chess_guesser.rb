# frozen_string_literal: true

require 'tempfile'
require 'sinatra'
require 'json'
require 'pgn'
require 'secure_headers'
require 'i18n'

require_relative 'lib/guesser/locale_handling'
require_relative 'lib/guesser/game_handling'
require_relative 'lib/guesser/game_summary_page'
require_relative 'lib/guesser/secure_headers_configuration'

require_relative 'lib/analyzer'
require_relative 'lib/move_judge'
require_relative 'lib/pgn_summary'
require_relative 'lib/move_translator'
require_relative 'lib/guess_evaluator'
require_relative 'lib/move_localizer'
require_relative 'lib/asset_version'

class GuesserApp < Sinatra::Base
  include ChessGuesser::LocaleHandling
  include ChessGuesser::GameHandling
  include ChessGuesser::GameSummaryPage

  SUPPORTED_LOCALES = ChessGuesser::LocaleHandling.discover_supported_locales

  enable :sessions
  set :session_store, Rack::Session::Pool

  use SecureHeaders::Middleware
  include ChessGuesser::SecureHeadersConfiguration

  before do
    if request.post? && (request.content_length.to_i > 1024 * 1024)
      halt 413, { error: 'Request entity too large' }.to_json # 1MB limit
    end
  end

  before do
    @locale = choose_locale
    I18n.locale = @locale
    @move_localizer = MoveLocalizer.new(@locale)
  end

  def initialize
    super
    move_judge = MoveJudge.new
    @evaluator = GuessEvaluator.new(move_judge)
    @valid_pgn_basenames = build_builtin_allowlist
  end

  def t(key)
    I18n.t(key, locale: @locale)
  end

  get '/' do
    builtin_pgns = gather_builtins

    haml :game_selection, locals: { builtin_pgns: builtin_pgns }
  end

  get '/uploaded/games' do
    haml :games, locals: { summary: session['summary'], path_prefix: 'uploaded/games' }
  end

  get '/uploaded/games/:id' do
    game_state = uploaded_game_state(params[:id].to_i, @locale)
    game_state[:current_whole_move] = params[:move].to_i if params[:move]
    game_state[:side_to_move] = params[:side] if params[:side]
    haml :game, locals: game_state
  end

  get '/builtin/:basename' do |basename|
    halt 404 unless @valid_pgn_basenames.include?(basename)

    file_path = File.join('data/builtins', "#{basename}-games.pgn")
    if File.exist?(file_path)
      summary = PgnSummary.new(File.open(file_path, encoding: Encoding::ISO_8859_1))
      summary.load
      json_path = file_path.gsub('.pgn', '.json')
      summary.add_analysis(JSON.parse(File.read(json_path))) if File.exist?(json_path)
      haml :games, locals: { summary: summary, path_prefix: "builtin/#{basename}" }
    else
      status 404
      'File not found'
    end
  end

  get '/builtin/:basename/:game_index' do |basename, game_index|
    halt 404 unless @valid_pgn_basenames.include?(basename)

    game_state = builtin_game_state(@valid_pgn_basenames, basename, game_index.to_i, @locale)
    game_state[:current_whole_move] = params[:move].to_i if params[:move]
    game_state[:side_to_move] = params[:side] if params[:side]
    haml :game, locals: game_state
  end

  post '/upload_pgn' do
    summary = summary_from_upload(params)
    if summary
      session['summary'] = summary
      if summary.load.length == 1
        redirect '/uploaded/games/0'
      else
        redirect '/uploaded/games'
      end
    else
      status 400
      { error: 'No PGN file uploaded' }.to_json
    end
  end

  post '/set_guess_mode' do
    mode = params['mode']
    if %w[white black both].include?(mode)
      session['guess_mode'] = mode
      { success: true }.to_json
    else
      status 400
      { error: 'Invalid guess mode' }.to_json
    end
  end

  post '/guess' do
    guess = JSON.parse(request.body.read)
    path = guess['path']
    game = game_for_path(@valid_pgn_basenames, path)
    current_move = guess['current_move'].to_i - 1
    if current_move >= game.moves.length
      translator = MoveTranslator.new
      translator.load_game_from_fen(guess['guessed_move']['oldPos'])
      guessed_move = guess['guessed_move']['source'] + guess['guessed_move']['target']
      guessed_move += guess['guessed_move']['promotion'] if guess['guessed_move']['promotion']
      move = translator.translate_uci_move(guessed_move)
      return [move.merge({ result: 'game_over' })].to_json
    end
    game.positions[current_move].to_fen
    guessed_move = guess['guessed_move']
    number_of_moves = game.moves.length
    ui_game_move = guess['game_move']['moves'][0]

    response = @evaluator.handle_guess(guessed_move, current_move, ui_game_move, number_of_moves, game)

    response.to_json
  end

  post '/engine_move' do
    content_type :json
    data = JSON.parse(request.body.read)
    fen = data['fen']

    begin
      analyzer = Analyzer.new
      best_move = analyzer.evaluate_best_move(fen)

      if best_move && best_move[:move]
        move = best_move[:move]
        move_translator = MoveTranslator.new
        move_translator.load_game_from_fen(fen)
        {
          move: move_translator.translate_uci_move(move)
        }.to_json
      else
        status 400
        { error: 'No valid move found' }.to_json
      end
    rescue StandardError => e
      status 500
      { error: "Engine error: #{e.message}" }.to_json
    end
  end

  configure do
    # Enable asset versioning
    set :asset_version, AssetVersion.version
  end

  # Helper method for asset paths
  helpers do
    def asset_path(path)
      "/#{path}?v=#{settings.asset_version}"
    end

    def supported_locales_with_names
      SUPPORTED_LOCALES.to_h do |locale|
        [locale, I18n.t('language_name', locale: locale)]
      end
    end
  end

  # start the server if ruby file executed directly
  run! if app_file == $PROGRAM_NAME
end
