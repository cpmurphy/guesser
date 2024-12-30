require 'minitest/autorun'
require_relative '../lib/move_localizer'
require 'i18n'

class MoveLocalizerTest < Minitest::Test
  def setup
    @localizer = MoveLocalizer.new
    I18n.load_path << Dir[File.expand_path("i18n/*.yml")]
    I18n.default_locale = :en
  end

  def test_english_piece_moves
    I18n.locale = :en

    assert_localized "e4", "e4"
    assert_localized "Nf3", "Nf3"
    assert_localized "Bb5", "Bb5"
    assert_localized "Qd1", "Qd1"
    assert_localized "Ke2", "Ke2"
    assert_localized "Rad1", "Rad1"
  end

  def test_english_disambiguation
    I18n.locale = :en

    assert_localized "Nbd7", "Nbd7"  # File disambiguation
    assert_localized "N5f3", "N5f3"  # Rank disambiguation
    assert_localized "Qh4e1", "Qh4e1"  # Full square disambiguation
    assert_localized "R1a3", "R1a3"  # Rank disambiguation for rook
  end

  def test_german_piece_moves
    I18n.locale = :de

    assert_localized "e4", "e4"
    assert_localized "Sf3", "Nf3"
    assert_localized "Lb5", "Bb5"
    assert_localized "Dd1", "Qd1"
    assert_localized "Ke2", "Ke2"
    assert_localized "Td1", "Rd1"
  end

  def test_german_disambiguation
    I18n.locale = :de

    assert_localized "Sbd7", "Nbd7"  # File disambiguation
    assert_localized "S5f3", "N5f3"  # Rank disambiguation
    assert_localized "Dh4e1", "Qh4e1"  # Full square disambiguation
    assert_localized "T1a3", "R1a3"  # Rank disambiguation for rook
  end

  def test_english_special_moves
    I18n.locale = :en

    assert_localized "O-O", "O-O"
    assert_localized "O-O-O", "O-O-O"
    assert_localized "O-O+", "O-O+"
    assert_localized "O-O#", "O-O#"
    assert_localized "O-O-O+", "O-O-O+"
    assert_localized "O-O-O#", "O-O-O#"
    assert_localized "exd5", "exd5"
    assert_localized "Nxe4", "Nxe4"
    assert_localized "e8=Q", "e8=Q"
    assert_localized "e8=Q+", "e8=Q+"
    assert_localized "e8=Q#", "e8=Q#"
  end

  def test_german_special_moves
    I18n.locale = :de

    assert_localized "O-O", "O-O"
    assert_localized "O-O-O", "O-O-O"
    assert_localized "O-O+", "O-O+"
    assert_localized "O-O#", "O-O#"
    assert_localized "O-O-O+", "O-O-O+"
    assert_localized "O-O-O#", "O-O-O#"
    assert_localized "exd5", "exd5"
    assert_localized "Sxe4", "Nxe4"
    assert_localized "e8=D", "e8=Q"
    assert_localized "e8=D+", "e8=Q+"
    assert_localized "e8=D#", "e8=Q#"
  end

  def test_spanish_piece_moves
    I18n.locale = :es

    assert_localized "O-O+", "O-O+"
    assert_localized "O-O#", "O-O#"
    assert_localized "O-O-O+", "O-O-O+"
    assert_localized "O-O-O#", "O-O-O#"
    assert_localized "e4", "e4"
    assert_localized "Cf3", "Nf3"
    assert_localized "Ab5", "Bb5"
    assert_localized "Dd1", "Qd1"
    assert_localized "Re2", "Ke2"
    assert_localized "Td1", "Rd1"
  end

  def test_spanish_disambiguation
    I18n.locale = :es

    assert_localized "Cbd7", "Nbd7"  # File disambiguation
    assert_localized "C5f3", "N5f3"  # Rank disambiguation
    assert_localized "Dh4e1", "Qh4e1"  # Full square disambiguation
    assert_localized "T1a3", "R1a3"  # Rank disambiguation for rook
  end

  private

  def assert_localized(expected, algebraic)
    result = @localizer.localize_move(algebraic)
    assert_equal expected, result[:text],
      "Expected '#{algebraic}' to be localized as '#{expected}' but got '#{result[:text]}'"
  end
end
