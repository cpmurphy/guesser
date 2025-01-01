require 'tempfile'
require 'sinatra'
require 'json'
require 'pgn'
require 'secure_headers'
require 'i18n'


require_relative 'lib/analyzer'
require_relative 'lib/move_judge'
require_relative 'lib/pgn_summary'
require_relative 'lib/move_translator'
require_relative 'lib/guess_evaluator'
require_relative 'lib/move_localizer'
require_relative 'lib/asset_version'

class ChessGuesser < Sinatra::Base
  enable :sessions
  set :session_store, Rack::Session::Pool

  use SecureHeaders::Middleware

  # Configure SecureHeaders
  SecureHeaders::Configuration.default do |config|
    config.csp = {
      default_src: %w('self'),
      script_src: %w('self' 'unsafe-inline' 'unsafe-eval'),
      style_src: %w('self' 'unsafe-inline'),
      img_src: %w('self' data:),
      connect_src: %w('self'),
      font_src: %w('self'),
      object_src: %w('none'),
      frame_src: %w('none'),
      frame_ancestors: %w('none'),
      form_action: %w('self'),
      base_uri: %w('self'),
      upgrade_insecure_requests: true
    }
    # You can add other security headers here
    config.x_frame_options = "DENY"
    config.x_content_type_options = "nosniff"
    config.x_xss_protection = "1; mode=block"
    config.x_download_options = "noopen"
    config.x_permitted_cross_domain_policies = "none"
    config.referrer_policy = %w(strict-origin-when-cross-origin)
  end

  before do
    if request.post?
      if request.content_length.to_i > 1024*1024  # 1MB limit
        halt 413, { error: 'Request entity too large' }.to_json
      end
    end
  end

  before do
    # First try cookie
    @locale = if request.cookies['locale']
      request.cookies['locale'].to_sym
    else
      # Fall back to browser Accept-Language header
      extract_locale_from_accept_language_header
    end
    I18n.locale = @locale
    @move_localizer = MoveLocalizer.new(@locale)
  end

  private

  def extract_locale_from_accept_language_header
    I18n.default_locale = :en
    return I18n.default_locale unless request.env['HTTP_ACCEPT_LANGUAGE']
    
    # Parse Accept-Language header and get ordered list of locales
    accepted_languages = request.env['HTTP_ACCEPT_LANGUAGE'].split(',')
      .map { |l| l.split(';q=') }
      .map { |l| [l[0].split('-')[0], (l[1] || '1').to_f] }
      .sort_by { |_, q| -q }
      .map { |locale, _| locale.to_sym }

    # Find first supported locale from the accepted languages
    supported_locales = [:en, :de, :es, :fr, :nb, :ru]
    preferred_locale = accepted_languages.find { |locale| supported_locales.include?(locale) }

    preferred_locale || I18n.default_locale
  end

  public

  def initialize
    super
    move_judge = MoveJudge.new
    @evaluator = GuessEvaluator.new(move_judge)
    I18n.load_path << Dir[File.expand_path("i18n/*.yml")]
  end

  get '/' do
    builtin_pgns = gather_builtins

    haml :game_selection, locals: { builtin_pgns: builtin_pgns }
  end

  def gather_builtins
    Dir.glob('data/builtins/*.pgn').map.with_index do |file, index|
      basename = File.basename(file, '.pgn')
      description = basename.split('-').map(&:capitalize).join(' ')
      game_count = PgnSummary.new(File.open(file, encoding: Encoding::ISO_8859_1)).load.size
      [index, file, description, game_count]
    end
  end

  def build_table(summary)
    summary.games.map.with_index do |game, index|
      {
        id: index,
        white: game['White'],
        black: game['Black'],
        date: game['Date'],
        event: game['Event'],
        result: game['Result'],
        critical_moment: game[:analysis] ? notation_for_move(game[:analysis]['last_critical_moment']) : {},
        serious_mistake: game[:analysis] ? notation_for_move(game[:analysis]['first_serious_mistake']) : {}
      }
    end
  end

  def notation_for_move(critical_moment)
    if critical_moment && critical_moment['move_number']
      losing_side = critical_moment['side']
      winning_side = losing_side == 'white' ? 'black' : 'white'
      critical_move_number = critical_moment['move_number']
      move_before_win = winning_side == 'black' ? critical_move_number : critical_move_number + 1
      localized_move = @move_localizer.localize_move(critical_moment['move'])
      {
        move_number: move_before_win,
        side: winning_side,
        text: "#{critical_move_number}. #{losing_side == 'white' ? '' : '...'} #{localized_move[:text]}"
      }
    else
      {}
    end
  end

  get '/uploaded/games' do
    haml :games, locals: { summary: session['summary'], path_prefix: 'uploaded/games' }
  end

  get '/uploaded/games/:id' do
    game_state = uploaded_game_state(params[:id].to_i)
    if params[:move]
      game_state[:current_whole_move] = params[:move].to_i
    end
    if params[:side]
      game_state[:side_to_move] = params[:side]
    end
    haml :game, locals: game_state
  end

  get '/builtin/:index' do
    builtin_pgns = gather_builtins
    file_path = builtin_pgns[params[:index].to_i][1]
    if File.exist?(file_path)
      summary = PgnSummary.new(File.open(file_path, encoding: Encoding::ISO_8859_1))
      summary.load
      json_path = file_path.gsub('.pgn', '.json')
      if File.exist?(json_path)
        summary.add_analysis(JSON.parse(File.read(json_path)))
      end
      haml :games, locals: { summary: summary, path_prefix: "builtin/#{params[:index].to_i}" }
    else
      status 404
      "File not found"
    end
  end

  get '/builtin/:builtin_index/:game_index' do
    game_state = builtin_game_state(params[:builtin_index].to_i, params[:game_index].to_i)
    if params[:move]
      game_state[:current_whole_move] = params[:move].to_i
    end
    if params[:side]
      game_state[:side_to_move] = params[:side]
    end
    haml :game, locals: game_state
  end

  post '/upload_pgn' do
    if params[:upload_method] == 'file'
      if params[:pgn_file] && (tempfile = params[:pgn_file][:tempfile])
        pgn_file = Tempfile.new('pgn', encoding: Encoding::ISO_8859_1)
        FileUtils.copy_file(tempfile.path, pgn_file.path)
        pgn_file.rewind
        summary = PgnSummary.new(pgn_file)
      end
    else
      pgn_file = Tempfile.new('pgn', encoding: Encoding::ISO_8859_1)
      pgn_file.write(params[:pgn_text])
      pgn_file.rewind
      summary = PgnSummary.new(pgn_file)
    end
    if summary
      session['summary'] = summary
      if summary.load.length == 1
        redirect "/uploaded/games/0"
      else
        redirect '/uploaded/games'
      end
    else
      status 400
      { error: 'No PGN file uploaded' }.to_json
    end
  end

  def builtin_game_state(builtin_index, game_index)
    game = builtin_game(builtin_index, game_index)
    build_game_state(game)
  end

  def uploaded_game_state(game_index)
    game = uploaded_game(game_index)
    build_game_state(game)
  end

  def uploaded_game(game_index)
    pgn = session['summary'].game_at(game_index)
    PGN.parse(pgn).first
  end

  def build_game_state(game)
    moves = game.moves.map(&:notation)
    move_translator = MoveTranslator.new
    side_with_first_move = game.starting_position ? game.starting_position.player : 'white'
    starting_move = 1
    white_player = game.tags['White']
    if !white_player || white_player.empty?
      white_player = I18n.t('game.white', locale: @locale)
    end
    black_player = game.tags['Black']
    if !black_player || black_player.empty?
      black_player = I18n.t('game.black', locale: @locale)
    end
    if game.starting_position
      move_translator.load_game_from_fen(game.starting_position.to_fen.to_s)
      starting_move = game.starting_position.fullmove
    end
    {
      locale: @locale,
      fen: game.positions.first.to_fen,
      moves: moves,
      ui_moves: moves.map { |move| move_translator.translate_move(move) },
      starting_whole_move: starting_move,
      current_whole_move: starting_move,
      side_to_move: side_with_first_move,
      white: white_player,
      black: black_player,
      date: game.tags['Date'],
      event: game.tags['Event'],
      result: game.result
    }
  end

  def builtin_game(builtin_index, game_index)
    builtin_pgns = gather_builtins
    file_path = builtin_pgns[builtin_index][1]
    summary = PgnSummary.new(File.open(file_path, encoding: Encoding::ISO_8859_1))
    summary.load
    games = PGN.parse(summary.game_at(game_index))
    games.first
  end

  post '/set_guess_mode' do
    mode = params['mode']
    if ['white', 'black', 'both'].include?(mode)
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
    game = game_for_path(path)
    current_move = guess['current_move'].to_i - 1
    if current_move >= game.moves.length
      translator = MoveTranslator.new
      translator.load_game_from_fen(guess['guessed_move']['oldPos'])
      guessed_move = guess['guessed_move']['source'] + guess['guessed_move']['target']
      if guess['guessed_move']['promotion']
        guessed_move += guess['guessed_move']['promotion']
      end
      move = translator.translate_uci_move(guessed_move)
      return [move.merge({ result: 'game_over' })].to_json
    end
    old_fen = game.positions[current_move].to_fen
    guessed_move = guess['guessed_move']
    number_of_moves = game.moves.length
    ui_game_move = guess['game_move']['moves'][0]

    response = @evaluator.handle_guess(guessed_move, current_move, ui_game_move, number_of_moves, game)

    response.to_json
  end

  def active_color(current_move)
    if current_move % 2 == 0
      'white'
    else
      'black'
    end
  end

  def game_for_path(path)
    game = if path.include?('builtin')
      builtin_index, game_index = path.split('/').select { |part| part.match?(/^\d+$/) }.map(&:to_i)
      builtin_game(builtin_index, game_index)
    else
      uploaded_index = path.split('/').last.to_i
      uploaded_game(uploaded_index)
    end
  end

  def build_fen(old_fen, current_move)
    move_translator = MoveTranslator.new
    move_translator.load_game_from_fen(old_fen)
    move_translator.translate_move(game.moves[current_move].notation)
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
        { error: "No valid move found" }.to_json
      end
    rescue => e
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
  end

  # start the server if ruby file executed directly
  run! if app_file == $0
end
