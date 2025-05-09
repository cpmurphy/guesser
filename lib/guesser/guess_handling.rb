# frozen_string_literal: true

require 'json'

module ChessGuesser
  module GuessHandling
    def handle_guess_request(guess)
      validate_guess_structure(guess)

      # Get and validate game
      path = guess['path']
      game = game_for_path(@valid_pgn_basenames, path)
      halt 404, { error: 'Game not found' }.to_json unless game

      # Validate and process current move
      current_move = guess['current_move'].to_i - 1
      if current_move >= game.moves.length
        handle_beyond_game_move(guess, game)
      else
        handle_normal_move(game, current_move, guess)
      end
    ensure
      @evaluator&.close
    end

    private

    def validate_guess_structure(guess)
      required_fields = %w[path current_move guessed_move old_pos]
      missing_fields = required_fields.reject { |field| guess.key?(field) }

      if missing_fields.any?
        status 400
        halt({ error: "Missing required fields: #{missing_fields.join(', ')}" }.to_json)
      end

      validate_guessed_move(guess['guessed_move'])
    end

    def validate_guessed_move(guessed_move)
      required_fields = %w[source target]
      missing_fields = required_fields.reject { |field| guessed_move.key?(field) }

      if missing_fields.any?
        status 400
        halt({ error: "Missing required fields in guessed_move: #{missing_fields.join(', ')}" }.to_json)
      end

      return if valid_square?(guessed_move['source']) && valid_square?(guessed_move['target'])

      status 400
      halt({ error: 'Invalid square format in guessed_move' }.to_json)
    end

    def valid_square?(square)
      square.is_a?(String) && square.match?(/^[a-h][1-8]$/)
    end

    def handle_beyond_game_move(guess, _game)
      guessed_move_data = guess['guessed_move']
      original_fen = guess['old_pos']

      evaluation = @evaluator.handle_guess(original_fen, guessed_move_data, nil)

      uci_move_string = build_guessed_move(guessed_move_data)

      @move_translator.load_game_from_fen(original_fen)
      ui_move_object = @move_translator.translate_uci_move(uci_move_string)

      evaluation[:move] = ui_move_object
      [evaluation].to_json
    rescue StandardError => e
      status 500
      halt({ error: "Server error while processing move beyond game: #{e.message}" }.to_json)
    end

    def handle_normal_move(game, current_move, guess)
      guessed_move = guess['guessed_move']
      original_fen = guess['old_pos']
      ui_game_move = guess['game_move']

      evaluation = @evaluator.handle_guess(original_fen, guessed_move, ui_game_move)
      response = [evaluation]
      # If correct, automatically play the move for the non-guessing side
      if evaluation[:result] == 'correct' &&
         current_move <= game.moves.length
        response.push({ result: 'auto_move' })
      end
      response.to_json
    rescue StandardError => e
      status 400 # Or 500 if it's an internal server error rather than bad input
      halt({ error: "Invalid move evaluation: #{e.message}" }.to_json)
    end

    def build_guessed_move(guessed_move)
      move = guessed_move['source'] + guessed_move['target']
      move += guessed_move['promotion'].downcase if guessed_move['promotion'] && !guessed_move['promotion'].empty?
      move
    end
  end
end
