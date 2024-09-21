require_relative 'analyzer'

class MoveJudge
  def initialize(analyzer = Analyzer.new)
    @analyzer = analyzer
  end

  def guess_in_top_three?(guess, fen)
    source = guess['move']['source']
    target = guess['move']['target']
    uci_move = to_uci(source, target)
    top_moves = @analyzer.best_moves(fen)
    best_score = top_moves[0][:score].to_i
    top_moves.filter! { |move| (best_score - move[:score].to_i).abs < 50 }
    top_moves.map { |move| move[:move] }.include?(uci_move)
  end

  private

  def to_uci(source, target)
    source + target
  end
end