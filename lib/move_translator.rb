# The MoveTranslator class translates chess moves from Portable Game Notation (PGN)
# to a more detailed representation that includes the source and destination squares,
# as well as information about captures and promotions.
#
# Usage:
#   translator = MoveTranslator.new
#   result = translator.translate_move("e4")
#
# The translate_move method returns a Hash with the following possible keys:
#
# - :moves => An array of strings representing the move(s) made.
#            Each string is in the format "from-to" (e.g., "e2-e4").
#            For castling, this array contains two moves: one for the king and one for the rook.
#
# - :remove => [Optional] An array with two elements: [piece, square]
#              Indicates a piece was captured and removed from the board.
#              For en passant captures, the square may differ from the move's destination.
#
# - :add => [Optional] An array with two elements: [piece, square]
#           Indicates a pawn was promoted. The piece is the promotion choice (e.g., 'Q' for queen).
#
# Examples:
#   translator.translate_move("e4")     #=> { moves: ["e2-e4"] }
#   translator.translate_move("exd5")   #=> { moves: ["e4-d5"], remove: ['p', 'd5'] }
#   translator.translate_move("a8=Q")   #=> { moves: ["a7-a8"], add: ['Q', 'a8'] }
#   translator.translate_move("O-O")    #=> { moves: ["e1-g1", "h1-f1"] }
#
# The class maintains the state of the chess board internally, allowing it to
# correctly translate moves that depend on the current board position (like castling or en passant).
# It also alternates between white and black moves automatically.
class MoveTranslator
  STARTING_POSITION = {
    'a1' => 'R', 'b1' => 'N', 'c1' => 'B', 'd1' => 'Q', 'e1' => 'K', 'f1' => 'B', 'g1' => 'N', 'h1' => 'R',
    'a2' => 'P', 'b2' => 'P', 'c2' => 'P', 'd2' => 'P', 'e2' => 'P', 'f2' => 'P', 'g2' => 'P', 'h2' => 'P',
    'a7' => 'p', 'b7' => 'p', 'c7' => 'p', 'd7' => 'p', 'e7' => 'p', 'f7' => 'p', 'g7' => 'p', 'h7' => 'p',
    'a8' => 'r', 'b8' => 'n', 'c8' => 'b', 'd8' => 'q', 'e8' => 'k', 'f8' => 'b', 'g8' => 'n', 'h8' => 'r'
  }

  def initialize
    @board = STARTING_POSITION.dup
    @current_player = :white
    @last_move = nil
    @white_castle_moves_allowed = "KQ"
    @black_castle_moves_allowed = "kq"
    @en_passant_target = "-"
    @halfmove_clock = 0
    @fullmove_number = 1
  end

  def translate_moves(pgn_moves)
    pgn_moves.map { |move| translate_move(move) }
  end

  def translate_move(pgn_move)
    result = {}

    case pgn_move
    when /^O-O(-O)?[+#]?$/
      result = handle_castling(pgn_move)
      @halfmove_clock += 1
    when /^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=[QRBN])?(\+|#)?$/
      piece = $1 || 'P'
      file_hint = $2
      rank_hint = $3
      capture = $4
      to = $5
      promotion = $6

      if piece == 'P' || capture
        @halfmove_clock = 0
      else
        @halfmove_clock += 1
      end
      from = find_source_square(piece, capture, to, file_hint, rank_hint)
      result = handle_regular_move(from, to, piece, capture, promotion)
      update_castling_status(piece, from)
    when /^--$/
      # passing move
      result = { moves: [] }
      @halfmove_clock += 1
    else
      raise "Invalid move: #{pgn_move}"
    end

    if @current_player == :black
      @fullmove_number += 1
    end
    update_en_passant_status(result)
    @last_move = result
    switch_player
    result
  end

  def translate_uci_move(uci_move)
    return nil unless uci_move && uci_move.length >= 4

    from = uci_move[0..1]
    to = uci_move[2..3]
    promotion = uci_move[4] if uci_move.length > 4

    # Get the piece that's moving
    piece = @board[from]
    return nil unless piece # No piece at source square

    # Check if it's a capture
    capture = @board[to] ? true : false

    # For pawns, check if it's an en passant capture
    if piece.upcase == 'P' && from[0] != to[0] && !@board[to]
      capture = true
    end

    result = { piece: piece, moves: ["#{from}-#{to}"] }

    # Generate PGN notation
    notation = if piece.upcase == 'P'
      if capture
        "#{from[0]}x#{to}"
      else
        to
      end
    else
      piece_char = piece.upcase
      "#{piece_char}#{capture ? 'x' : ''}#{to}"
    end

    # Add promotion if applicable
    if promotion
      notation += "=#{promotion.upcase}"
    end

    # Handle capture
    if capture
      captured_piece = @board[to]
      captured_square = to

      # Handle en passant
      if piece.upcase == 'P' && from[0] != to[0] && !@board[to]
        captured_square = "#{to[0]}#{from[1]}"
        captured_piece = @current_player == :white ? 'p' : 'P'
      end

      result[:remove] = [captured_piece, captured_square]
    end

    # Handle promotion
    if promotion
      if @current_player == :white
        promoted_piece = promotion.upcase
      else
        promoted_piece = promotion.downcase
      end
      result[:add] = [promoted_piece, to]
    end

    result[:notation] = notation
    result
  end

  def board_as_fen
    fen = ""
    for file in (1..8).to_a.reverse
      empty_count = 0
      for rank in ('a'..'h')
        square = "#{rank}#{file}"
        if @board[square]
          if empty_count > 0
            fen += empty_count.to_s
            empty_count = 0
          end
          fen += @board[square]
        else
          empty_count += 1
        end
      end
      if empty_count > 0
        fen += empty_count.to_s
      end
      fen += '/' unless file == 1
    end
    castling_rights = (@white_castle_moves_allowed.length > 0 || @black_castle_moves_allowed.length > 0) ? " #{@white_castle_moves_allowed}#{@black_castle_moves_allowed}" : " -"
    fen + " #{@current_player == :white ? 'w' : 'b'}#{castling_rights} #{@en_passant_target} #{@halfmove_clock} #{@fullmove_number}"
  end

  def load_game_from_fen(fen)
    # Clear the current board state
    @board = {}

    # Split the FEN string into its components
    position, active_color, castling, en_passant, halfmove, fullmove = fen.split(' ')

    # Populate the board
    rank = 8
    position.split('/').each do |row|
      file = 'a'
      row.each_char do |char|
        if char.match?(/\d/)
          file = (file.ord + char.to_i).chr
        else
          @board["#{file}#{rank}"] = char
          file = (file.ord + 1).chr
        end
      end
      rank -= 1
    end

    # Set the current player
    @current_player = active_color == 'w' ? :white : :black

    # Set castling rights
    @white_castle_moves_allowed = castling.include?('K') ? 'K' : ''
    @white_castle_moves_allowed += castling.include?('Q') ? 'Q' : ''
    @black_castle_moves_allowed = castling.include?('k') ? 'k' : ''
    @black_castle_moves_allowed += castling.include?('q') ? 'q' : ''

    # Set en passant target square
    @en_passant_target = en_passant == '' ? '-' : en_passant

    # Set halfmove clock and fullmove number
    @halfmove_clock = halfmove.to_i
    @fullmove_number = fullmove.to_i
  end



  private

  def moves_into_check?(square, to, piece)
    # temporarily move the piece to the square and see if the king is in check
    @board[to] = @board[square]
    @board.delete(square)
    king_square = find_king_square
    in_check = opponent_attacks_square?(king_square)
    @board[square] = @board[to]
    @board.delete(to)
    in_check
  end

  def find_king_square
    @board.each do |square, piece|
      return square if piece == (@current_player == :white ? 'K' : 'k')
    end
  end

  def opponent_attacks_square?(square)
    # check if the square is under attack by an opposing piece
    if @current_player == :white
      opposing_pieces = @board.select { |_, piece| piece =~ /[pnbrq]/ }
      opposing_pieces.each do |current_square, piece|
        return true if valid_move?(current_square, square, piece)
      end
    else
      opposing_pieces = @board.select { |_, piece| piece =~ /[PNBRQ]/ }
      opposing_pieces.each do |current_square, piece|
        return true if valid_move?(current_square, square, piece)
      end
    end
    false
  end

  def find_source_square(piece, capture, to, file_hint, rank_hint)
    piece = piece.downcase if @current_player == :black
    candidates = @board.select { |square, p| p == piece }

    if piece.upcase == 'P'
      candidates = handle_pawn_move(candidates, capture, to, file_hint)
    else
      candidates.select! { |square, _| square[0] == file_hint } if file_hint
      candidates.select! { |square, _| square[1] == rank_hint } if rank_hint
    end

    candidates.select! { |square, _| valid_move?(square, to, piece) }

    if candidates.size > 1
      candidates.reject! { |square, piece| moves_into_check?(square, to, piece) }
    end
    raise "Ambiguous move for #{annotation_for(piece, file_hint, rank_hint, capture, to)}: could be #{candidates.inspect}" if candidates.size > 1
    raise "No valid source square found for #{annotation_for(piece, file_hint, rank_hint, capture, to)} FEN #{board_as_fen}" if candidates.empty?

    candidates.keys.first
  end

  def annotation_for(piece, file_hint, rank_hint, capture, to)
    "#{@fullmove_number}." +
      (@current_player == :black ? '...' : '') +
      (piece.upcase == 'P' ? '' : piece) +
      "#{file_hint}#{rank_hint}#{capture}#{to}"
  end

  def handle_pawn_move(candidates, capture, to, file_hint)
    to_file, to_rank = to.chars
    direction = @current_player == :white ? 1 : -1

    if capture # capture move
      if file_hint
        candidates.select! { |square, _| square[0] == file_hint }
      end
      candidates.select! { |square, _| (square[1].to_i - to_rank.to_i).abs == 1 }
    else # non-capture move
      candidates.select! { |square, _| square[0] == to_file }
      if @current_player == :white
        allowed_destination_rank = '4'
      else
        allowed_destination_rank = '5'
      end
      allowed_from_ranks = [(to_rank.to_i - direction).to_s]
      if to_rank == allowed_destination_rank
        allowed_from_ranks << (to_rank.to_i - 2 * direction).to_s
      end

      candidates.select! { |square, _| allowed_from_ranks.include?(square[1]) }
    end

    candidates
  end

  def valid_move?(from, to, piece)
    case piece.upcase
    when 'N'
      valid_knight_move?(from, to)
    when 'B'
      valid_bishop_move?(from, to)
    when 'P'
      valid_pawn_move?(from, to)
    when 'R'
      valid_rook_move?(from, to)
    when 'Q'
      valid_queen_move?(from, to)
    when 'K'
      valid_king_move?(from, to)
    else
      false
    end
  end

  def valid_queen_move?(from, to)
    valid_rook_move?(from, to) || valid_bishop_move?(from, to)
  end

  def valid_rook_move?(from, to)
    from_file, from_rank = from.chars
    to_file, to_rank = to.chars

    # Rook must move either horizontally or vertically
    return false unless from_file == to_file || from_rank == to_rank

    # Check if path is clear
    if from_file == to_file
      path_clear_vertical?(from, to)
    else
      path_clear_horizontal?(from, to)
    end
  end

  def path_clear_vertical?(from, to)
    file = from[0]
    start_rank, end_rank = [from[1].to_i, to[1].to_i].sort
    (start_rank + 1...end_rank).each do |rank|
      return false if @board["#{file}#{rank}"]
    end
    true
  end

  def path_clear_horizontal?(from, to)
    rank = from[1]
    start_file, end_file = [from[0], to[0]].sort
    (start_file.next...end_file).each do |file|
      return false if @board["#{file}#{rank}"]
    end
    true
  end

  def valid_pawn_move?(from, to)
    from_file, from_rank = from.chars
    to_file, to_rank = to.chars
    direction = @current_player == :white ? 1 : -1

    file_diff = (from_file.ord - to_file.ord).abs
    rank_diff = (to_rank.to_i - from_rank.to_i) * direction

    if file_diff == 0 # Moving forward
      if rank_diff == 1
        return !@board[to] # Destination must be empty
      elsif rank_diff == 2
        return false unless ((@current_player == :white && from_rank == '2') || (@current_player == :black && from_rank == '7'))
        middle_square = "#{from_file}#{from_rank.to_i + direction}"
        return !@board[middle_square] && !@board[to] # Both squares must be empty
      else
        return false
      end
    elsif file_diff == 1 && rank_diff == 1 # Capture or en passant
      return true if @board[to] # Regular capture
      return valid_en_passant?(from, to) # Check for en passant
    else
      return false
    end
  end

  def valid_en_passant?(from, to)
    direction = @current_player == :white ? 1 : -1
    return false unless @last_move && @last_move[:moves].size == 1
    last_from, last_to = @last_move[:moves][0].split('-')

    # Check if the last move was a two-square pawn move
    return false unless (last_to[1].to_i - last_from[1].to_i).abs == 2

    # Check if our pawn is moving to the correct square for en passant
    expected_to = "#{last_to[0]}#{from[1].to_i + direction}"
    return false unless to == expected_to

    # Check if our pawn is on the correct rank for en passant
    correct_rank = @current_player == :white ? '5' : '4'
    return false unless from[1] == correct_rank

    true
  end

  def valid_knight_move?(from, to)
    from_file, from_rank = from.chars
    to_file, to_rank = to.chars

    file_diff = (from_file.ord - to_file.ord).abs
    rank_diff = (from_rank.to_i - to_rank.to_i).abs

    (file_diff == 2 && rank_diff == 1) || (file_diff == 1 && rank_diff == 2)
  end

  def valid_bishop_move?(from, to)
    from_file, from_rank = from.chars
    to_file, to_rank = to.chars

    file_diff = (from_file.ord - to_file.ord).abs
    rank_diff = (from_rank.to_i - to_rank.to_i).abs

    return false unless file_diff == rank_diff # Must move diagonally

    # Check if path is clear
    path_clear_for_bishop?(from, to)
  end

  def path_clear_for_bishop?(from, to)
    from_file, from_rank = from.chars
    to_file, to_rank = to.chars

    file_direction = to_file > from_file ? 1 : -1
    rank_direction = to_rank > from_rank ? 1 : -1

    current_file = from_file.ord + file_direction
    current_rank = from_rank.to_i + rank_direction

    while current_file.chr != to_file || current_rank.to_s != to_rank
      return false if @board["#{current_file.chr}#{current_rank}"]
      current_file += file_direction
      current_rank += rank_direction
    end

    true
  end

  def valid_king_move?(from, to)
    from_file, from_rank = from.chars
    to_file, to_rank = to.chars

    file_diff = (from_file.ord - to_file.ord).abs
    rank_diff = (from_rank.to_i - to_rank.to_i).abs

    # Regular king move
    return true if file_diff <= 1 && rank_diff <= 1

    # Castling
    if file_diff == 2 && rank_diff == 0
      return valid_castling?(from, to)
    end

    false
  end

  def valid_castling?(from, to)
    rank = @current_player == :white ? '1' : '8'
    king_file = 'e'
    kingside_rook_file = 'h'
    queenside_rook_file = 'a'

    # Check if king and rook are in their initial positions
    return false unless from == "#{king_file}#{rank}"
    return false unless @board["#{king_file}#{rank}"]&.upcase == 'K'

    if to[0] > from[0] # Kingside castling
      rook_file = kingside_rook_file
      path = ('f'...'h').map { |file| "#{file}#{rank}" }
    else # Queenside castling
      rook_file = queenside_rook_file
      path = ('b'..'d').map { |file| "#{file}#{rank}" }
    end

    return false unless @board["#{rook_file}#{rank}"]&.upcase == 'R'

    # Check if path is clear
    return false unless path.all? { |square| !@board[square] }

    true
  end

  def handle_castling(pgn_move)
    rank = @current_player == :white ? '1' : '8'
    if pgn_move =~ /^O-O[+#]?$/ # Kingside castling
      king_from, king_to = "e#{rank}", "g#{rank}"
      rook_from, rook_to = "h#{rank}", "f#{rank}"
    else # O-O-O, Queenside castling
      king_from, king_to = "e#{rank}", "c#{rank}"
      rook_from, rook_to = "a#{rank}", "d#{rank}"
    end

    # Move king and rook
    @board[king_to] = @board[king_from]
    @board[rook_to] = @board[rook_from]
    @board.delete(king_from)
    @board.delete(rook_from)
    if @current_player == :white
      @white_castle_moves_allowed = ''
    else
      @black_castle_moves_allowed = ''
    end

    player_piece = @current_player == :white ? 'K' : 'k'
    {
      piece: player_piece,
      moves: ["#{king_from}-#{king_to}", "#{rook_from}-#{rook_to}"]
    }
  end

  def handle_regular_move(from, to, piece, capture, promotion)
    player_piece = @current_player == :white ? piece.upcase : piece.downcase
    result = { piece: player_piece, moves: ["#{from}-#{to}"] }

    # Handle capture
    if capture || (@board[to] && piece.upcase == 'P' && from[0] != to[0])
      captured_piece = @board[to]
      if !captured_piece
        if @current_player == :white
          captured_piece = 'p'
        else
          captured_piece = 'P'
        end
      end
      captured_square = to
      if piece.upcase == 'P' && capture && !@board[to] # En passant
        captured_square = "#{to[0]}#{from[1].to_i}"
      end
      result[:remove] = [captured_piece, captured_square]
      @board.delete(captured_square)
    end

    # Handle promotion
    if promotion
      promoted_piece = promotion[-1]
      if @current_player != :white
        promoted_piece = promoted_piece.downcase
      end
      @board[to] = promoted_piece
      result[:add] = [promoted_piece, to]
    else
      @board[to] = @board[from]
    end

    @board.delete(from)
    result
  end

  def switch_player
    @current_player = @current_player == :white ? :black : :white
  end

  def update_en_passant_status(ui_move)
    move = ui_move[:moves][0]
    if @current_player == :white && move =~ /^[a-h]2-[a-h]4$/
      @en_passant_target = move.sub(/^([a-h]).*/, "\\13")
    elsif @current_player == :black && move =~ /^[a-h]7-[a-h]5$/
      @en_passant_target = move.sub(/^([a-h]).*/, "\\16")
    else
      @en_passant_target = '-'
    end
  end

  def update_castling_status(piece, from)
    if piece == 'K'
      if @current_player == :white
        @white_castle_moves_allowed = ''
      else
        @black_castle_moves_allowed = ''
      end
    elsif piece == 'R'
      if from == 'h1' && @white_castle_moves_allowed
        if @white_castle_moves_allowed.length > 1
          @white_castle_moves_allowed = 'Q'
        else
          @white_castle_moves_allowed = ''
        end
      elsif from == 'a1' && @white_castle_moves_allowed
        if @white_castle_moves_allowed.length > 1
          @white_castle_moves_allowed = 'K'
        else
          @white_castle_moves_allowed = ''
        end
      elsif from == 'h8' && @black_castle_moves_allowed
        if @black_castle_moves_allowed.length > 1
          @black_castle_moves_allowed = 'q'
        else
          @black_castle_moves_allowed = ''
        end
      elsif from == 'a8' && @black_castle_moves_allowed
        if @black_castle_moves_allowed.length > 1
          @black_castle_moves_allowed = 'k'
        else
          @black_castle_moves_allowed = ''
        end
      end
    end
  end
end
