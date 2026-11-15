# frozen_string_literal: true

require_relative 'analyzer'

class MoveJudge
  def initialize(analyzer = Analyzer.new)
    @analyzer = analyzer
  end

  def close
    @analyzer.close
  end

  def compare_moves(old_fen, guessed_move_uci, game_move_uci, subject: nil)
    best_eval = call_analyzer(:evaluate_best_move, [old_fen], subject)
    guess_eval = call_analyzer(:evaluate_move, [old_fen, guessed_move_uci], subject)
    game_eval = call_analyzer(:evaluate_move, [old_fen, game_move_uci], subject)
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

  def evaluate_standalone(old_fen, guessed_move_uci, subject: nil)
    best_eval = call_analyzer(:evaluate_best_move, [old_fen], subject)
    guess_eval = call_analyzer(:evaluate_move, [old_fen, guessed_move_uci], subject)
    guess_score = 0 - guess_eval[:score]
    best_score = best_eval[:score]
    { good_move: guess_score >= best_score * 0.75,
      best_eval: best_eval.merge(score: best_score),
      guess_eval: guess_eval.merge(score: guess_score) }
  end

  private

  # Omit a nil subject so callers that stub the analyzer keep matching on
  # positional arguments alone.
  def call_analyzer(method, args, subject)
    return @analyzer.public_send(method, *args) unless subject

    @analyzer.public_send(method, *args, subject: subject)
  end
end
