require 'sinatra/base'
require 'pgn'

class ChessGuesser < Sinatra::Base

  get '/' do
    haml :index
  end

  post '/upload_pgn' do
    pgn_content = params[:pgn][:tempfile].read
    games = PGN.parse(pgn_content)

    # Now 'game' contains the parsed PGN data
    # You can access moves, tags, etc. from the parsed game

    # Example: Display the moves
    moves = games.first.inspect #.moves.map { |move| move.to_s }.join(' ')
    "Parsed Moves: #{moves}"
  end

end
