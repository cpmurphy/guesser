require 'minitest/autorun'
require_relative '../lib/guess_evaluator'
require 'ostruct'

class GuessEvaluatorTest < Minitest::Test
  def setup
    @move_judge = Minitest::Mock.new
    @evaluator = GuessEvaluator.new(@move_judge)
  end

  def test_handle_incorrect_guess
    game = create_game_with_one_move
    guess = create_guess('h2', 'h4')

    @move_judge.expect(:compare_moves,
      { good_move: false, best_eval: 0.5, guess_eval: 0.1, game_eval: 0.3 },
      [game.positions[0].to_fen, 'h2h4', 'd2d4'])

    result = @evaluator.handle_guess(guess, 0, 'd2-d4', 1, game)

    assert_equal 'incorrect', result[0][:result]
    assert_equal false, result[0][:same_as_game]
    assert_equal 'd4', result[0][:game_move]
    assert_equal 0.5, result[0][:best_eval]
    assert_equal 0.1, result[0][:guess_eval]
    assert_equal 0.3, result[0][:game_eval]

    @move_judge.verify
  end

  def test_handle_correct_guess_last_move
    game = create_game_with_one_move
    guess = create_guess('e2', 'e4')

    @move_judge.expect(:compare_moves,
      { good_move: true, best_eval: 0.5, guess_eval: 0.3, game_eval: 0.3 },
      [game.positions[0].to_fen, 'e2e4', 'd2d4'])

    result = @evaluator.handle_guess(guess, 0, 'd2-d4', 1, game)

    assert_equal 'correct', result[0][:result]
    assert_equal false, result[0][:same_as_game]
    assert_equal 'd4', result[0][:game_move]
    assert_equal 0.5, result[0][:best_eval]
    assert_equal 0.3, result[0][:guess_eval]
    assert_equal 0.3, result[0][:game_eval]
    assert_equal 2, result[0][:move_number]
    assert_equal 1, result[0][:total_moves]
    assert_equal 1, result.length  # No auto-move added

    @move_judge.verify
  end

  def test_handle_correct_guess_with_auto_move
    game = create_game_with_two_moves
    guess = create_guess('e2', 'e4')

    @move_judge.expect(:compare_moves,
      { good_move: true, best_eval: 0.5, guess_eval: 0.3, game_eval: 0.3 },
      [game.positions[0].to_fen, 'e2e4', 'd2d4'])

    result = @evaluator.handle_guess(guess, 0, 'd2-d4', 2, game)

    assert_equal 'correct', result[0][:result]
    assert_equal false, result[0][:same_as_game]
    assert_equal 'd4', result[0][:game_move]
    assert_equal 0.5, result[0][:best_eval]
    assert_equal 0.3, result[0][:guess_eval]
    assert_equal 0.3, result[0][:game_eval]
    assert_equal 2, result[0][:move_number]
    assert_equal 2, result[0][:total_moves]

    # Check auto-move
    assert_equal 2, result.length
    assert_equal 'auto_move', result[1][:result]

    @move_judge.verify
  end

  def test_needs_promotion_for_white_pawn
    assert @evaluator.send(:needs_promotion?, 'e7', 'e8', 'wp')
    refute @evaluator.send(:needs_promotion?, 'e6', 'e7', 'wp')
  end

  def test_needs_promotion_for_black_pawn
    assert @evaluator.send(:needs_promotion?, 'e2', 'e1', 'bp')
    refute @evaluator.send(:needs_promotion?, 'e3', 'e2', 'bp')
  end

  def test_handle_guess_requires_promotion
    guess = {
      'source' => 'e7',
      'target' => 'e8',
      'piece' => 'wp'
    }

    result = @evaluator.handle_guess(guess, nil, nil, nil, nil)
    assert_equal 'needs_promotion', result[0][:result]
    assert_equal 'e7', result[0][:source]
    assert_equal 'e8', result[0][:target]
  end

  private

  def create_game_with_one_move
    OpenStruct.new(
      moves: [OpenStruct.new(notation: 'd4')],
      positions: [
        OpenStruct.new(to_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
        OpenStruct.new(to_fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1')
      ]
    )
  end

  def create_game_with_two_moves
    OpenStruct.new(
      moves: [
        OpenStruct.new(notation: 'd4'),
        OpenStruct.new(notation: 'd5')
      ],
      positions: [
        OpenStruct.new(to_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
        OpenStruct.new(to_fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1'),
        OpenStruct.new(to_fen: 'rnbqkbnr/ppp1pppp/8/3p4/3P4/8/PPP1PPPP/RNBQKBNR w KQkq - 0 2')
      ]
    )
  end

  def create_guess(source, target)
    {
      'source' => source,
      'target' => target,
      'piece' => 'wp'
    }
  end
end
