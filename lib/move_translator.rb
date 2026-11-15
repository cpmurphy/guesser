# frozen_string_literal: true

require_relative 'chess_rules'

# Translates PGN and UCI into the move hash the board UI plays:
# piece, from-to moves (both pieces when castling), a capture, and a promotion.
# The position is ChessRules, so legality, clocks and castling rights stay in one place.
class MoveTranslator
  START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

  def initialize
    @position = ChessRules::Position.from_fen(START_FEN)
  end

  def translate_moves(pgn_moves)
    pgn_moves.map { |move| translate_move(move) }
  end

  def translate_move(pgn_move)
    return pass if pgn_move == '--'

    uci = ChessRules::San.parse(@position, pgn_move)
    result = move_hash(@position, uci)
    @position = play(@position, uci)
    result
  end

  # Does not change the position. Returns nil when +uci_move+ is not legal here.
  def translate_uci_move(uci_move)
    uci = normalize_uci(uci_move)
    return nil unless uci && ChessRules::Moves.legal?(@position, uci)

    move_hash(@position, uci).merge(notation: ChessRules::San.write(@position, uci, marks: false))
  end

  def board_as_fen
    @position.to_fen
  end

  def load_game_from_fen(fen)
    @position = ChessRules::Position.from_fen(fen)
  end

  private

  def pass
    @position = passed(@position)
    { moves: [] }
  end

  # A null move, as in odds games. It spends a turn and clears en passant.
  def passed(position)
    placement, side, castling, _en_passant, halfmove, fullmove = position.to_fen.split
    next_side = side == 'w' ? 'b' : 'w'
    next_fullmove = side == 'b' ? fullmove.to_i + 1 : fullmove.to_i
    ChessRules::Position.from_fen(
      [placement, next_side, castling, '-', halfmove.to_i + 1, next_fullmove].join(' ')
    )
  end

  def normalize_uci(uci_move)
    return nil unless uci_move.is_a?(String)

    uci = uci_move.downcase
    uci if ChessRules::San::UCI.match?(uci)
  end

  def play(position, uci)
    from, to, promotion = ChessRules::San.squares(uci)
    position.after(from, to, promotion)
  end

  def move_hash(position, uci)
    from, to, promotion = ChessRules::San.squares(uci)
    piece = position[from]
    hash = { piece: piece, moves: move_squares(from, to, piece) }
    capture = captured(position, from, to, piece)
    hash[:remove] = capture if capture
    hash[:add] = [promoted_piece(position, promotion), ChessRules.square_name(to)] if promotion
    hash
  end

  def move_squares(from, to, piece)
    squares = [span(from, to)]
    squares << castling_rook(from, to) if piece.downcase == 'k' && (to - from).abs == 2
    squares
  end

  def castling_rook(from, to)
    rook_from = to > from ? from + 3 : from - 4
    span(rook_from, (from + to) / 2)
  end

  def span(from, to)
    "#{ChessRules.square_name(from)}-#{ChessRules.square_name(to)}"
  end

  def captured(position, from, to, piece)
    if piece.downcase == 'p' && to == position.en_passant
      square = ((from / 8) * 8) + (to % 8)
      [position[square], ChessRules.square_name(square)]
    elsif position[to]
      [position[to], ChessRules.square_name(to)]
    end
  end

  def promoted_piece(position, promotion)
    position.side == 'w' ? promotion.upcase : promotion.downcase
  end
end
