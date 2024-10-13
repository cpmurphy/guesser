require 'minitest/autorun'
require_relative '../lib/move_judge'

class MoveJudgeTest < Minitest::Test
  def setup
    @fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  end

  def test_good_move_over_500_cp_but_worse_than_actual
    mock_analyzer = Minitest::Mock.new
    # Remember, the score is from the opponent's perspective, so it will be negated.
    mock_analyzer.expect :evaluate_move, { score: -510 }, [@fen, 'e2e4']  # Guess move

    judge = MoveJudge.new(mock_analyzer)
    assert judge.good_move?(@fen, 'e2e4', 'd2d4')
    mock_analyzer.verify
  end

  def test_good_move_better_than_actual
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_move, { score: -480 }, [@fen, 'd2d4']  # Guess move
    mock_analyzer.expect :evaluate_move, { score: -450 }, [@fen, 'c2c4']  # Actual move

    judge = MoveJudge.new(mock_analyzer)
    assert judge.good_move?(@fen, 'd2d4', 'c2c4')
    mock_analyzer.verify
  end

  def test_good_move_at_least_75_percent_of_best_move
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_move, { score: -390 }, [@fen, 'c2c4']  # Guess move (76.5% of best)
    mock_analyzer.expect :evaluate_move, { score: -480 }, [@fen, 'd2d4']  # Actual move
    mock_analyzer.expect :evaluate_best_move, { score: 510 }, [@fen]  # Best move

    judge = MoveJudge.new(mock_analyzer)
    assert judge.good_move?(@fen, 'c2c4', 'd2d4')
    mock_analyzer.verify
  end

  def test_good_move_at_least_90_percent_of_best_move
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_move, { score: -144 }, [@fen, 'g1f3']  # Guess move (90% of best)
    mock_analyzer.expect :evaluate_move, { score: -150 }, [@fen, 'b1c3']  # Actual move
    mock_analyzer.expect :evaluate_best_move, { score: 160 }, [@fen]  # Best move

    judge = MoveJudge.new(mock_analyzer)
    assert judge.good_move?(@fen, 'g1f3', 'b1c3')
    mock_analyzer.verify
  end

  def test_good_move_within_30_cp_of_best_move
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_move, { score: -50 }, [@fen, 'a2a3']  # Guess move
    mock_analyzer.expect :evaluate_move, { score: -60 }, [@fen, 'b1c3']  # Actual move
    mock_analyzer.expect :evaluate_best_move, { score: 80 }, [@fen]  # Best move

    judge = MoveJudge.new(mock_analyzer)
    assert judge.good_move?(@fen, 'a2a3', 'b1c3')
    mock_analyzer.verify
  end

  def test_not_good_move
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_move, { score: 10 }, [@fen, 'h2h4']    # Guess move
    mock_analyzer.expect :evaluate_move, { score: -32 }, [@fen, 'e2e4']  # Actual move
    mock_analyzer.expect :evaluate_best_move, { score: 32 }, [@fen]  # Best move

    judge = MoveJudge.new(mock_analyzer)
    refute judge.good_move?(@fen, 'h2h4', 'e2e4')
    mock_analyzer.verify
  end
end
