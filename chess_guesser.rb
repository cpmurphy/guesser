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
    current_move = move_forward
    game = session['game']
    { fen: game.positions[current_move].to_fen }.to_json
  end

  get '/backward' do
    current_move = move_backward
    game = session['game']
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
    if guess_matches(guess, game.moves[current_move].notation) ||
      guess_in_top_three(guess, game.positions[current_move].to_fen)
      move_forward
      { result: 'correct' }.to_json
    else
      puts "incorrect for #{guess.inspect}"
      puts "interpreted as #{move.inspect}"
      puts "correct is #{game.moves[current_move].inspect}"
      { result: 'incorrect' }.to_json
    end
  end

  def guess_matches(guess, game_move)
    source = guess['move']['source']
    target = guess['move']['target']
    piece = guess['move']['piece']
    move = to_algebraic(guess)
    if move == game_move
      true
    else
      if game_move =~ /x/
        game_move.sub!(/x/, '') == move
      end
      if move == game_move
        true
      else
        # check if game move includes a file or rank disambiguation
        if game_move =~ /^[NBRQK][a-h1-8][a-h][1-8]$/
          disambiguation = game_move[1]
          game_target = game_move[2..3]

          if ('a'..'h').include?(disambiguation) # file disambiguation
            target == game_target && source[0] == disambiguation
          elsif ('1'..'8').include?(disambiguation) # rank disambiguation
            target == game_target && source[1] == disambiguation
          else
            false
          end
        else
          false
        end
      end
    end
  end

  def move_forward
    game = session['game']
    current_move = session['current_move'].to_i
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

  def to_algebraic(guess)
    source = guess['move']['source']
    target = guess['move']['target']
    piece = guess['move']['piece']
    if piece =~ /^.P$/
      target
    else
      "#{piece[1]}#{target}"
    end
  end

  def guess_in_top_three(guess, fen)
    source = guess['move']['source']
    target = guess['move']['target']
    uci_move = to_uci(source, target)
    analyzer = Analyzer.new
    top_moves = analyzer.best_moves(fen)
    best_score = top_moves[0][:score].to_i
    top_moves.filter! { |move| (best_score - move[:score].to_i).abs < 50 }
    success = top_moves.map { |move| move[:move] }.include?(uci_move)
    puts "guess_in_top_three: #{uci_move} in #{top_moves.inspect}? #{success}"
    success
  end

  def to_uci(source, target)
    source + target
  end

  # start the server if ruby file executed directly
  run! if app_file == $0
end