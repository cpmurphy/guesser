require 'sinatra/base'
require 'pgn'
require 'json'

$LOAD_PATH.unshift(File.expand_path('lib', __dir__))
require 'analyzer'
require_relative 'lib/move_judge'

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
      if session['current_move']
        current_move = session['current_move'].to_i
      else
        current_move = 0
      end
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
    pgn_content = params[:pgn][:tempfile].read
    games = PGN.parse(pgn_content)
    game = games.first

    session['game'] = game
    session['current_move'] = 0
    white = game.tags['White']
    black = game.tags['Black']
    { white: white, black: black, fen: games.first.positions[0].to_fen }.to_json
  end

  get '/forward' do
    current_move = move_forward
    state_for_current_move(current_move).to_json
  end

  get '/backward' do
    current_move = move_backward
    state_for_current_move(current_move).to_json
  end

  post '/start_guessing' do
    session['guessing'] = true
    redirect '/'
  end

  post '/guess' do
    current_move = session['current_move'].to_i
    guess = JSON.parse(request.body.read)
    game = session['game']
    fen = game.positions[current_move].to_fen
    game_move = game.moves[current_move].notation
    if @move_judge.are_same?(guess, game_move)
      current_move = move_forward
      next_fen = game.positions[current_move].to_fen
      { result: 'correct', same_as_game: true }.merge(state_for_current_move(current_move)).to_json
    elsif @move_judge.guess_in_top_three?(guess, fen)
      current_move = move_forward
      next_fen = game.positions[current_move].to_fen
      { result: 'correct', same_as_game: false, game_move: game_move }.merge(state_for_current_move(current_move)).to_json
    else
      puts "incorrect for #{guess.inspect}"
      puts "correct is #{game.moves[current_move].inspect}"
      { result: 'incorrect' }.merge(state_for_current_move(current_move)).to_json
    end
  end

  def move_forward
    current_move = session['current_move'].to_i
    game = session['game']
    if current_move < game.moves.size - 1
      current_move += 1
      session['current_move'] = current_move
    end
    current_move
  end

  def move_backward
    current_move = session['current_move'].to_i
    if current_move > 0
      current_move -= 1
      session['current_move'] = current_move
    end
    current_move
  end

  def state_for_current_move(current_move)
    game = session['game']
    { fen: game.positions[current_move].to_fen,
      game_move: game.moves[current_move].notation,
      move_number: current_move + 1,
      total_moves: game.moves.size
    }
  end

  # start the server if ruby file executed directly
  run! if app_file == $0
end