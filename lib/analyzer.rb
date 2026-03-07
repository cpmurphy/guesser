# frozen_string_literal: true

require 'stockfish'
require 'timeout'
require_relative 'analysis_parser'

# A thin wrapper that uses the stockfish engine to analyse the position
class Analyzer
  DEFAULT_TIMEOUT = 5 # seconds
  DEFAULT_DEPTH = 14
  DEFAULT_MULTIPV = 3
  MAX_NODES = 1_000_000

  class EngineError < StandardError; end
  class TimeoutError < EngineError; end

  def initialize(engine_path = 'stockfish', options = {})
    @parser = AnalysisParser.new
    @engine_path = engine_path
    @timeout = options.fetch(:timeout, DEFAULT_TIMEOUT)
    @depth = options.fetch(:depth, DEFAULT_DEPTH)
    @max_nodes = options.fetch(:max_nodes, MAX_NODES)
    initialize_engine
  end

  def best_moves(fen, multipv = DEFAULT_MULTIPV)
    ensure_engine_running
    @engine.multipv(multipv)

    analysis = with_timeout do
      @engine.analyze(fen, depth: @depth)
    end

    @parser.parse(analysis)
  rescue TimeoutError
    raise TimeoutError, "Analysis timed out after #{@timeout} seconds"
  rescue StandardError => e
    handle_engine_error(e)
  end

  def evaluate_move(fen, move)
    ensure_engine_running
    move_str = move ? "moves #{move}" : ''
    @engine.execute("position fen #{fen} #{move_str}")

    analysis = with_timeout do
      @engine.execute("go depth #{@depth} nodes #{@max_nodes}")
    end

    @parser.parse(analysis)[0]
  rescue TimeoutError
    raise TimeoutError, "Move evaluation timed out after #{@timeout} seconds"
  rescue StandardError => e
    handle_engine_error(e)
  end

  def evaluate_best_move(fen)
    best_moves(fen, 1)[0]
  end

  def close
    @engine&.execute('quit')
  rescue Errno::EPIPE
    # The stockfish engine may raise an EPIPE error if
    # the connection is closed and the engine is not running.
    # This is a workaround to ignore that error.
  ensure
    @engine = nil
  end

  private

  def initialize_engine
    @engine = Stockfish::Engine.new(@engine_path)
    configure_engine
  rescue StandardError => e
    raise EngineError, "Failed to initialize Stockfish engine: #{e.message}"
  end

  def configure_engine
    @engine.execute("setoption name MultiPV value #{DEFAULT_MULTIPV}")
    @engine.execute('setoption name Hash value 128')
  end

  def ensure_engine_running
    return if @engine

    initialize_engine
  end

  def with_timeout(&block)
    Timeout.timeout(@timeout, &block)
  end

  def handle_engine_error(error)
    close
    raise EngineError, "Engine error: #{error.message}"
  end
end
