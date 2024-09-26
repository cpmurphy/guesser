require_relative 'analyzer'

class MoveJudge
  def initialize(analyzer = Analyzer.new)
    @analyzer = analyzer
  end

  def good_move?(fen, guessed_move, actual_move)
    guess_eval = 0 - @analyzer.evaluate_move(fen, guessed_move)[:score]
    return true if guess_eval > 500

    actual_eval = 0 - @analyzer.evaluate_move(fen, actual_move)[:score]
    return true if guess_eval > actual_eval

    best_eval = @analyzer.evaluate_best_move(fen)[:score]
    if best_eval > 200
      return true if guess_eval >= best_eval * 0.75
    elsif best_eval > 100 && best_eval <= 200
      return true if guess_eval >= best_eval * 0.90
    elsif best_eval <= 100
      return true if (best_eval - guess_eval).abs <= 30
    end

    false
  end
end
