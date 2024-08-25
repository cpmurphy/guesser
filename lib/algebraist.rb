class Algebraist
  def self.to_algebraic(guess)
    source = guess['move']['source']
    target = guess['move']['target']
    piece = guess['move']['piece']

    # Check for castling
    if piece =~ /^.K$/
      if source == 'e1' && target == 'g1' || source == 'e8' && target == 'g8'
        return 'O-O'  # Kingside castling
      elsif source == 'e1' && target == 'c1' || source == 'e8' && target == 'c8'
        return 'O-O-O'  # Queenside castling
      end
    end

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
end