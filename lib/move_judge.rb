require_relative 'analyzer'
require_relative 'algebraist'

class MoveJudge
  def initialize(analyzer = Analyzer.new)
    @analyzer = analyzer
  end

  def are_same?(guess, game_move)
    source = guess['move']['source']
    target = guess['move']['target']
    piece = guess['move']['piece']
    move = Algebraist.to_algebraic(guess)

    return true if move == game_move
    bare_move = game_move.sub('+', '').sub('#', '').sub('x', '')
    return true if bare_move == move

    if bare_move =~ /^[NBRQK][a-h1-8][a-h][1-8]$/
      disambiguation = bare_move[1]
      game_target = bare_move[2..3]

      if ('a'..'h').include?(disambiguation) # file disambiguation
        return target == game_target && source[0] == disambiguation
      elsif ('1'..'8').include?(disambiguation) # rank disambiguation
        return target == game_target && source[1] == disambiguation
      end
    end
    promotion_match = game_move.match(/^([a-h]x)?([a-h][18])=[QRBN]\+?$/)
    if promotion_match
      game_target = promotion_match[2]
      if promotion_match[1]
        game_source_file = promotion_match[1].sub('x', '')
      else
        game_source_file = game_move[0]
      end
      return target == game_target &&
          piece[1] == 'P' &&
          game_source_file == guess['move']['source'][0]
    end

    false
  end

  def guess_in_top_three?(guess, fen)
    source = guess['move']['source']
    target = guess['move']['target']
    uci_move = to_uci(source, target)
    top_moves = @analyzer.best_moves(fen)
    best_score = top_moves[0][:score].to_i
    top_moves.filter! { |move| (best_score - move[:score].to_i).abs < 50 }
    top_moves.map { |move| move[:move] }.include?(uci_move)
  end

  private

  def to_uci(source, target)
    source + target
  end
end