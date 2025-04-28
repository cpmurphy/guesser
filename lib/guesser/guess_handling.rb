# frozen_string_literal: true

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
        handle_beyond_game_move(guess['guessed_move'])
      else
        handle_normal_move(game, current_move, guess)
      end
    ensure
      @evaluator&.close
    end

    private

    def validate_guess_structure(guess)
      required_fields = %w[path current_move guessed_move]
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

    def handle_beyond_game_move(guessed_move)
      translator = MoveTranslator.new
      translator.load_game_from_fen(guessed_move['old_pos'])

      move = build_guessed_move(guessed_move)
      translated_move = translator.translate_uci_move(move)

      [translated_move.merge({ result: 'game_over' })].to_json
    rescue StandardError => e
      status 400
      { error: "Invalid move format: #{e.message}" }.to_json
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
      status 400
      { error: "Invalid move evaluation: #{e.message}" }.to_json
    end

    def build_guessed_move(guessed_move)
      move = guessed_move['source'] + guessed_move['target']
      move += guessed_move['promotion'] if guessed_move['promotion']
      move
    end
  end
end
