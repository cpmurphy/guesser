# frozen_string_literal: true

class GuessEvaluator
  def initialize(move_judge)
    @move_judge = move_judge
  end

  def close
    @move_judge.close
  end

  # Parameters:
  # original_fen: the FEN string representing the board position before the move
  # guessed_move: a hash containing the guessed move details with keys:
  #   :source (e.g. "e2")
  #   :target (e.g. "e4")
  #   :piece (e.g. "wq" for white queen)
  #   :promotion (e.g. "q" for queen)
  # game_move: the actual game move to compare against, a hash with keys:
  #   :moves: an array of moves (e.g. ["e2-e4"])
  #   :add: an optional array describing the addition of a piece (e.g. ["Q", "e8"])
  #
  # Returns: a single evaluation hash with the following keys:
  #   :result: 'correct' or 'incorrect'
  #   :same_as_game: true if the guess matches the game move, false otherwise
  #   :best_eval: a hash containing evaluation details for both the guess and game move
  #   :guess_eval: evaluation of the guessed move
  #   :game_eval: evaluation of the game move
  def handle_guess(original_fen, guessed_move, game_move)
    source = guessed_move['source']
    target = guessed_move['target']

    # Check if promotion is needed
    promotion_check = check_promotion(source, target, guessed_move)
    return promotion_check if promotion_check

    # Get moves and convert to UCI format
    game_move_uci = convert_to_uci(game_move)
    guessed_move_uci = "#{guessed_move['source']}#{guessed_move['target']}#{guessed_move['promotion'] || ''}"

    # Get judgment
    judgment = evaluate_moves(original_fen, game_move_uci, guessed_move_uci)

    # Build and return evaluation
    build_evaluation(create_evaluation_params(judgment, guessed_move_uci, game_move_uci))
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

  def check_promotion(source, target, guessed_move)
    return unless needs_promotion?(source, target, guessed_move['piece']) && !guessed_move['promotion']

    { result: 'needs_promotion', source: source, target: target }
  end

  def evaluate_moves(original_fen, game_move_uci, guessed_move_uci)
    if game_move_uci == '--'
      @move_judge.evaluate_standalone(original_fen, guessed_move_uci)
    else
      @move_judge.compare_moves(original_fen, guessed_move_uci, game_move_uci)
    end
  end

  def create_evaluation_params(judgment, guessed_move_uci, game_move_uci)
    EvaluationParams.new(
      judgment: judgment,
      guessed_move_uci: guessed_move_uci,
      game_move_uci: game_move_uci
    )
  end

  def needs_promotion?(source, target, piece)
    return false unless piece.end_with?('p')

    source_rank = source[1].to_i
    target_rank = target[1].to_i
    (source_rank == 7 && target_rank == 8) || (source_rank == 2 && target_rank == 1)
  end

  def convert_to_uci(game_move)
    return '--' unless game_move

    uci = game_move['moves'][0].sub('-', '')
    uci += game_move['add'][0] if game_move['add']
    uci
  end

  def build_evaluation(params)
    evaluation = base_evaluation(params)
    evaluation.merge!(result_specific_attributes(params))
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
end
