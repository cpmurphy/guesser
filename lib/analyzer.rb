require 'stockfish'

# A thin wrapper that uses the stockfish engine to analyse the position
class Analyzer
  def initialize(engine_path = 'stockfish')
    @engine = Stockfish::Engine.new(engine_path)
  end

  def best_moves(fen, multipv = 3)
    @engine.multipv(multipv)
    analysis = @engine.analyze(fen, depth: 14)

    parse_analysis(analysis)
  end

  def evaluate_move(fen, move)
    move_str = move ? "moves #{move}" : ""
    @engine.execute("position fen #{fen} #{move_str}")
    analysis = @engine.execute("go depth 14")
    parse_analysis(analysis)[0]
  end

  def evaluate_best_move(fen)
    best_moves(fen, 1)[0]
  end

  private

  # Extract the top moves and their corresponding ponder moves
  #
  # analysis is a string like
  # "info depth 14 seldepth 22 multipv 1 score cp 166 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv h7h3 e6f7 h3h7 f7e6 e4d5 e6d5 d3e4 d5e4 h7f7 e7f6 f7b3 e4f5 e1f1 f5g4 b3d3 b7g2 h1g2 d8a8 g2g1 g4h3 d3e2
  #info depth 14 seldepth 29 multipv 2 score cp 135 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv e4d5 e6d5 d3e4 d5e4 h7f7 e7f6 f7b3 e4f5 e1f1 f5g4 b3d3 b7g2 h1g2 d8a8 g2g1 f6g5 d3e2 g4h4 e3f2 h4h3 f2e1 e8g8
  #info depth 14 seldepth 14 multipv 3 score cp 0 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv e1f1 d5f4 f1f4 e5f4 h7h3 e6e5 e3f4 e5f6 h3h4 f6e6 h4h3 e6f6
  #bestmove h6h3 ponder e6f7"
  def parse_analysis(analysis)
    analysis.split("\n").inject([]) do |moves, line|
      if line.start_with?("info")
        match = line.match(/multipv (\d+) score cp (-?\d+) .* pv (\w+)/)
        if match
          # store both the move and the centipawn score
          moves[match[1].to_i - 1] = { score: match[2].to_i, move: match[3] }
        else
          match = line.match(/multipv (\d+) score mate (-?\d+) .* pv (\w+)/)
          if match
          # store both the move and the mate score (1000 - mate score)
            moves[match[1].to_i - 1] = { score: 1000 - match[2].to_i, move: match[3] }
          end
        end
      end
      moves
    end
  end
end