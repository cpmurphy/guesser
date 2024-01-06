require 'sinatra/base'
require 'pgn'
require 'json'

class ChessGuesser < Sinatra::Base
  enable :sessions
  set :session_store, Rack::Session::Pool

  get '/' do
    game_state = {}
    if session['game']
      game = session['game']
      if session['current_move']
        current_move = session['current_move'].to_i
      else
        current_move = 0
      end
      game_state['white'] = game.tags['White']
      game_state['black'] = game.tags['Black']
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

    session['game'] = games.first
    session['current_move'] = 13
    redirect '/'
  end

  get '/forward' do
    game = session['game']
    current_move = session['current_move'].to_i
    if current_move < game.moves.size - 1
      current_move += 1
      session['current_move'] = current_move
    end

    { fen: game.positions[current_move].to_fen }.to_json
  end

  get '/backward' do
    game = session['game']
    current_move = session['current_move'].to_i
    if current_move > 0
      current_move -= 1
      session['current_move'] = current_move
    end

    { fen: game.positions[current_move].to_fen }.to_json
  end

end
