# frozen_string_literal: true

class GuessEvaluator
  def initialize(move_judge)
    @move_judge = move_judge
  end

  # Parameters:
  # guessed_move: the guessed move, a hash with source (e.g. "e2"); target (e.g. "e4"); piece (e.g. "wq" for white queen)
  # current_move: the current move, a zero-based index
  # ui_game_move: the UI game move, a string with source square and target square separated by a dash (e.g. "e2-e4")
  # number_of_moves: the number of moves in the game, an integer
  # game: the game, an object with a moves method that returns an array of moves and a positions method that returns an array of positions
  #
  # Returns: an array with
  #   i) the evaluation of the guess
  #   ii) (optionally) the opponent's move after the guess
  #
  # The evaluation is a hash with the following keys:
  #   :result: 'correct' or 'incorrect'
  #   :same_as_game: true or false
  #   :game_move: the game move, a string with source square and target square separated by a dash (e.g. "e2-e4")
  #   :best_eval: the best evaluation of the guess, a hash with keys :guess_eval and :game_eval
  #   :guess_eval: the evaluation of the guess, a hash with keys :source, :target, :piece, :promotion
  #   :game_eval: the evaluation of the game move, a hash with keys :source, :target, :piece, :promotion
  #   :fen: the FEN of the board after the guess
  #   :move: the move before the guess, a string with source square and target square separated by a dash (e.g. "e2-e4")
  #   :move_number: the move number after the guess, an integer
  #   :total_moves: the total number of moves in the game, an integer
  def handle_guess(guessed_move, current_move, ui_game_move, number_of_moves, game)
    guess_evaluation = evaluate_guess(guessed_move, current_move, ui_game_move, number_of_moves, game)

    response = [guess_evaluation]

    # Automatically play the move for the non-guessing side
    if guess_evaluation[:result] == 'correct' &&
       guess_evaluation[:move_number] <= guess_evaluation[:total_moves]
      current_move = guess_evaluation[:move_number]
      response.push(
        { result: 'auto_move' }.merge(
          state_for_current_move(game, current_move)
        )
      )
    end
    response
  end

  private

  def evaluate_guess(guessed_move, current_move, ui_game_move, number_of_moves, game)
    source = guessed_move['source']
    target = guessed_move['target']

    # Check if promotion is needed
    if needs_promotion?(source, target, guessed_move['piece']) && !guessed_move['promotion']
      return { result: 'needs_promotion', source: source, target: target }
    end

    # Get the moves to compare
    old_fen = game.positions[current_move].to_fen
    game_move = game.moves[current_move].notation

    # Convert moves to UCI format
    game_move_uci = convert_to_uci(ui_game_move, game_move)
    guessed_move_uci = "#{source}#{target}#{guessed_move['promotion'] || ''}"

    judgment = if game_move_uci == '--'
                 @move_judge.evaluate_standalone(old_fen, guessed_move_uci)
               else
                 # Compare the moves
                 @move_judge.compare_moves(old_fen, guessed_move_uci, game_move_uci)
               end

    build_evaluation(judgment, guessed_move_uci, game_move_uci, game_move, game, current_move, number_of_moves)
  end

  def needs_promotion?(source, target, piece)
    return false unless piece.end_with?('p')

    source_rank = source[1].to_i
    target_rank = target[1].to_i
    (source_rank == 7 && target_rank == 8) || (source_rank == 2 && target_rank == 1)
  end

  def convert_to_uci(ui_move, pgn_move)
    return pgn_move if pgn_move == '--'

    uci = ui_move.sub('-', '')
    uci += pgn_move.split('=').last.downcase if pgn_move.include?('=')
    uci
  end

  def build_evaluation(judgment, guessed_move_uci, game_move_uci, game_move, game, current_move, number_of_moves)
    if judgment[:good_move]
      current_move = move_forward(current_move, number_of_moves)
      {
        result: 'correct',
        same_as_game: guessed_move_uci == game_move_uci,
        game_move: game_move,
        best_eval: judgment[:best_eval],
        guess_eval: judgment[:guess_eval],
        game_eval: judgment[:game_eval]
      }.merge(state_for_current_move(game, current_move))
    else
      {
        result: 'incorrect',
        same_as_game: false,
        game_move: game_move,
        best_eval: judgment[:best_eval],
        guess_eval: judgment[:guess_eval],
        game_eval: judgment[:game_eval]
      }.merge(state_for_current_move(game, current_move))
    end
  end

  def move_forward(current_move, number_of_moves)
    current_move += 1 if current_move < number_of_moves
    current_move
  end

  def state_for_current_move(game, current_move)
    number_of_moves = game.moves.length
    {
      fen: game.positions[current_move].to_fen,
      move: current_move.positive? ? game.moves[current_move - 1].notation : nil,
      move_number: current_move + 1,
      total_moves: number_of_moves
    }
  end
end
