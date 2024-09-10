require 'minitest/autorun'
require_relative '../lib/move_translator'

class MoveTranslatorTest < Minitest::Test
  def setup
    @translator = MoveTranslator.new
  end

  def test_pawn_move
    assert_equal({ moves: ["e2-e4"] }, @translator.translate_move("e4"))
    assert_equal({ moves: ["d7-d5"] }, @translator.translate_move("d5"))
    assert_equal({ moves: ["e4-e5"] }, @translator.translate_move("e5"))
  end

  def test_pawn_capture
    @translator.translate_moves(["e4", "d5"])
    assert_equal({ moves: ["e4-d5"], remove: ['p', 'd5'] }, @translator.translate_move("exd5"))
  end

  def test_black_pawn_capture
    @translator.translate_moves(["e4", "d5", "d4"])
    assert_equal({ moves: ["d5-e4"], remove: ['P', 'e4'] }, @translator.translate_move("dxe4"))
  end

  def test_pawn_en_passant_capture
    @translator.translate_moves(["e4", "a6", "e5", "d5"])
    assert_equal({ moves: ["e5-d6"], remove: ['p', 'd6'] }, @translator.translate_move("exd6"))
  end

  def test_pawn_en_passant_capture_black
    @translator.translate_moves(["Nf3", "c5", "e4", "c4", "d4"])
    assert_equal({ moves: ["c4-d3"], remove: ['P', 'd3'] }, @translator.translate_move("cxd3"))
  end

  def test_knight_move
    assert_equal({ moves: ["g1-f3"] }, @translator.translate_move("Nf3"))
    assert_equal({ moves: ["b8-c6"] }, @translator.translate_move("Nc6"))
  end

  def test_bishop_move
    @translator.translate_move("e4")
    @translator.translate_move("e5")
    assert_equal({ moves: ["f1-c4"] }, @translator.translate_move("Bc4"))
  end

  def test_rook_move
    @translator.translate_moves(["Nf3", "d5", "e3", "Nc6", "Bb5", "Nf6"])
    assert_equal({ moves: ["h1-f1"] }, @translator.translate_move("Rf1"))
  end

  def test_queen_move
    @translator.translate_move("e4")
    @translator.translate_move("e5")
    assert_equal({ moves: ["d1-h5"] }, @translator.translate_move("Qh5"))
  end

  def test_king_move
    @translator.translate_move("e4")
    @translator.translate_move("e5")
    assert_equal({ moves: ["e1-e2"] }, @translator.translate_move("Ke2"))
  end

  def test_castle_short
    @translator.translate_moves(["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5"])
    assert_equal({ moves: ["e1-g1", "h1-f1"] }, @translator.translate_move("O-O"))
  end

  def test_castle_long
    @translator.translate_moves(["d4", "d5", "Nc3", "Nc6", "Bf4", "Bf5", "Qd3", "Qd6"])
    assert_equal({ moves: ["e1-c1", "a1-d1"] }, @translator.translate_move("O-O-O"))
  end

  def test_promotion_to_queen
    @translator.instance_variable_set(:@board, {'a7' => 'P', 'a8' => nil})
    @translator.instance_variable_set(:@current_player, 'white')
    assert_equal({ moves: ["a7-a8"], add: ['Q', 'a8'] }, @translator.translate_move("a8=Q"))
  end

  def test_promotion_to_knight
    @translator.instance_variable_set(:@board, {'a7' => 'P', 'a8' => nil})
    @translator.instance_variable_set(:@current_player, 'white')
    assert_equal({ moves: ["a7-a8"], add: ['N', 'a8'] }, @translator.translate_move("a8=N"))
  end
end
