require 'sinatra/base'
require 'pgn'
require 'json'

$LOAD_PATH.unshift(File.expand_path('lib', __dir__))
require 'analyzer'

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

  post '/start_guessing' do
    session['guessing'] = true
    redirect '/'
  end

  post '/guess' do
    game = session['game']
    current_move = session['current_move'].to_i
    guess = JSON.parse(request.body.read)
    source = guess['move']['source']
    target = guess['move']['target']
    piece = guess['move']['piece']
    move = to_algebraic(piece, source, target)
    uci_move = to_uci(source, target)
    if moves_equal(move, game.moves[current_move]) ||
      move_in_top_three(uci_move, game.positions[current_move].to_fen)
      { result: 'correct' }.to_json
    else
      puts "incorrect for #{guess.inspect}"
      puts "interpreted as #{move.inspect}"
      puts "correct is #{game.moves[current_move].inspect}"
      { result: 'incorrect' }.to_json
    end
  end

  def moves_equal(move, game_move)
    move == game_move.notation.sub(/x/, '')
  end

  def to_algebraic(piece, source, target)
    if piece =~ /^.P$/
      target
    else
      "#{piece[1]}#{target}"
    end
  end

  def move_in_top_three(uci_move, fen)
    analyzer = Analyzer.new
    top_moves = analyzer.best_moves(fen)
    best_score = top_moves[0][:score].to_i
    top_moves.filter! { |move| (best_score - move[:score].to_i).abs < 50 }
    success = top_moves.map { |move| move[:move] }.include?(uci_move)
    puts "move_in_top_three: #{uci_move} in #{top_moves.inspect}? #{success}"
    success
  end

  def to_uci(source, target)
    source + target
  end

  # start the server if ruby file executed directly
  run! if app_file == $0
end
