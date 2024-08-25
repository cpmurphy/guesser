require 'minitest/autorun'
require_relative '../lib/move_judge'

class MoveJudgeTest < Minitest::Test
  def test_simple_pawn_move
    guess = { 'move' => { 'source' => 'e2', 'target' => 'e4', 'piece' => 'wP' } }
    assert MoveJudge.are_same?(guess, 'e4')
  end

  def test_simple_knight_move
    guess = { 'move' => { 'source' => 'g1', 'target' => 'f3', 'piece' => 'wN' } }
    assert MoveJudge.are_same?(guess, 'Nf3')
  end

  def test_capture
    guess = { 'move' => { 'source' => 'e4', 'target' => 'd5', 'piece' => 'wP' } }
    assert MoveJudge.are_same?(guess, 'exd5')
  end

  def test_file_disambiguation
    guess = { 'move' => { 'source' => 'c1', 'target' => 'e1', 'piece' => 'wR' } }
    assert MoveJudge.are_same?(guess, 'Rce1')
  end

  def test_rank_disambiguation
    guess = { 'move' => { 'source' => 'f3', 'target' => 'd4', 'piece' => 'wN' } }
    assert MoveJudge.are_same?(guess, 'N3d4')
  end

  def test_move_not_matching
    guess = { 'move' => { 'source' => 'e2', 'target' => 'e4', 'piece' => 'wP' } }
    refute MoveJudge.are_same?(guess, 'e5')
  end

  def test_promotion
    guess = { 'move' => { 'source' => 'e7', 'target' => 'e8', 'piece' => 'wP' } }
    assert MoveJudge.are_same?(guess, 'e8=Q')
  end

  def test_promotion_with_capture
    guess = { 'move' => { 'source' => 'e2', 'target' => 'd1', 'piece' => 'bP' } }
    assert MoveJudge.are_same?(guess, 'exd1=Q')
  end

  def test_promotion_with_capture_but_files_not_matching
    guess = { 'move' => { 'source' => 'c2', 'target' => 'd1', 'piece' => 'bP' } }
    refute MoveJudge.are_same?(guess, 'exd1=Q')
  end

  def test_promotion_with_check
    guess = { 'move' => { 'source' => 'e7', 'target' => 'e8', 'piece' => 'wP' } }
    assert MoveJudge.are_same?(guess, 'e8=Q+')
  end

  def test_promotion_with_capture_and_check
    guess = { 'move' => { 'source' => 'd2', 'target' => 'e1', 'piece' => 'bP' } }
    assert MoveJudge.are_same?(guess, 'dxe1=Q+')
  end
end