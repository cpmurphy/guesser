require 'minitest/autorun'
require_relative '../lib/move_judge'

class MoveJudgeTest < Minitest::Test
  def setup
    @mock_analyzer = Minitest::Mock.new
    @move_judge = MoveJudge.new(@mock_analyzer)
  end

  def test_simple_pawn_move
    guess = { 'move' => { 'source' => 'e2', 'target' => 'e4', 'piece' => 'wP' } }
    assert @move_judge.are_same?(guess, 'e4')
  end

  def test_simple_knight_move
    guess = { 'move' => { 'source' => 'g1', 'target' => 'f3', 'piece' => 'wN' } }
    assert @move_judge.are_same?(guess, 'Nf3')
  end

  def test_capture
    guess = { 'move' => { 'source' => 'e4', 'target' => 'd5', 'piece' => 'wP' } }
    assert @move_judge.are_same?(guess, 'exd5')
  end

  def test_move_with_check
    guess = { 'move' => { 'source' => 'c5', 'target' => 'b4', 'piece' => 'bB' } }
    assert @move_judge.are_same?(guess, 'Bb4+')
  end

  def test_move_with_checkmate
    guess = { 'move' => { 'source' => 'h2', 'target' => 'h8', 'piece' => 'wQ' } }
    assert @move_judge.are_same?(guess, 'Qh8#')
  end

  def test_file_disambiguation
    guess = { 'move' => { 'source' => 'c1', 'target' => 'e1', 'piece' => 'wR' } }
    assert @move_judge.are_same?(guess, 'Rce1')
  end

  def test_rank_disambiguation
    guess = { 'move' => { 'source' => 'f3', 'target' => 'd4', 'piece' => 'wN' } }
    assert @move_judge.are_same?(guess, 'N3d4')
  end

  def test_move_not_matching
    guess = { 'move' => { 'source' => 'e2', 'target' => 'e4', 'piece' => 'wP' } }
    refute @move_judge.are_same?(guess, 'e5')
  end

  def test_promotion
    guess = { 'move' => { 'source' => 'e7', 'target' => 'e8', 'piece' => 'wP' } }
    assert @move_judge.are_same?(guess, 'e8=Q')
  end

  def test_promotion_with_capture
    guess = { 'move' => { 'source' => 'e2', 'target' => 'd1', 'piece' => 'bP' } }
    assert @move_judge.are_same?(guess, 'exd1=Q')
  end

  def test_promotion_with_capture_but_files_not_matching
    guess = { 'move' => { 'source' => 'c2', 'target' => 'd1', 'piece' => 'bP' } }
    refute @move_judge.are_same?(guess, 'exd1=Q')
  end

  def test_promotion_with_check
    guess = { 'move' => { 'source' => 'e7', 'target' => 'e8', 'piece' => 'wP' } }
    assert @move_judge.are_same?(guess, 'e8=Q+')
  end

  def test_promotion_with_capture_and_check
    guess = { 'move' => { 'source' => 'd2', 'target' => 'e1', 'piece' => 'bP' } }
    assert @move_judge.are_same?(guess, 'dxe1=Q+')
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