# frozen_string_literal: true

require_relative 'test_helper'
require_relative '../lib/guess_evaluator'
require 'ostruct'

class GuessEvaluatorTest < Minitest::Test
  def setup
    @move_judge = Minitest::Mock.new
    @evaluator = GuessEvaluator.new(@move_judge)
  end

  # rubocop:disable Minitest/MultipleAssertions
  def test_handle_incorrect_guess
    old_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    guess = create_guess('h2', 'h4')
    game_move = { 'moves' => ['d2-d4'] }

    @move_judge.expect(:compare_moves,
                       { good_move: false, best_eval: 0.5, guess_eval: 0.1, game_eval: 0.3 },
                       [old_fen, 'h2h4', 'd2d4'])

    result = @evaluator.handle_guess(old_fen, guess, game_move)

    assert_equal 'incorrect', result[:result]
    refute result[:same_as_game]
    assert_in_delta(0.5, result[:best_eval])
    assert_in_delta(0.1, result[:guess_eval])
    assert_in_delta(0.3, result[:game_eval])

    @move_judge.verify
  end

  def test_handle_correct_guess_last_move
    old_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    guess = create_guess('e2', 'e4')
    game_move = { 'moves' => ['d2-d4'] }

    @move_judge.expect(:compare_moves,
                       { good_move: true, best_eval: 0.5, guess_eval: 0.3, game_eval: 0.3 },
                       [old_fen, 'e2e4', 'd2d4'])

    result = @evaluator.handle_guess(old_fen, guess, game_move)

    assert_equal 'correct', result[:result]
    refute result[:same_as_game]
    assert_in_delta(0.5, result[:best_eval])
    assert_in_delta(0.3, result[:guess_eval])
    assert_in_delta(0.3, result[:game_eval])

    @move_judge.verify
  end
  # rubocop:enable Minitest/MultipleAssertions

  def test_needs_promotion_for_white_pawn
    assert @evaluator.send(:needs_promotion?, 'e7', 'e8', 'wp')
    refute @evaluator.send(:needs_promotion?, 'e6', 'e7', 'wp')
  end

  def test_needs_promotion_for_black_pawn
    assert @evaluator.send(:needs_promotion?, 'e2', 'e1', 'bp')
    refute @evaluator.send(:needs_promotion?, 'e3', 'e2', 'bp')
  end

  def test_handle_guess_requires_promotion
    old_fen = '8/P1n2pp1/3k3p/8/2p5/4K1P1/6BP/8 w - - 0 36'
    guess = {
      'source' => 'a7',
      'target' => 'a8',
      'piece' => 'wp'
    }
    game_move = nil

    result = @evaluator.handle_guess(old_fen, guess, game_move)

    assert_equal 'needs_promotion', result[:result]
    assert_equal 'a7', result[:source]
    assert_equal 'a8', result[:target]
  end

  def test_handle_guess_with_passing_move
    old_fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    guess = create_guess('e2', 'e4')
    game_move = nil

    @move_judge.expect(:evaluate_standalone,
                       { good_move: true, best_eval: 0.5, guess_eval: 0.3, game_eval: 0.3 },
                       [old_fen, 'e2e4'])

    result = @evaluator.handle_guess(old_fen, guess, game_move)

    assert_equal 'correct', result[:result]
  end

  private

  def create_guess(source, target)
    {
      'source' => source,
      'target' => target,
      'piece' => 'wp'
    }
  end
end
