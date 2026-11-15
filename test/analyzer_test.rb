# frozen_string_literal: true

require_relative 'test_helper'
require 'minitest/mock'
require_relative '../lib/analyzer'

class AnalyzerTest < Minitest::Test
  def setup
    @engine_url = ENV.delete('ENGINE_URL')
    @mock_engine = Minitest::Mock.new
    mock_engine_configuration
    Stockfish::Engine.stub :new, @mock_engine do
      @analyzer = Analyzer.new(@mock_engine, env: {})
    end
  end

  def teardown
    ENV['ENGINE_URL'] = @engine_url if @engine_url
  end

  # rubocop:disable Minitest/MultipleAssertions

  def test_best_moves_returns_moves_with_scores_and_notations
    @mock_engine.expect :multipv, nil, [3]
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

  def test_evaluate_best_move_returns_move_with_score_and_notation
    @mock_engine.expect :multipv, nil, [1]
    mock_analysis_result(standard_analysis)
    result = @analyzer.evaluate_best_move('mock_fen')

    assert_includes result.keys, :score
    assert_includes result.keys, :move
    assert_instance_of Integer, result[:score]
    assert_instance_of String, result[:move]
  end

  def test_evaluate_move_returns_move_with_score_and_notation
    @mock_engine.expect :multipv, nil, [1]
    @mock_engine.expect :execute, nil, ['position fen mock_fen moves h6h3']
    @mock_engine.expect :execute, standard_analysis, ["go depth #{Analyzer::DEFAULT_DEPTH} nodes #{Analyzer::MAX_NODES}"]
    result = @analyzer.evaluate_move('mock_fen', 'h6h3')

    assert_includes result.keys, :score
    assert_includes result.keys, :move
    assert_instance_of Integer, result[:score]
    assert_instance_of String, result[:move]
  end

  def test_best_moves_handles_score_with_mate_in_n
    @mock_engine.expect :multipv, nil, [3]
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

  def test_best_moves_with_mate_on_the_board
    already_mate_analysis = "info string NNUE evaluation using nn-b1a57edbea57.nnue\ninfo depth 0 score mate 0\nbestmove (none)\n"
    @mock_engine.expect :multipv, nil, [3]
    mock_analysis_result(already_mate_analysis)
    result = @analyzer.best_moves('mock_fen')

    assert_equal 1, result.length
    result.each do |move|
      assert_includes move.keys, :score
      refute move.key?(:move)
      assert_instance_of Integer, move[:score]
    end
  end

  def test_best_moves_with_draw_on_the_board
    draw_analysis = "info string NNUE evaluation using nn-b1a57edbea57.nnue\ninfo depth 0 score cp 0\nbestmove (none)\n"
    @mock_engine.expect :multipv, nil, [3]
    mock_analysis_result(draw_analysis)
    result = @analyzer.best_moves('mock_fen')

    assert_equal 1, result.length
    result.each do |move|
      assert_includes move.keys, :score
    end
  end

  def test_engine_error_handling
    @mock_engine.expect :multipv, nil, [3]
    @mock_engine.expect :analyze, nil do |fen, kw|
      fen == 'mock_fen' && kw[:depth].is_a?(Integer)
    end
    @mock_engine.expect :execute, nil, ['quit']

    error = assert_raises(Analyzer::EngineError) do
      @analyzer.best_moves('mock_fen')
    end

    assert_match(/Engine error/, error.message)
  end

  def test_engine_cleanup
    @mock_engine.expect :execute, nil, ['quit']
    @analyzer.close

    assert_nil @analyzer.instance_variable_get(:@engine)
  end

  def test_custom_configuration
    mock_engine = Minitest::Mock.new
    mock_engine_configuration_for(mock_engine)
    custom_options = {
      timeout: 10,
      depth: 20,
      max_nodes: 2_000_000
    }
    Stockfish::Engine.stub :new, mock_engine do
      analyzer = Analyzer.new('stockfish', custom_options)

      assert_equal 10, analyzer.instance_variable_get(:@timeout)
      assert_equal 20, analyzer.instance_variable_get(:@depth)
      assert_equal 2_000_000, analyzer.instance_variable_get(:@max_nodes)
    end
  end

  private

  def mock_engine_configuration
    mock_engine_configuration_for(@mock_engine)
  end

  def mock_engine_configuration_for(engine)
    engine.expect :execute, nil, ["setoption name MultiPV value #{Analyzer::DEFAULT_MULTIPV}"]
    engine.expect :execute, nil, ['setoption name Hash value 128']
  end

  def mock_analysis_result(analysis_string)
    @mock_engine.expect :analyze, analysis_string do |fen, kw|
      fen == 'mock_fen' &&
        kw[:depth].is_a?(Integer)
    end
  end

  def standard_analysis
    "info depth 14 seldepth 22 multipv 1 score cp 166 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv h7h3 e6f7 h3h7 f7e6 e4d5 e6d5 d3e4 d5e4 h7f7 e7f6 f7b3 e4f5 e1f1 f5g4 b3d3 b7g2 h1g2 d8a8 g2g1 g4h3 d3e2\n" \
      "info depth 14 seldepth 29 multipv 2 score cp 135 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv e4d5 e6d5 d3e4 d5e4 h7f7 e7f6 f7b3 e4f5 e1f1 f5g4 b3d3 b7g2 h1g2 d8a8 g2g1 f6g5 d3e2 g4h4 e3f2 h4h3 f2e1 e8g8\n" \
      "info depth 14 seldepth 14 multipv 3 score cp 0 nodes 110505 nps 2166764 hashfull 30 tbhits 0 time 51 pv e1f1 d5f4 f1f4 e5f4 h7h3 e6e5 e3f4 e5f6 h3h4 f6e6 h4h3 e6f6\n" \
      'bestmove h6h3 ponder e6f7'
  end

  def mate_in_n_analysis
    "info depth 18 seldepth 4 multipv 1 score mate 2 nodes 9700 nps 1212500 hashfull 0 tbhits 0 time 8 pv h7h5 g4h3 f5f3\n" \
      "info depth 18 seldepth 4 multipv 2 score mate 3 nodes 9700 nps 1212500 hashfull 0 tbhits 0 time 8 pv h7h5 g4h3 f5f3\n" \
      "info depth 18 seldepth 4 multipv 3 score mate 4 nodes 9700 nps 1212500 hashfull 0 tbhits 0 time 8 pv h7h5 g4h3 f5f3\n" \
      'bestmove h7h5 ponder g4h3'
  end
  # rubocop:enable Minitest/MultipleAssertions
end

# A stand-in for StockfishPool::Client.
class FakeEngineClient
  attr_reader :calls

  def initialize(result = nil, error: nil)
    @result = result
    @error = error
    @calls = []
  end

  def analyze(**kwargs)
    @calls << kwargs
    raise @error if @error

    @result
  end
end

class AnalyzerPoolTest < Minitest::Test
  def setup
    @client = FakeEngineClient.new(analysis(centipawns: 34, move: 'e2e4', variation: %w[e2e4 e7e5]))
    @analyzer = Analyzer.new('stockfish', client: @client, env: {})
  end

  def test_maps_centipawns_and_the_variation_after_the_move
    result = @analyzer.best_moves('fen', 3, subject: 'abc')

    assert_equal({ score: 34, move: 'e2e4', variation: ['e7e5'] }, result.first)
    assert_equal(
      { fen: 'fen', moves: [], lane: :interactive, depth: Analyzer::DEFAULT_DEPTH, multipv: 3,
        nodes: Analyzer::MAX_NODES, subject: 'abc' },
      @client.calls.first
    )
  end

  def test_evaluate_move_searches_after_the_move
    @analyzer.evaluate_move('fen', 'e2e4')

    assert_equal ['e2e4'], @client.calls.first[:moves]
    assert_equal 1, @client.calls.first[:multipv]
  end

  def test_mate_scores_use_the_existing_scale
    @client = FakeEngineClient.new(analysis(mate: 2, move: 'h7h5'))
    @analyzer = Analyzer.new('stockfish', client: @client, env: {})

    assert_equal 998, @analyzer.evaluate_best_move('fen')[:score]
  end

  def test_mate_on_the_board_is_a_score_without_a_move
    @client = FakeEngineClient.new(analysis(mate: 0, move: nil))
    @analyzer = Analyzer.new('stockfish', client: @client, env: {})
    result = @analyzer.best_moves('fen').first

    assert_equal(-1000, result[:score])
    refute result.key?(:move)
  end

  def test_default_subject_and_batch_lane
    @analyzer = Analyzer.new('stockfish', client: @client, env: {}, lane: :batch, subject: 'guesser-crit')
    @analyzer.evaluate_best_move('fen')

    assert_equal :batch, @client.calls.first[:lane]
    assert_equal 'guesser-crit', @client.calls.first[:subject]
  end

  def test_pool_errors_are_not_wrapped
    @client = FakeEngineClient.new(error: StockfishPool::Client::Busy.new('full', retry_after: 3))
    @analyzer = Analyzer.new('stockfish', client: @client, env: {})

    error = assert_raises(StockfishPool::Client::Busy) { @analyzer.best_moves('fen') }

    assert_equal 3, error.retry_after
  end

  def test_engine_url_selects_the_pool
    env = { 'ENGINE_URL' => 'http://127.0.0.1:4000', 'ENGINE_TOKEN' => 't' * 24 }
    StockfishPool::Client.stub :new, @client do
      analyzer = Analyzer.new('unused', env: env)

      assert_equal 34, analyzer.best_moves('fen').first[:score]
    end
  end

  def test_engine_url_without_a_token_fails_before_starting_an_engine
    error = assert_raises(Analyzer::EngineError) do
      Analyzer.new('stockfish', env: { 'ENGINE_URL' => 'http://127.0.0.1:4000' })
    end

    assert_match(/ENGINE_TOKEN/, error.message)
  end

  def test_failure_response_maps_pool_errors
    busy = StockfishPool::Client::Busy.new('full', retry_after: 3)
    invalid = StockfishPool::Client::InvalidRequest.new('Illegal move')
    down = StockfishPool::Client::Unavailable.new('down')

    assert_equal({ status: 429, message: 'full', retry_after: 3 }, Analyzer.failure_response(busy))
    assert_equal({ status: 400, message: 'Illegal move' }, Analyzer.failure_response(invalid))
    assert_equal({ status: 503, message: 'down' }, Analyzer.failure_response(down))
  end

  def test_failure_response_maps_local_errors_and_ignores_others
    assert_equal({ status: 408, message: 'slow' }, Analyzer.failure_response(Analyzer::TimeoutError.new('slow')))
    assert_nil Analyzer.failure_response(StandardError.new('other'))
  end

  def test_close_leaves_the_client_in_place
    @analyzer.close

    assert_equal 34, @analyzer.best_moves('fen').first[:score]
  end

  private

  def analysis(move:, variation: [], centipawns: nil, mate: nil)
    score = StockfishPool::Client::Score.new(cp: centipawns, mate: mate)
    line = StockfishPool::Client::Line.new(multipv: 1, move: move, score: score, depth: 14, pv: variation)
    StockfishPool::Client::Result.new(
      bestmove: move, lines: [line], engine: 'Stockfish', lane: :interactive, applied: {}, ms: 1
    )
  end
end
