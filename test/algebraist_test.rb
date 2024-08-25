require 'minitest/autorun'
require_relative '../lib/algebraist'

class AlgebraistTest < Minitest::Test
  def test_pawn_move
    guess = { 'move' => { 'source' => 'e2', 'target' => 'e4', 'piece' => 'wP' } }
    assert_equal 'e4', Algebraist.to_algebraic(guess)
  end

  def test_pawn_capture
    guess = { 'move' => { 'source' => 'e4', 'target' => 'd5', 'piece' => 'wP' } }
    assert_equal 'exd5', Algebraist.to_algebraic(guess)
  end

  def test_knight_move
    guess = { 'move' => { 'source' => 'g1', 'target' => 'f3', 'piece' => 'wN' } }
    assert_equal 'Nf3', Algebraist.to_algebraic(guess)
  end

  def test_bishop_move
    guess = { 'move' => { 'source' => 'f1', 'target' => 'b5', 'piece' => 'wB' } }
    assert_equal 'Bb5', Algebraist.to_algebraic(guess)
  end

  def test_rook_move
    guess = { 'move' => { 'source' => 'a1', 'target' => 'a3', 'piece' => 'wR' } }
    assert_equal 'Ra3', Algebraist.to_algebraic(guess)
  end

  def test_queen_move
    guess = { 'move' => { 'source' => 'd1', 'target' => 'd4', 'piece' => 'wQ' } }
    assert_equal 'Qd4', Algebraist.to_algebraic(guess)
  end

  def test_king_move
    guess = { 'move' => { 'source' => 'e1', 'target' => 'e2', 'piece' => 'wK' } }
    assert_equal 'Ke2', Algebraist.to_algebraic(guess)
  end

  def test_castle_short
    guess = { 'move' => { 'source' => 'e1', 'target' => 'g1', 'piece' => 'wK' } }
    assert_equal 'O-O', Algebraist.to_algebraic(guess)
  end

  def test_castle_long
    guess = { 'move' => { 'source' => 'e8', 'target' => 'c8', 'piece' => 'bK' } }
    assert_equal 'O-O-O', Algebraist.to_algebraic(guess)
  end
end