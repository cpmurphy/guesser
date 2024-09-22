require 'tempfile'
require 'sinatra'
require 'json'
require 'pgn'

require_relative 'lib/analyzer'
require_relative 'lib/move_judge'
require_relative 'lib/pgn_summary'
require_relative 'lib/move_translator'

class ChessGuesser < Sinatra::Base
  enable :sessions
  set :session_store, Rack::Session::Pool

  def initialize
    super
    @move_judge = MoveJudge.new
  end

  get '/' do
    game_state = {}
    if session['game']
      game = session['game']
      current_move = 0
      game_state['fen'] = game.positions[current_move].to_fen.to_s
      game_state['current_move'] = current_move
    else
      puts "we have NO game"
      game_state['white'] = 'White'
      game_state['black'] = 'Black'
      game_state['fen'] = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR'
      game_state['current_move'] = 0
    end
    haml :index, locals: game_state
  end

  post '/upload_pgn' do
    if params[:upload_method] == 'file'
      if params[:pgn_file] && (tempfile = params[:pgn_file][:tempfile])
        pgn_file = Tempfile.new('pgn')
        FileUtils.copy_file(tempfile.path, pgn_file.path)
        pgn_file.rewind
        summary = PgnSummary.new(pgn_file.path)
      end
    else
      pgn_file = Tempfile.new('pgn')
      pgn_file.write(params[:pgn_text])
      pgn_file.rewind
      summary = PgnSummary.new(pgn_file.path)
    end
    if summary
      session['summary'] = summary
      table = summary.load.map.with_index do |game, index|
        {
          id: index,
          white: game['White'],
          black: game['Black'],
          date: game['Date'],
          event: game['Event'],
          result: game['Result']
        }
      end
      { table: table }.to_json
    else
      status 400
      { error: 'No PGN file uploaded' }.to_json
    end
  end

  post '/load_game' do
    game_id = params['game_id'].to_i
    summary = session['summary']
    if summary && game_id >= 0 && game_id < summary.games.length
      games = PGN.parse(summary.game_at(game_id))
      game = games.first
      moves = game.moves.map(&:notation)
      move_translator = MoveTranslator.new
      session['game'] = game
      session['guess_mode'] = 'both'
      {
        fen: game.positions.first.to_fen,
        moves: moves,
        ui_moves: moves.map { |move| move_translator.translate_move(move) },
        white: game.tags['White'],
        black: game.tags['Black'],
        date: game.tags['Date'],
        event: game.tags['Event'],
        result: game.result
      }.to_json
    else
      status 400
      { error: 'Invalid game ID' }.to_json
    end
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
    game = session['game']
    fen = game.positions[current_move].to_fen
    game_move = game.moves[current_move].notation
    guess_mode = session['guess_mode'] || 'both'
    guess_state = {}

    if guess_mode == 'both' || guess_mode == active_color(current_move)
      if @move_judge.guess_in_top_three?(guess, fen)
        current_move = move_forward(current_move)
        next_fen = game.positions[current_move].to_fen
        guess_state = { result: 'correct', same_as_game: false, game_move: game_move }.merge(state_for_current_move(current_move))
      else
        puts "incorrect for #{guess.inspect}"
        puts "correct is #{game.moves[current_move].inspect}"
        guess_state = { result: 'incorrect' }.merge(state_for_current_move(current_move))
      end
    end
    response = [guess_state]
    if guess_mode != 'both' && guess_state[:result] != 'incorrect'
      # Automatically play the move for the non-guessing side
      if current_move < game.moves.size
        current_move = move_forward(current_move)
        response.push({ result: 'auto_move'}.merge(state_for_current_move(current_move)))
      end
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

  def move_forward(current_move)
    game = session['game']
    if current_move < game.moves.size
      current_move += 1
    end
    current_move
  end

  def state_for_current_move(current_move)
    game = session['game']
    { fen: game.positions[current_move].to_fen,
      move_number: current_move + 1,
      total_moves: game.moves.size
    }
  end

  # start the server if ruby file executed directly
  run! if app_file == $0
end