require 'minitest/autorun'
require_relative '../lib/move_judge'

class MoveJudgeTest < Minitest::Test
  def setup
    @mock_analyzer = Minitest::Mock.new
    @move_judge = MoveJudge.new(@mock_analyzer)
  end

  def test_guess_in_top_three_correct
    guess = { 'move' => { 'source' => 'e2', 'target' => 'e4' } }
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    
    @mock_analyzer.expect :best_moves, [
      { move: 'e2e4', score: 100 },
      { move: 'd2d4', score: 90 },
      { move: 'g1f3', score: 80 }
    ], [fen]

    assert @move_judge.guess_in_top_three?(guess, fen)
    @mock_analyzer.verify
  end

  def test_guess_in_top_three_incorrect
    guess = { 'move' => { 'source' => 'a2', 'target' => 'a4' } }
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    
    @mock_analyzer.expect :best_moves, [
      { move: 'e2e4', score: 100 },
      { move: 'd2d4', score: 90 },
      { move: 'g1f3', score: 80 }
    ], [fen]

    refute @move_judge.guess_in_top_three?(guess, fen)
    @mock_analyzer.verify
  end

  def test_guess_in_top_three_within_score_range
    guess = { 'move' => { 'source' => 'g1', 'target' => 'f3' } }
    fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
    
    @mock_analyzer.expect :best_moves, [
      { move: 'e2e4', score: 100 },
      { move: 'd2d4', score: 90 },
      { move: 'g1f3', score: 60 },
      { move: 'b1c3', score: 40 }
    ], [fen]

    assert @move_judge.guess_in_top_three?(guess, fen)
    @mock_analyzer.verify
  end
end