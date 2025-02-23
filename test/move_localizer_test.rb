# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../lib/move_localizer'
require 'i18n'

class MoveLocalizerTest < Minitest::Test
  def setup
    I18n.load_path << Dir[File.expand_path('i18n/*.yml')]
    I18n.default_locale = :en
  end

  def test_english_simple_moves_1
    localizer = MoveLocalizer.new(:en)

    assert_equal 'e4', localizer.localize_move('e4')[:text]
    assert_equal 'Nf3', localizer.localize_move('Nf3')[:text]
    assert_equal 'Bb5', localizer.localize_move('Bb5')[:text]
  end

  def test_english_simple_moves_2
    localizer = MoveLocalizer.new(:en)

    assert_equal 'Qd1', localizer.localize_move('Qd1')[:text]
    assert_equal 'Ke2', localizer.localize_move('Ke2')[:text]
    assert_equal 'Rad1', localizer.localize_move('Rad1')[:text]
  end

  def test_english_disambiguation
    localizer = MoveLocalizer.new(:en)

    assert_equal 'Nbd7', localizer.localize_move('Nbd7')[:text] # File disambiguation
    assert_equal 'R1a3', localizer.localize_move('R1a3')[:text] # Rank disambiguation for rook
    assert_equal 'Qh4e1', localizer.localize_move('Qh4e1')[:text] # Full square disambiguation
  end

  def test_english_castling
    localizer = MoveLocalizer.new(:en)

    assert_equal 'O-O', localizer.localize_move('O-O')[:text]
    assert_equal 'O-O-O', localizer.localize_move('O-O-O')[:text]
  end

  def test_english_castling_short_with_check
    localizer = MoveLocalizer.new(:en)

    assert_equal 'O-O+', localizer.localize_move('O-O+')[:text]
    assert_equal 'O-O#', localizer.localize_move('O-O#')[:text]
  end

  def test_english_castling_long_with_check
    localizer = MoveLocalizer.new(:en)

    assert_equal 'O-O-O+', localizer.localize_move('O-O-O+')[:text]
    assert_equal 'O-O-O#', localizer.localize_move('O-O-O#')[:text]
  end

  def test_english_capture
    localizer = MoveLocalizer.new(:en)

    assert_equal 'exd5', localizer.localize_move('exd5')[:text]
    assert_equal 'Nxe4', localizer.localize_move('Nxe4')[:text]
  end

  def test_english_promotion
    localizer = MoveLocalizer.new(:en)

    assert_equal 'e8=Q', localizer.localize_move('e8=Q')[:text]
    assert_equal 'e8=Q+', localizer.localize_move('e8=Q+')[:text]
    assert_equal 'e8=Q#', localizer.localize_move('e8=Q#')[:text]
  end

  def test_german_simple_moves_1
    localizer = MoveLocalizer.new(:de)

    assert_equal 'e4', localizer.localize_move('e4')[:text]
    assert_equal 'Sf3', localizer.localize_move('Nf3')[:text]
    assert_equal 'Lb5', localizer.localize_move('Bb5')[:text]
  end

  def test_german_simple_moves_2
    localizer = MoveLocalizer.new(:de)

    assert_equal 'Dd1', localizer.localize_move('Qd1')[:text]
    assert_equal 'Ke2', localizer.localize_move('Ke2')[:text]
    assert_equal 'Td1', localizer.localize_move('Rd1')[:text]
  end

  def test_german_disambiguation
    localizer = MoveLocalizer.new(:de)

    assert_equal 'Sbd7', localizer.localize_move('Nbd7')[:text]  # File disambiguation
    assert_equal 'T1a3', localizer.localize_move('R1a3')[:text]  # Rank disambiguation for rook
    assert_equal 'Dh4e1', localizer.localize_move('Qh4e1')[:text] # Full square disambiguation
  end

  def test_german_castling
    localizer = MoveLocalizer.new(:de)

    assert_equal 'O-O', localizer.localize_move('O-O')[:text]
    assert_equal 'O-O-O', localizer.localize_move('O-O-O')[:text]
    assert_equal 'O-O+', localizer.localize_move('O-O+')[:text]
  end

  def test_german_castling_with_check
    localizer = MoveLocalizer.new(:de)

    assert_equal 'O-O#', localizer.localize_move('O-O#')[:text]
    assert_equal 'O-O-O+', localizer.localize_move('O-O-O+')[:text]
    assert_equal 'O-O-O#', localizer.localize_move('O-O-O#')[:text]
  end

  def test_german_capture
    localizer = MoveLocalizer.new(:de)

    assert_equal 'exd5', localizer.localize_move('exd5')[:text]
    assert_equal 'Sxe4', localizer.localize_move('Nxe4')[:text]
  end

  def test_german_promotion
    localizer = MoveLocalizer.new(:de)

    assert_equal 'e8=D', localizer.localize_move('e8=Q')[:text]
    assert_equal 'e8=D+', localizer.localize_move('e8=Q+')[:text]
    assert_equal 'e8=D#', localizer.localize_move('e8=Q#')[:text]
  end

  def test_russian_simple_moves_1
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'д4', localizer.localize_move('e4')[:text]
    assert_equal 'Ке3', localizer.localize_move('Nf3')[:text]
    assert_equal 'Сб5', localizer.localize_move('Bb5')[:text]
  end

  def test_russian_simple_moves_2
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'Фг1', localizer.localize_move('Qd1')[:text]
    assert_equal 'Крд2', localizer.localize_move('Ke2')[:text]
    assert_equal 'Лаг1', localizer.localize_move('Rad1')[:text]
  end

  def test_russian_disambiguation
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'Кбг7', localizer.localize_move('Nbd7')[:text] # File disambiguation
    assert_equal 'Л1а3', localizer.localize_move('R1a3')[:text] # Rank disambiguation for rook
    assert_equal 'Фз4д1', localizer.localize_move('Qh4e1')[:text] # Full square disambiguation
  end

  def test_russian_castling
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'O-O', localizer.localize_move('O-O')[:text]
    assert_equal 'O-O-O', localizer.localize_move('O-O-O')[:text]
    assert_equal 'O-O+', localizer.localize_move('O-O+')[:text]
  end

  def test_russian_castling_with_check
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'O-O#', localizer.localize_move('O-O#')[:text]
    assert_equal 'O-O-O+', localizer.localize_move('O-O-O+')[:text]
    assert_equal 'O-O-O#', localizer.localize_move('O-O-O#')[:text]
  end

  def test_russian_capture
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'дxг5', localizer.localize_move('exd5')[:text]
    assert_equal 'Кxд4', localizer.localize_move('Nxe4')[:text]
  end

  def test_russian_promotion
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'д8=Ф+', localizer.localize_move('e8=Q+')[:text]
    assert_equal 'д8=Ф#', localizer.localize_move('e8=Q#')[:text]
  end

  def test_russian_complex_moves
    localizer = MoveLocalizer.new(:ru)

    assert_equal 'Ке3xг4+', localizer.localize_move('Nf3xd4+')[:text]
    assert_equal 'Сб5xв6', localizer.localize_move('Bb5xc6')[:text]
    assert_equal 'Фз4xд1#', localizer.localize_move('Qh4xe1#')[:text]
  end
end
