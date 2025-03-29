# frozen_string_literal: true

require_relative 'analyzer'

class MoveJudge
  def initialize(analyzer = Analyzer.new)
    @analyzer = analyzer
  end

  def close
    @analyzer.close
  end

  def compare_moves(old_fen, guessed_move_uci, game_move_uci)
    best_eval = @analyzer.evaluate_best_move(old_fen)
    guess_eval = @analyzer.evaluate_move(old_fen, guessed_move_uci)
    game_eval = @analyzer.evaluate_move(old_fen, game_move_uci)
    guess_score = 0 - guess_eval[:score]
    good_move = guess_score > 500

    game_score = 0 - game_eval[:score]
    good_move ||= guess_score > game_score

    best_score = best_eval[:score]
    unless good_move
      if best_score > 200
        good_move = guess_score >= best_score * 0.75
      elsif best_score > 100 && best_score <= 200
        good_move = guess_score >= best_score * 0.90
      elsif best_score <= 100
        good_move = (best_score - guess_score).abs <= 30
      end
    end

    { good_move: good_move,
      best_eval: best_eval.merge(score: best_score),
      guess_eval: guess_eval.merge(score: guess_score),
      game_eval: game_eval.merge(score: game_score) }
  end

  def evaluate_standalone(old_fen, guessed_move_uci)
    best_eval = @analyzer.evaluate_best_move(old_fen)
    guess_eval = @analyzer.evaluate_move(old_fen, guessed_move_uci)
    guess_score = 0 - guess_eval[:score]
    best_score = best_eval[:score]
    { good_move: guess_score >= best_score * 0.75,
      best_eval: best_eval.merge(score: best_score),
      guess_eval: guess_eval.merge(score: guess_score) }
  end
end
