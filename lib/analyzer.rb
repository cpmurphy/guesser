# frozen_string_literal: true

require 'stockfish'
require 'stockfish_pool_client'
require 'timeout'
require_relative 'analysis_parser'

# Analyses a position, either with a local Stockfish process or, when
# ENGINE_URL is set, with the shared stockfish-pool.
class Analyzer
  DEFAULT_TIMEOUT = 5 # seconds
  DEFAULT_DEPTH = 14
  DEFAULT_MULTIPV = 3
  MAX_NODES = 1_000_000

  class EngineError < StandardError; end
  class TimeoutError < EngineError; end

  # How a failure should be shown to a web client, or nil when it is not an
  # analysis failure. Busy and quota responses include :retry_after when known.
  def self.failure_response(error)
    case error
    when StockfishPool::Client::InvalidRequest
      { status: 400, message: error.message }
    when StockfishPool::Client::Busy, StockfishPool::Client::QuotaExceeded
      { status: 429, message: error.message, retry_after: error.retry_after }
    when TimeoutError
      { status: 408, message: error.message }
    when EngineError, StockfishPool::Client::Error
      { status: 503, message: error.message }
    end
  end

  def initialize(engine_path = 'stockfish', options = {})
    @parser = AnalysisParser.new
    @timeout = options.fetch(:timeout, DEFAULT_TIMEOUT)
    @depth = options.fetch(:depth, DEFAULT_DEPTH)
    @max_nodes = options.fetch(:max_nodes, MAX_NODES)
    @lane = options.fetch(:lane, :interactive)
    @subject = options[:subject]
    @mutex = Mutex.new
    @client = options[:client]
    @client ||= pool_client(options.fetch(:env, ENV)) if options.fetch(:env, ENV)['ENGINE_URL'].to_s != ''
    return if @client

    @engine_path = engine_path
    initialize_engine
  end

  def best_moves(fen, multipv = DEFAULT_MULTIPV, subject: nil)
    return pool_lines(fen, multipv: multipv, subject: subject) if @client

    local_best_moves(fen, multipv)
  end

  def evaluate_move(fen, move, subject: nil)
    if @client
      moves = move ? [move] : []
      return pool_lines(fen, moves: moves, multipv: 1, subject: subject).first
    end

    local_evaluate_move(fen, move)
  end

  def evaluate_best_move(fen, subject: nil)
    best_moves(fen, 1, subject: subject)[0]
  end

  def close
    return if @client

    @mutex.synchronize do
      @engine&.execute('quit')
    rescue Errno::EPIPE
      # The stockfish engine may raise an EPIPE error if
      # the connection is closed and the engine is not running.
      # This is a workaround to ignore that error.
    ensure
      @engine = nil
    end
  end

  private

  def pool_client(env)
    token = env['ENGINE_TOKEN'].to_s
    raise EngineError, 'ENGINE_TOKEN is required when ENGINE_URL is set' if token.empty?

    StockfishPool::Client.new(url: env.fetch('ENGINE_URL'), token: token)
  end

  def pool_lines(fen, multipv:, subject:, moves: [])
    result = @client.analyze(
      fen: fen, moves: moves, lane: @lane, depth: @depth, multipv: multipv,
      nodes: @max_nodes, subject: subject || @subject
    )
    result.lines.map { |line| line_to_eval(line) }
  end

  # The same shape AnalysisParser produces, so MoveJudge can keep negating the
  # score of a search played after the move.
  def line_to_eval(line)
    evaluation = { score: numeric_score(line.score) }
    return evaluation unless line.move

    evaluation[:move] = line.move
    variation = Array(line.pv)[1..]
    evaluation[:variation] = variation if variation&.any?
    evaluation
  end

  def numeric_score(score)
    return score.cp.to_i unless score.mate?
    return -1000 if score.mate.zero?

    base = score.mate.negative? ? -1000 : 1000
    base - score.mate
  end

  def local_best_moves(fen, multipv)
    @mutex.synchronize do
      ensure_engine_running
      @engine.multipv(multipv)
      analysis = with_timeout { @engine.analyze(fen, depth: @depth) }
      @parser.parse(analysis)
    end
  rescue TimeoutError
    raise TimeoutError, "Analysis timed out after #{@timeout} seconds"
  rescue StandardError => e
    handle_engine_error(e)
  end

  def local_evaluate_move(fen, move)
    @mutex.synchronize do
      ensure_engine_running
      move_str = move ? "moves #{move}" : ''
      @engine.execute("position fen #{fen} #{move_str}")
      analysis = with_timeout { @engine.execute("go depth #{@depth} nodes #{@max_nodes}") }
      @parser.parse(analysis)[0]
    end
  rescue TimeoutError
    raise TimeoutError, "Move evaluation timed out after #{@timeout} seconds"
  rescue StandardError => e
    handle_engine_error(e)
  end

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
