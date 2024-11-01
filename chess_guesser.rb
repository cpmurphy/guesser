require 'tempfile'
require 'sinatra'
require 'json'
require 'pgn'
require 'secure_headers'

require_relative 'lib/analyzer'
require_relative 'lib/move_judge'
require_relative 'lib/pgn_summary'
require_relative 'lib/move_translator'

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

  def initialize
    super
    @move_judge = MoveJudge.new
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
      {
        move_number: move_before_win,
        side: winning_side,
        text: "#{critical_move_number}. #{losing_side == 'white' ? '' : '...'} #{critical_moment['move']}"
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
    game_state[:side_to_move] = params[:side]
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
    game_state[:side_to_move] = params[:side]
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
    starting_move = 1
    if game.starting_position
      move_translator.load_game_from_fen(game.starting_position.to_fen.to_s)
      starting_move = game.starting_position.fullmove
    end
    {
      fen: game.positions.first.to_fen,
      moves: moves,
      ui_moves: moves.map { |move| move_translator.translate_move(move) },
      starting_whole_move: starting_move,
      current_whole_move: starting_move,
      white: game.tags['White'],
      black: game.tags['Black'],
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
    current_move = guess['current_move'].to_i - 1
    number_of_moves = guess['number_of_moves'].to_i
    guess_state = {}

    guessed_move = guess['guessed_move']
    source = guessed_move['source']
    target = guessed_move['target']
    path = guess['path']
    game = game_for_path(path)
    old_fen = game.positions[current_move].to_fen
    ui_game_move = guess['game_move']['moves'][0]
    game_move_uci = ui_game_move.sub('-', '')
    game_move = game.moves[current_move].notation
    guessed_move_uci = source + target


    judgment = @move_judge.compare_moves(old_fen, guessed_move_uci, game_move_uci)
    if judgment[:good_move]
      current_move = move_forward(current_move, number_of_moves)
      guess_state = {
        result: 'correct',
        same_as_game: guessed_move_uci == game_move_uci,
        game_move: game_move,
        best_eval: judgment[:best_eval],
        guess_eval: judgment[:guess_eval],
        game_eval: judgment[:game_eval]
      }.merge(state_for_current_move(game, current_move))
    else
      guess_state = {
        result: 'incorrect',
        same_as_game: false,
        game_move: game_move,
        best_eval: judgment[:best_eval],
        guess_eval: judgment[:guess_eval],
        game_eval: judgment[:game_eval]
      }.merge(state_for_current_move(game, current_move))
    end

    response = [guess_state]
    # Automatically play the move for the non-guessing side
    if guess_state[:result] == 'correct' && current_move < number_of_moves
      current_move = move_forward(current_move, number_of_moves)
      response.push({ result: 'auto_move'}.merge(state_for_current_move(game, current_move)))
    end
    response.to_json
  end

  def active_color(current_move)
    if current_move % 2 == 0
      'white'
    else
      'black'
    end
  end

  def move_forward(current_move, number_of_moves)
    if current_move < number_of_moves
      current_move += 1
    end
    current_move
  end

  def state_for_current_move(game, current_move)
    number_of_moves = game.moves.length
    { fen: game.positions[current_move].to_fen,
      move: current_move > 0 ? game.moves[current_move - 1].notation : nil,
      move_number: current_move + 1,
      total_moves: number_of_moves
    }
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

  # start the server if ruby file executed directly
  run! if app_file == $0
end
