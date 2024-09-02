require 'minitest/autorun'
require 'minitest/mock'
require_relative '../lib/analyzer'
require 'debug'

class AnalyzerTest < Minitest::Test
  def setup
    @mock_engine = Minitest::Mock.new
    Stockfish::Engine.stub :new, @mock_engine do
      @analyzer = Analyzer.new('mock_path')
    end
  end

  def test_best_moves_returns_moves_with_scores_and_notations
    mock_analysis_result(standard_analysis)
    result = @analyzer.best_moves('mock_fen')
    assert_equal 3, result.length
    result.each do |move|
      assert_includes move.keys, :score
      assert_includes move.keys, :move
      assert_instance_of Integer, move[:score]
      assert_instance_of String, move[:move]
    end
  end

  def test_best_moves_handles_score_with_mate_in_n
    mock_analysis_result(mate_in_n_analysis)
    result = @analyzer.best_moves('mock_fen')
    assert_equal 3, result.length
    result.each do |move|
      assert_includes move.keys, :score
      assert_includes move.keys, :move
      assert_instance_of Integer, move[:score]
      assert_instance_of String, move[:move]
    end
  end

  private

  def mock_analysis_result(analysis_string)
    @mock_engine.expect :multipv, nil, [3]
    @mock_engine.expect :analyze, analysis_string do |fen, kw|
      fen == 'mock_fen' &&
        kw[:depth].is_a?(Integer)
    end
  end

  def standard_analysis
    "info depth 14 seldepth 22 multipv 1 score cp 166 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv h7h3 e6f7 h3h7 f7e6 e4d5 e6d5 d3e4 d5e4 h7f7 e7f6 f7b3 e4f5 e1f1 f5g4 b3d3 b7g2 h1g2 d8a8 g2g1 g4h3 d3e2\n" \
    "info depth 14 seldepth 29 multipv 2 score cp 135 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv e4d5 e6d5 d3e4 d5e4 h7f7 e7f6 f7b3 e4f5 e1f1 f5g4 b3d3 b7g2 h1g2 d8a8 g2g1 f6g5 d3e2 g4h4 e3f2 h4h3 f2e1 e8g8\n" \
    "info depth 14 seldepth 14 multipv 3 score cp 0 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv e1f1 d5f4 f1f4 e5f4 h7h3 e6e5 e3f4 e5f6 h3h4 f6e6 h4h3 e6f6\n" \
    "bestmove h6h3 ponder e6f7"
  end

  def mate_in_n_analysis
    "info depth 18 seldepth 4 multipv 1 score mate 2 nodes 9700 nps 1212500 hashfull 0 tbhits 0 time 8 pv h7h5 g4h3 f5f3\n" \
    "info depth 18 seldepth 4 multipv 2 score mate 2 nodes 9700 nps 1212500 hashfull 0 tbhits 0 time 8 pv f5e5 g4f4 a8f8\n" \
    "info depth 18 seldepth 6 multipv 3 score mate 3 nodes 9700 nps 1212500 hashfull 0 tbhits 0 time 8 pv a8f8 d1c2 h7h5 g4h3 f5f3\n" \
    "bestmove h7h5 ponder g4h3"
  end
end
