# frozen_string_literal: true

require 'minitest/autorun'
require_relative '../../../guesser/lib/guesser/guess_handling'
require_relative '../../../guesser/lib/analyzer' # For Analyzer::TimeoutError, Analyzer::EngineError

# Mock for the game object
MockGame = Struct.new(:moves)

# Test host class to include the GuessHandling module
class TestHost
  include ChessGuesser::GuessHandling

  attr_accessor :evaluator, :move_translator, :valid_pgn_basenames

  def initialize
    @valid_pgn_basenames = ['test_game']
    @halted_info = {} # Stores {status: code, response: body}
    # These will be set to Minitest::Mock in tests
    @evaluator = nil
    @move_translator = nil
    @current_status_code_for_halt = 500 # Default for halt 'message'
  end

  # Mock Sinatra's halt
  def halt(*args)
    response_body = nil
    case args.length
    when 1
      if args[0].is_a?(Integer) # halt 400
        @halted_info = { status: args[0], response: nil }
      else # halt 'message' or halt response_body (e.g. JSON string)
        @halted_info = { status: @current_status_code_for_halt, response: args[0] }
        response_body = args[0]
      end
    when 2 # halt 400, 'message' or halt 400, response_body
      @halted_info = { status: args[0], response: args[1] }
      response_body = args[1]
    end
    throw :halt, response_body
  end

  def halted?
    !@halted_info.empty?
  end

  def halted_status
    @halted_info[:status]
  end

  def halted_response
    @halted_info[:response]
  end

  # Mock Sinatra's status
  def status(code = nil)
    return @current_status_code_for_halt if code.nil? # Getter

    # Or a more elaborate current status if needed
    # Setter
    @current_status_code_for_halt = code
    # In real Sinatra, this would return the code. For mock, it might not be essential.

    code
  end

  # Mock for game_for_path, which comes from GameHandling
  def game_for_path(_valid_basenames, path)
    @game_for_path_behavior&.call(path)
  end

  def set_game_for_path_behavior(&block)
    @game_for_path_behavior = block
  end
end

describe ChessGuesser::GuessHandling do
  before do
    @host = TestHost.new
    @host.evaluator = Minitest::Mock.new
    @host.move_translator = Minitest::Mock.new
    @valid_guess_payload = {
      'path' => '/builtin/test_game/0',
      'current_move' => 1, # 1-indexed for request
      'guessed_move' => { 'source' => 'e2', 'target' => 'e4', 'piece' => 'P', 'promotion' => nil },
      'old_pos' => 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      'game_move' => { 'piece' => 'P', 'moves' => ['e2-e4'], 'notation' => 'e4' } # UI game move for comparison
    }
    @mock_game_object = MockGame.new(%w[e4 e5]) # PGN moves array
  end

  def catch_halt_and_get_response
    catch(:halt) do
      yield
      return nil # No halt was called if we reach here
    end
  end

  describe 'input validations' do
    it 'halts with 400 if a required top-level field is missing' do
      %w[path current_move guessed_move old_pos].each do |field_to_remove|
        invalid_guess = @valid_guess_payload.dup
        invalid_guess.delete(field_to_remove)

        @host.evaluator.expect(:close, nil)
        response_json = catch_halt_and_get_response { @host.handle_guess_request(invalid_guess) }

        assert_predicate @host, :halted?, "Should have halted for missing #{field_to_remove}"
        assert_equal 400, @host.halted_status
        refute_nil response_json, 'Halt response should not be nil'
        response = JSON.parse(response_json)

        assert_match(/Missing required fields: #{field_to_remove}/, response['error'])
      end
    end

    it 'halts with 400 if a required guessed_move field is missing' do
      %w[source target].each do |field_to_remove|
        invalid_guess = Marshal.load(Marshal.dump(@valid_guess_payload)) # Deep copy
        invalid_guess['guessed_move'].delete(field_to_remove)
        @host.evaluator.expect(:close, nil)

        response_json = catch_halt_and_get_response { @host.handle_guess_request(invalid_guess) }

        assert_predicate @host, :halted?, "Should have halted for missing guessed_move.#{field_to_remove}"
        assert_equal 400, @host.halted_status
        refute_nil response_json
        response = JSON.parse(response_json)

        assert_match(/Missing required fields in guessed_move: #{field_to_remove}/, response['error'])
      end
    end

    it 'halts with 400 if guessed_move has invalid square format for source' do
      invalid_guess = Marshal.load(Marshal.dump(@valid_guess_payload))
      invalid_guess['guessed_move']['source'] = 'e9' # Invalid square
      @host.evaluator.expect(:close, nil)

      response_json = catch_halt_and_get_response { @host.handle_guess_request(invalid_guess) }

      assert_predicate @host, :halted?, 'Should have halted for invalid source square'
      assert_equal 400, @host.halted_status
      refute_nil response_json
      response = JSON.parse(response_json)

      assert_equal 'Invalid square format in guessed_move', response['error']
    end

    it 'halts with 400 if guessed_move has invalid square format for target' do
      invalid_guess = Marshal.load(Marshal.dump(@valid_guess_payload))
      invalid_guess['guessed_move']['target'] = 'a9' # Invalid square
      @host.evaluator.expect(:close, nil)

      response_json = catch_halt_and_get_response { @host.handle_guess_request(invalid_guess) }

      assert_predicate @host, :halted?, 'Should have halted for invalid target square'
      assert_equal 400, @host.halted_status
      refute_nil response_json
      response = JSON.parse(response_json)

      assert_equal 'Invalid square format in guessed_move', response['error']
    end
  end

  describe 'game logic' do
    it 'halts with 404 if game is not found' do
      @host.set_game_for_path_behavior { |_path| nil } # game_for_path returns nil

      @host.evaluator.expect(:close, nil)
      response_json = catch_halt_and_get_response { @host.handle_guess_request(@valid_guess_payload) }

      assert_predicate @host, :halted?
      assert_equal 404, @host.halted_status
      assert_equal({ 'error' => 'Game not found' }.to_json, response_json)
    end

    describe 'handling move beyond game end' do
      before do
        # current_move is 1-indexed from request; game length is 2. So current_move=3 is beyond end.
        @guess_beyond_end = @valid_guess_payload.merge('current_move' => @mock_game_object.moves.length + 1)
        @host.set_game_for_path_behavior { |_path| @mock_game_object }
      end

      it 'returns evaluation and translated move successfully' do
        expected_evaluation = { result: 'good', fen_eval: '0.5' }
        translated_move_obj = { 'notation' => 'e4', 'moves' => ['e2-e4'], 'piece' => 'P' }
        guessed_uci_move = 'e2e4' # from e2, e4, no promotion

        @host.evaluator.expect(:handle_guess, expected_evaluation, [@guess_beyond_end['old_pos'], @guess_beyond_end['guessed_move'], nil])
        @host.move_translator.expect(:load_game_from_fen, nil, [@guess_beyond_end['old_pos']])
        @host.move_translator.expect(:translate_uci_move, translated_move_obj, [guessed_uci_move])
        @host.evaluator.expect(:close, nil)

        response_json = @host.handle_guess_request(@guess_beyond_end)
        response = JSON.parse(response_json)

        assert_equal 1, response.length
        assert_equal 'good', response[0]['result']
        assert_equal '0.5', response[0]['fen_eval']
        assert_equal translated_move_obj, response[0]['move']
        @host.evaluator.verify
        @host.move_translator.verify
      end

      it 'halts with 500 if move translation fails (StandardError)' do
        @host.evaluator.expect(:handle_guess, { result: 'ok' }, [@guess_beyond_end['old_pos'], @guess_beyond_end['guessed_move'], nil])
        @host.move_translator.expect(:load_game_from_fen, nil, [@guess_beyond_end['old_pos']])
        @host.move_translator.expect(:translate_uci_move, nil) { raise StandardError, 'Translation process failed' }
        @host.evaluator.expect(:close, nil) # Ensure close is still called

        response_json = catch_halt_and_get_response { @host.handle_guess_request(@guess_beyond_end) }

        assert_predicate @host, :halted?
        assert_equal 500, @host.halted_status
        refute_nil response_json
        response = JSON.parse(response_json)

        assert_match(/Server error while processing move beyond game: Translation process failed/, response['error'])
        @host.evaluator.verify
        @host.move_translator.verify
      end
    end

    describe 'handling normal move (within game limits)' do
      before do
        @host.set_game_for_path_behavior { |_path| @mock_game_object }
      end

      it 'returns evaluation if guess is different from game move' do
        evaluation_result = { result: 'blunder', fen_eval: '-3.0' }
        @host.evaluator.expect(:handle_guess, evaluation_result, [@valid_guess_payload['old_pos'], @valid_guess_payload['guessed_move'], @valid_guess_payload['game_move']])
        @host.evaluator.expect(:close, nil)

        response_json = @host.handle_guess_request(@valid_guess_payload)
        response = JSON.parse(response_json)

        assert_equal 1, response.length
        assert_equal 'blunder', response[0]['result']
        assert_equal '-3.0', response[0]['fen_eval']
        refute response[0].key?('move'), 'Should not include :move key for this case'
        @host.evaluator.verify
      end

      it 'returns evaluation and auto_move if guess is correct' do
        correct_evaluation = { result: 'correct', fen_eval: '0.1' }
        # current_move is 1, so current_move_index is 0. game_moves.length is 2. 0 <= 2 is true.
        @host.evaluator.expect(:handle_guess, correct_evaluation, [@valid_guess_payload['old_pos'], @valid_guess_payload['guessed_move'], @valid_guess_payload['game_move']])
        @host.evaluator.expect(:close, nil)

        response_json = @host.handle_guess_request(@valid_guess_payload)
        response = JSON.parse(response_json)

        assert_equal 2, response.length
        assert_equal 'correct', response[0]['result']
        assert_equal '0.1', response[0]['fen_eval']
        assert_equal({ 'result' => 'auto_move' }, response[1])
        @host.evaluator.verify
      end

      it 'includes auto_move if current_move is the last recorded game move and guess is correct' do
        # game has 2 moves. current_move=2 (1-indexed) means guessing the last move (index 1).
        last_move_guess = @valid_guess_payload.merge('current_move' => @mock_game_object.moves.length)
        # Adjust game_move for the last move of the game
        last_move_guess['game_move'] = { 'piece' => 'p', 'moves' => ['e7-e5'], 'notation' => 'e5' } # Example for black's typical 2nd move

        correct_evaluation = { result: 'correct', fen_eval: '0.0' }
        # current_move_index = 1. game.moves.length = 2. Condition `1 <= 2` is true.
        @host.evaluator.expect(:handle_guess, correct_evaluation, [last_move_guess['old_pos'], last_move_guess['guessed_move'], last_move_guess['game_move']])
        @host.evaluator.expect(:close, nil)

        response_json = @host.handle_guess_request(last_move_guess)
        response = JSON.parse(response_json)

        assert_equal 2, response.length, 'Should include auto_move based on current logic'
        assert_equal({ 'result' => 'auto_move' }, response[1])
        @host.evaluator.verify
      end

      it 'halts with 400 if evaluator.handle_guess raises StandardError' do
        @host.evaluator.expect(:handle_guess, nil) { raise StandardError, 'General evaluation failure' }
        @host.evaluator.expect(:close, nil)

        response_json = catch_halt_and_get_response { @host.handle_guess_request(@valid_guess_payload) }

        assert_predicate @host, :halted?
        assert_equal 400, @host.halted_status
        refute_nil response_json
        response = JSON.parse(response_json)

        assert_match(/Invalid move evaluation: General evaluation failure/, response['error'])
        @host.evaluator.verify
      end
    end
  end

  describe 'build_guessed_move helper (private method test via send)' do
    it 'builds UCI string without promotion' do
      guessed_data = { 'source' => 'e2', 'target' => 'e4', 'promotion' => nil }

      assert_equal 'e2e4', @host.send(:build_guessed_move, guessed_data)
    end

    it 'builds UCI string with promotion (uppercase)' do
      guessed_data = { 'source' => 'e7', 'target' => 'e8', 'promotion' => 'Q' }

      assert_equal 'e7e8q', @host.send(:build_guessed_move, guessed_data) # promotion becomes lowercase
    end

    it 'builds UCI string with promotion (lowercase)' do
      guessed_data = { 'source' => 'e7', 'target' => 'e8', 'promotion' => 'q' }

      assert_equal 'e7e8q', @host.send(:build_guessed_move, guessed_data)
    end

    it 'handles empty string for promotion' do
      guessed_data = { 'source' => 'a2', 'target' => 'a4', 'promotion' => '' }

      assert_equal 'a2a4', @host.send(:build_guessed_move, guessed_data)
    end
  end

  describe 'ensure clause for @evaluator.close' do
    it 'calls evaluator.close if validate_guess_structure halts' do
      @host.evaluator.expect(:close, nil)
      invalid_guess = @valid_guess_payload.merge('path' => nil) # Remove a required field

      catch_halt_and_get_response { @host.handle_guess_request(invalid_guess) }

      @host.evaluator.verify # Verifies close was called
    end

    it 'calls evaluator.close if game_for_path raises an error (inside begin block)' do
      @host.evaluator.expect(:close, nil)
      @host.set_game_for_path_behavior { |_path| raise StandardError, 'DB connection error' }

      assert_raises(StandardError, 'DB connection error') do
        @host.handle_guess_request(@valid_guess_payload)
      end
      @host.evaluator.verify
    end

    it 'calls evaluator.close if handle_normal_move internal logic raises (before its own halt)' do
      @host.set_game_for_path_behavior { |_path| @mock_game_object }
      # Make evaluator.handle_guess raise an error that handle_normal_move's rescue catches
      # and then halts. The ensure in handle_guess_request should still run.
      @host.evaluator.expect(:handle_guess, nil) { raise StandardError, 'Specific evaluation issue' }
      @host.evaluator.expect(:close, nil)

      catch_halt_and_get_response { @host.handle_guess_request(@valid_guess_payload) }

      @host.evaluator.verify
    end
  end
end
