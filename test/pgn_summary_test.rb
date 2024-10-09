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

  def test_game_with_cp1252_encoding
    cp1252_data = "[White \"Foo\"]\n[Black \"Bar\"]\n\n1.b3 Nf6 {After \205d5 Black is completely lost} 1-0"
    summary = PgnSummary.new(StringIO.new(cp1252_data))
    games = summary.load
    assert_equal 1, games.count
    game = summary.game_at(0)
    assert_includes game, "[White \"Foo\"]"
    assert_includes game, "[Black \"Bar\"]"
    assert_includes game, "1.b3 Nf6"
    assert_includes game, "1-0"
  end

  def test_add_analysis
    @summary.load
    @summary.add_analysis([
      {"game" => 1, "analysis" => { "last_critical_moment" => {"move_number" => 19, "side" => "white", "move" => "e4"}}},
      {"game" => 2, "analysis" => { "last_critical_moment" => {"move_number" => 20, "side" => "black", "move" => "e5"}}},
      {"game" => 3, "analysis" => { "last_critical_moment" => {"move_number" => 21, "side" => "black", "move" => "e5"}}},
      {"game" => 4, "analysis" => { "last_critical_moment" => {"move_number" => 22, "side" => "white", "move" => "e4"}}},
      {"game" => 5, "analysis" => { "last_critical_moment" => {"move_number" => 23, "side" => "black", "move" => "e5"}}},
      {"game" => 6, "analysis" => { "last_critical_moment" => {"move_number" => 24, "side" => "black", "move" => "e5"}}},
      {"game" => 7, "analysis" => { "last_critical_moment" => {"move_number" => 25, "side" => "white", "move" => "e4"}}},
      {"game" => 8, "analysis" => { "last_critical_moment" => {"move_number" => 26, "side" => "black", "move" => "e5"}}},
      {"game" => 9, "analysis" => { "last_critical_moment" => {"move_number" => 27, "side" => "black", "move" => "e5"}}},
      {"game" => 10,"analysis" => { "last_critical_moment" => {"move_number" => 28, "side" => "white", "move" => "e4"}}},
    ])
    assert_equal 10, @summary.games.count
    assert_equal 19, @summary.games[0][:analysis]["last_critical_moment"]["move_number"]
    assert_equal 28, @summary.games[9][:analysis]["last_critical_moment"]["move_number"]
  end
end
