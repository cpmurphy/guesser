require_relative 'analyzer'

class MoveJudge
  def self.are_same?(guess, game_move)
    source = guess['move']['source']
    target = guess['move']['target']
    piece = guess['move']['piece']
    move = to_algebraic(guess)

    return true if move == game_move

    if game_move.include?('x')
      return true if game_move.sub('x', '') == move
    end

    if game_move =~ /^[NBRQK][a-h1-8][a-h][1-8]$/
      disambiguation = game_move[1]
      game_target = game_move[2..3]

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

  def self.guess_in_top_three?(guess, fen)
    source = guess['move']['source']
    target = guess['move']['target']
    uci_move = to_uci(source, target)
    analyzer = Analyzer.new
    top_moves = analyzer.best_moves(fen)
    best_score = top_moves[0][:score].to_i
    top_moves.filter! { |move| (best_score - move[:score].to_i).abs < 50 }
    top_moves.map { |move| move[:move] }.include?(uci_move)
  end

  private

  def self.to_algebraic(guess)
    source = guess['move']['source']
    target = guess['move']['target']
    piece = guess['move']['piece']
    if piece =~ /^.P$/
      # if the source file and target file are different, it's a capture
      if source[0] != target[0]
        return "#{source[0]}x#{target}"
      end
      target
    else
      "#{piece[1]}#{target}"
    end
  end

  def self.to_uci(source, target)
    source + target
  end
end