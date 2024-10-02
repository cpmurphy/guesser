require 'minitest/autorun'
require_relative '../lib/pgn_summary'

class PgnSummaryTest < Minitest::Test
  def setup
    @summary = PgnSummary.new(File.open('test/data/DrNykterstein-recent.pgn', encoding: Encoding::ISO_8859_1))
  end

  def test_load
    games = @summary.load
    assert_equal 10, games.count
    assert_equal ["Gvein", "WowFlow", "DrNykterstein", "Chesstoday", "DrNykterstein", "ThiesHeinemann", "DrNykterstein", "chessmaster2006", "ChessWeeb", "DrNykterstein"], games.map{|game| game['White']}
    assert_equal ["DrNykterstein", "DrNykterstein", "Think_Fast_Move_Fast", "DrNykterstein", "RebeccaHarris", "DrNykterstein", "OhanyanEminChess", "DrNykterstein", "DrNykterstein", "hitter1999"], games.map{|game| game['Black']}
    assert_equal ["2024.03.24", "2023.12.22", "2023.07.01", "2023.07.01", "2023.07.01", "2023.07.01", "2023.07.01", "2023.07.01", "2023.07.01", "2023.07.01"], games.map{|game| game['Date']}
    assert_equal ["Online League SuperBlitz Arena", "Advent of Chess Arena", "Blitz Titled Arena July '23", "Blitz Titled Arena July '23", "Blitz Titled Arena July '23", "Blitz Titled Arena July '23", "Blitz Titled Arena July '23", "Blitz Titled Arena July '23", "Blitz Titled Arena July '23", "Blitz Titled Arena July '23"], games.map{|game| game['Event']}
    assert_equal [0, 918, 1639, 2710, 3536, 4385, 5369, 6491, 7457, 8401], games.map{|game| game['pos']}
  end

  def test_game_at
    @summary.load
    game = @summary.game_at(9)
    assert_includes game, "[White \"DrNykterstein\"]"
    assert_includes game, "[Black \"hitter1999\"]"
    assert_includes game, "[Result \"1-0\"]"
    assert_includes game, "1.b3 Nf6"
    assert_includes game, "1-0"
  end

  def test_load_dos_format
    summary = PgnSummary.new(File.open('test/data/mason-winawer.pgn', encoding: Encoding::ISO_8859_1))
    games = summary.load
    assert_equal 1, games.count
    game = summary.game_at(0)
    assert_includes game, "[White \"James Mason\"]"
    assert_includes game, "[Black \"Simon Winawer\"]"
  end

end
