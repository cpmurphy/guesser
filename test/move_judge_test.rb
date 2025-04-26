# frozen_string_literal: true

require_relative 'test_helper'
require_relative '../lib/move_judge'

class MoveJudgeTest < Minitest::Test
  def setup
    @fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
  end

  # rubocop:disable Minitest/MultipleAssertions
  def test_good_move_over_500_cp
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 400 }, [@fen]
    # Remember, the score is from the opponent's perspective, so it will be negated
    mock_analyzer.expect :evaluate_move, { score: -510 }, [@fen, 'e2e4']  # Guess move
    mock_analyzer.expect :evaluate_move, { score: -450 }, [@fen, 'd2d4']  # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'e2e4', 'd2d4')

    assert result[:good_move]
    assert_equal 510, result[:guess_eval][:score]
    assert_equal 450, result[:game_eval][:score]
    assert_equal 400, result[:best_eval][:score]
    mock_analyzer.verify
  end

  def test_good_move_better_than_game_move
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 500 }, [@fen]
    mock_analyzer.expect :evaluate_move, { score: -480 }, [@fen, 'd2d4']  # Guess move
    mock_analyzer.expect :evaluate_move, { score: -450 }, [@fen, 'c2c4']  # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'd2d4', 'c2c4')

    assert result[:good_move]
    assert_equal 480, result[:guess_eval][:score]
    assert_equal 450, result[:game_eval][:score]
    mock_analyzer.verify
  end

  def test_good_move_at_least_75_percent_of_best_move_when_over_200
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 510 }, [@fen]
    mock_analyzer.expect :evaluate_move, { score: -390 }, [@fen, 'c2c4']  # Guess move (76.5% of best)
    mock_analyzer.expect :evaluate_move, { score: -480 }, [@fen, 'd2d4']  # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'c2c4', 'd2d4')

    assert result[:good_move]
    assert_equal 390, result[:guess_eval][:score]
    assert_equal 480, result[:game_eval][:score]
    assert_equal 510, result[:best_eval][:score]
    mock_analyzer.verify
  end

  def test_good_move_at_least_90_percent_of_best_move_when_100_to_200
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 160 }, [@fen]
    mock_analyzer.expect :evaluate_move, { score: -144 }, [@fen, 'g1f3']  # Guess move (90% of best)
    mock_analyzer.expect :evaluate_move, { score: -150 }, [@fen, 'b1c3']  # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'g1f3', 'b1c3')

    assert result[:good_move]
    assert_equal 144, result[:guess_eval][:score]
    assert_equal 150, result[:game_eval][:score]
    assert_equal 160, result[:best_eval][:score]
    mock_analyzer.verify
  end

  def test_good_move_within_30_cp_of_best_move_when_under_100
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 80 }, [@fen]
    mock_analyzer.expect :evaluate_move, { score: -50 }, [@fen, 'a2a3']  # Guess move
    mock_analyzer.expect :evaluate_move, { score: -60 }, [@fen, 'b1c3']  # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'a2a3', 'b1c3')

    assert result[:good_move]
    assert_equal 50, result[:guess_eval][:score]
    assert_equal 60, result[:game_eval][:score]
    assert_equal 80, result[:best_eval][:score]
    mock_analyzer.verify
  end

  def test_good_move_not_within_30_cp_of_best_move_when_over_100
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 484 }, [@fen]
    mock_analyzer.expect :evaluate_move, { score: -331 }, [@fen, 'a2a3'] # Guess move
    mock_analyzer.expect :evaluate_move, { score: -87 }, [@fen, 'b1c3'] # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'a2a3', 'b1c3')

    assert result[:good_move]
    assert_equal 331, result[:guess_eval][:score]
    assert_equal 87, result[:game_eval][:score]
    assert_equal 484, result[:best_eval][:score]
    mock_analyzer.verify
  end

  def test_not_good_move
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 32 }, [@fen]
    mock_analyzer.expect :evaluate_move, { score: 10 }, [@fen, 'h2h4'] # Guess move
    mock_analyzer.expect :evaluate_move, { score: -32 }, [@fen, 'e2e4']  # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'h2h4', 'e2e4')

    refute result[:good_move]
    assert_equal(-10, result[:guess_eval][:score])
    assert_equal 32, result[:game_eval][:score]
    assert_equal 32, result[:best_eval][:score]
    mock_analyzer.verify
  end

  def test_not_good_promotion
    mock_analyzer = Minitest::Mock.new
    mock_analyzer.expect :evaluate_best_move, { score: 32 }, [@fen]
    mock_analyzer.expect :evaluate_move, { score: 10 }, [@fen, 'e7e8n']  # Guess move
    mock_analyzer.expect :evaluate_move, { score: -32 }, [@fen, 'e7e8q'] # Game move

    judge = MoveJudge.new(mock_analyzer)
    result = judge.compare_moves(@fen, 'e7e8n', 'e7e8q')

    refute result[:good_move]
    assert_equal(-10, result[:guess_eval][:score])
    assert_equal 32, result[:game_eval][:score]
    assert_equal 32, result[:best_eval][:score]
    mock_analyzer.verify
  end
  # rubocop:enable Minitest/MultipleAssertions
end
