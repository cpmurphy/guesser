# frozen_string_literal: true

class GuessEvaluator
  def initialize(move_judge)
    @move_judge = move_judge
  end

  def close
    @move_judge.close
  end

  # Parameters:
  # guessed_move: the guessed move, a hash with
  #   :source (e.g. "e2")
  #   :target (e.g. "e4")
  #   :piece (e.g. "wq" for white queen)
  #   :promotion (e.g. "q" for queen)
  # current_move: the current move, a zero-based index
  # ui_game_move: the UI game move, a string with source square and target square separated by a dash (e.g. "e2-e4")
  # number_of_moves: the number of moves in the game, an integer
  # game: the game, an object with a moves method that
  #   returns an array of moves
  #   and a positions method that returns an array of positions
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

  # Struct to hold evaluation parameters
  EvaluationParams = Struct.new(
    :judgment,
    :guessed_move_uci,
    :game_move_uci,
    :game_move,
    :game,
    :current_move,
    :number_of_moves,
    keyword_init: true
  )

  private

  def evaluate_guess(guessed_move, current_move, ui_game_move, number_of_moves, game)
    source = guessed_move['source']
    target = guessed_move['target']

    # Check if promotion is needed
    promotion_check = check_promotion(source, target, guessed_move)
    return promotion_check if promotion_check

    # Get moves and convert to UCI format
    moves = prepare_moves(guessed_move, game, current_move, ui_game_move)

    # Get judgment
    judgment = evaluate_moves(moves[:game_move_uci], moves[:guessed_move_uci], game.positions[current_move].to_fen)

    # Build and return evaluation
    build_evaluation(create_evaluation_params(
                       judgment, moves, game, current_move, number_of_moves
                     ))
  end

  def check_promotion(source, target, guessed_move)
    return unless needs_promotion?(source, target, guessed_move['piece']) && !guessed_move['promotion']

    { result: 'needs_promotion', source: source, target: target }
  end

  def prepare_moves(guessed_move, game, current_move, ui_game_move)
    game_move = game.moves[current_move].notation
    game_move_uci = convert_to_uci(ui_game_move, game_move)
    guessed_move_uci = "#{guessed_move['source']}#{guessed_move['target']}#{guessed_move['promotion'] || ''}"

    {
      game_move: game_move,
      game_move_uci: game_move_uci,
      guessed_move_uci: guessed_move_uci
    }
  end

  def evaluate_moves(game_move_uci, guessed_move_uci, fen)
    if game_move_uci == '--'
      @move_judge.evaluate_standalone(fen, guessed_move_uci)
    else
      @move_judge.compare_moves(fen, guessed_move_uci, game_move_uci)
    end
  end

  def create_evaluation_params(judgment, moves, game, current_move, number_of_moves)
    EvaluationParams.new(
      judgment: judgment,
      guessed_move_uci: moves[:guessed_move_uci],
      game_move_uci: moves[:game_move_uci],
      game_move: moves[:game_move],
      game: game,
      current_move: current_move,
      number_of_moves: number_of_moves
    )
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

  def build_evaluation(params)
    evaluation = base_evaluation(params)
    evaluation.merge!(result_specific_attributes(params))
    evaluation.merge!(state_for_current_move(params.game, move_position(params)))
    evaluation
  end

  def base_evaluation(params)
    {
      game_move: params.game_move,
      best_eval: params.judgment[:best_eval],
      guess_eval: params.judgment[:guess_eval],
      game_eval: params.judgment[:game_eval]
    }
  end

  def result_specific_attributes(params)
    if params.judgment[:good_move]
      {
        result: 'correct',
        same_as_game: params.guessed_move_uci == params.game_move_uci
      }
    else
      {
        result: 'incorrect',
        same_as_game: false
      }
    end
  end

  def move_position(params)
    if params.judgment[:good_move]
      move_forward(params.current_move, params.number_of_moves)
    else
      params.current_move
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
