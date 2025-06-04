# frozen_string_literal: true

require_relative 'translator/board'
require_relative 'translator/clock'

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
  def initialize(board = Translator::Board.new)
    @board = board
    @clock = Translator::Clock.new
  end

  def translate_moves(pgn_moves)
    pgn_moves.map { |move| translate_move(move) }
  end

  def translate_move(pgn_move)
    result = {}

    case pgn_move
    when /^O-O(-O)?[+#]?$/
      result = handle_castling(pgn_move)
      @clock.update_clocks(@board.current_player, 'k', false)
    when /^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=[QRBN])?(\+|#)?$/
      piece = ::Regexp.last_match(1) || 'P'
      file_hint = ::Regexp.last_match(2)
      rank_hint = ::Regexp.last_match(3)
      capture = ::Regexp.last_match(4)
      to = ::Regexp.last_match(5)
      promotion = ::Regexp.last_match(6)

      @clock.update_clocks(@board.current_player, piece, capture)
      from = find_source_square(piece, capture, to, file_hint, rank_hint)
      result = handle_regular_move(from, to, piece, capture, promotion)
      @board.update_castling_status(piece, from)
    when /^--$/
      # passing move
      result = { moves: [] }
      @clock.update_clocks(@board.current_player, nil, false)
    else
      raise "Invalid move: #{pgn_move}"
    end

    update_en_passant_status(result)
    @board.last_move = result
    @board.switch_player
    result
  end

  def translate_uci_move(uci_move)
    return nil unless valid_uci_move?(uci_move)

    from, to, promotion = parse_uci_move(uci_move)
    piece = @board[from]
    return nil unless piece

    result = initialize_move_result(from, to, piece)
    capture = capturing?(from, to, piece)

    result[:notation] = generate_move_notation(piece, from, to, capture, promotion)
    handle_uci_capture(result, from, to, piece, capture) if capture
    handle_uci_promotion(result, to, promotion) if promotion

    result
  end

  def board_as_fen
    [
      generate_position_string,
      generate_active_color,
      @board.generate_castling_rights_for_fen,
      @board.en_passant_target,
      @clock.halfmove_clock,
      @clock.fullmove_number
    ].join(' ')
  end

  def load_game_from_fen(fen)
    initialize_new_board
    fen_components = parse_fen_string(fen)

    populate_board(fen_components[:position])
    initialize_game_state(fen_components)
  end

  # Struct to hold candidate validation parameters
  CandidateParams = Struct.new(
    :candidates,
    :piece,
    :file_hint,
    :rank_hint,
    :capture,
    :to,
    keyword_init: true
  )

  private

  def initialize_new_board
    @board = Translator::Board.new
    @board.clear
  end

  def parse_fen_string(fen)
    position, active_color, castling, en_passant, halfmove, fullmove = fen.split
    {
      position: position,
      active_color: active_color,
      castling: castling,
      en_passant: en_passant,
      halfmove: halfmove,
      fullmove: fullmove
    }
  end

  def populate_board(position_string)
    rank = 8
    position_string.split('/').each do |row|
      populate_rank(row, rank)
      rank -= 1
    end
  end

  def populate_rank(row, rank)
    file = 'a'
    row.each_char do |char|
      file = process_position_char(char, file, rank)
    end
  end

  def process_position_char(char, file, rank)
    if char.match?(/\d/)
      (file.ord + char.to_i).chr
    else
      @board["#{file}#{rank}"] = char
      (file.ord + 1).chr
    end
  end

  def initialize_game_state(components)
    initialize_current_player(components[:active_color])
    initialize_castling_rights(components[:castling])
    initialize_en_passant_target(components[:en_passant])
    initialize_clock_values(components[:halfmove], components[:fullmove])
  end

  def initialize_current_player(active_color)
    @board.current_player = active_color == 'w' ? :white : :black
  end

  def initialize_castling_rights(castling)
    @board.castling_rights = castling
  end

  def initialize_en_passant_target(en_passant)
    @board.en_passant_target = en_passant.empty? ? '-' : en_passant
  end

  def initialize_clock_values(halfmove, fullmove)
    @clock.halfmove_clock = halfmove.to_i
    @clock.fullmove_number = fullmove.to_i
  end

  def find_source_square(piece, capture, to, file_hint, rank_hint)
    piece = adjust_piece_for_player(piece)
    candidates = find_initial_candidates(piece, capture, to, file_hint, rank_hint)
    candidates = filter_valid_moves(candidates, to, piece)
    candidates = filter_check_moves(candidates, to, piece)

    params = CandidateParams.new(
      candidates: candidates,
      piece: piece,
      file_hint: file_hint,
      rank_hint: rank_hint,
      capture: capture,
      to: to
    )

    validate_and_return_candidate(params)
  end

  def adjust_piece_for_player(piece)
    @board.current_player == :black ? piece.downcase : piece
  end

  def find_initial_candidates(piece, capture, to, file_hint, rank_hint)
    candidates = @board.find_piece(piece)

    if piece.upcase == 'P'
      handle_pawn_move(candidates, capture, to, file_hint)
    else
      filter_by_hints(candidates, file_hint, rank_hint)
    end
  end

  def filter_by_hints(candidates, file_hint, rank_hint)
    candidates = candidates.select { |square, _| square[0] == file_hint } if file_hint
    candidates = candidates.select { |square, _| square[1] == rank_hint } if rank_hint
    candidates
  end

  def filter_valid_moves(candidates, to, piece)
    candidates.select { |square, _| @board.valid_move?(square, to, piece) }
  end

  def filter_check_moves(candidates, to, _piece)
    return candidates unless candidates.size > 1

    candidates.reject { |square, piece| @board.moves_into_check?(square, to, piece) }
  end

  def validate_and_return_candidate(params)
    if params.candidates.size > 1
      raise "Ambiguous move for #{annotation_for(params.piece, params.file_hint,
                                                 params.rank_hint, params.capture,
                                                 params.to)}: could be #{params.candidates.inspect}"
    end

    if params.candidates.empty?
      raise "No valid source square found for #{annotation_for(params.piece, params.file_hint,
                                                               params.rank_hint, params.capture,
                                                               params.to)} FEN #{board_as_fen}"
    end

    params.candidates.keys.first
  end

  def annotation_for(piece, file_hint, rank_hint, capture, to)
    "#{@clock.fullmove_number}." +
      (@board.current_player == :black ? '...' : '') +
      (piece.upcase == 'P' ? '' : piece) +
      "#{file_hint}#{rank_hint}#{capture}#{to}"
  end

  def handle_pawn_move(candidates, capture, to, file_hint)
    if capture
      filter_pawn_capture_candidates(candidates, to, file_hint)
    else
      filter_pawn_advance_candidates(candidates, to)
    end
  end

  def filter_pawn_capture_candidates(candidates, to, file_hint)
    _, to_rank = to.chars
    candidates = candidates.select { |square, _| square[0] == file_hint } if file_hint
    candidates.select { |square, _| (square[1].to_i - to_rank.to_i).abs == 1 }
  end

  def filter_pawn_advance_candidates(candidates, to)
    to_file, to_rank = to.chars
    candidates = candidates.select { |square, _| square[0] == to_file }
    allowed_ranks = calculate_allowed_ranks(to_rank)
    candidates.select { |square, _| allowed_ranks.include?(square[1]) }
  end

  def calculate_allowed_ranks(to_rank)
    direction = @board.current_player == :white ? 1 : -1
    allowed_ranks = [(to_rank.to_i - direction).to_s]

    allowed_ranks << (to_rank.to_i - (2 * direction)).to_s if can_move_two_squares?(to_rank)

    allowed_ranks
  end

  def can_move_two_squares?(to_rank)
    double_move_rank = @board.current_player == :white ? '4' : '5'
    to_rank == double_move_rank
  end

  def handle_castling(pgn_move)
    castling_squares = determine_castling_squares(pgn_move)
    execute_castling_move(castling_squares)
    @board.remove_all_castling_rights

    {
      piece: get_player_piece('K'),
      moves: generate_castling_moves(castling_squares)
    }
  end

  def determine_castling_squares(pgn_move)
    rank = @board.current_player == :white ? '1' : '8'
    is_kingside = pgn_move =~ /^O-O[+#]?$/

    {
      king: {
        from: "e#{rank}",
        to: is_kingside ? "g#{rank}" : "c#{rank}"
      },
      rook: {
        from: is_kingside ? "h#{rank}" : "a#{rank}",
        to: is_kingside ? "f#{rank}" : "d#{rank}"
      }
    }
  end

  def execute_castling_move(squares)
    move_piece_to(squares[:king][:from], squares[:king][:to])
    move_piece_to(squares[:rook][:from], squares[:rook][:to])
  end

  def move_piece_to(from, to)
    @board[to] = @board[from]
    @board.delete(from)
  end

  def generate_castling_moves(squares)
    [
      "#{squares[:king][:from]}-#{squares[:king][:to]}",
      "#{squares[:rook][:from]}-#{squares[:rook][:to]}"
    ]
  end

  def handle_regular_move(from, to, piece, capture, promotion)
    player_piece = get_player_piece(piece)
    result = { piece: player_piece, moves: ["#{from}-#{to}"] }

    handle_capture(result, from, to, piece, capture) if capture_needed?(capture, from, to, piece)
    handle_promotion(result, to, promotion) if promotion

    move_piece(from, to, result)
    result
  end

  def get_player_piece(piece)
    @board.current_player == :white ? piece.upcase : piece.downcase
  end

  def capture_needed?(capture, from, to, piece)
    capture || (@board[to] && piece.upcase == 'P' && from[0] != to[0])
  end

  def handle_capture(result, from, to, piece, capture)
    captured_piece = determine_captured_piece(to)
    captured_square = determine_capture_square(from, to, piece, capture)

    result[:remove] = [captured_piece, captured_square]
    @board.delete(captured_square)
  end

  def determine_captured_piece(to)
    @board[to] || (@board.current_player == :white ? 'p' : 'P')
  end

  def determine_capture_square(from, to, piece, capture)
    if piece.upcase == 'P' && capture && !@board[to]
      "#{to[0]}#{from[1]}" # En passant capture square
    else
      to
    end
  end

  def handle_promotion(result, to, promotion)
    promoted_piece = get_promoted_piece(promotion)
    @board[to] = promoted_piece
    result[:add] = [promoted_piece, to]
  end

  def get_promoted_piece(promotion)
    piece = promotion[-1]
    @board.current_player == :white ? piece.upcase : piece.downcase
  end

  def move_piece(from, to, result)
    @board[to] = @board[from] unless result[:add] # Don't move if we're promoting (already handled)
    @board.delete(from)
  end

  def update_en_passant_status(ui_move)
    move = ui_move[:moves][0]
    @board.en_passant_target = if @board.current_player == :white && move =~ /^[a-h]2-[a-h]4$/
                                 move.sub(/^([a-h]).*/, '\\13')
                               elsif @board.current_player == :black && move =~ /^[a-h]7-[a-h]5$/
                                 move.sub(/^([a-h]).*/, '\\16')
                               else
                                 '-'
                               end
  end

  def generate_position_string
    (1..8).to_a.reverse.map { |file| generate_rank(file) }.join('/')
  end

  def generate_rank(file)
    empty_count = 0
    rank_string = ''

    ('a'..'h').each do |rank|
      square = "#{rank}#{file}"
      if @board[square]
        rank_string += empty_count.to_s if empty_count.positive?
        rank_string += @board[square]
        empty_count = 0
      else
        empty_count += 1
      end
    end

    rank_string += empty_count.to_s if empty_count.positive?
    rank_string
  end

  def generate_active_color
    @board.current_player == :white ? 'w' : 'b'
  end

  def valid_uci_move?(uci_move)
    uci_move && uci_move.length >= 4
  end

  def parse_uci_move(uci_move)
    result = [
      uci_move[0..1],
      uci_move[2..3]
    ]
    result << uci_move[4] if uci_move.length > 4
    result
  end

  def initialize_move_result(from, to, piece)
    { piece: piece, moves: ["#{from}-#{to}"] }
  end

  def capturing?(from, to, piece)
    return true if @board[to]
    return true if piece.upcase == 'P' && from[0] != to[0] && !@board[to]

    false
  end

  def generate_move_notation(piece, from, to, capture, promotion)
    notation = if piece.upcase == 'P'
                 generate_pawn_notation(from, to, capture)
               else
                 generate_piece_notation(piece, to, capture)
               end
    notation += "=#{promotion.upcase}" if promotion
    notation
  end

  def generate_pawn_notation(from, to, capture)
    capture ? "#{from[0]}x#{to}" : to
  end

  def generate_piece_notation(piece, to, capture)
    "#{piece.upcase}#{'x' if capture}#{to}"
  end

  def handle_uci_capture(result, from, to, piece, _capture)
    if piece.upcase == 'P' && from[0] != to[0] && !@board[to]
      handle_en_passant_capture(result, from, to)
    else
      handle_regular_capture(result, to)
    end
  end

  def handle_en_passant_capture(result, from, to)
    captured_square = "#{to[0]}#{from[1]}"
    captured_piece = @board.current_player == :white ? 'p' : 'P'
    result[:remove] = [captured_piece, captured_square]
  end

  def handle_regular_capture(result, to)
    result[:remove] = [@board[to], to]
  end

  def handle_uci_promotion(result, to, promotion)
    promoted_piece = @board.current_player == :white ? promotion.upcase : promotion.downcase
    result[:add] = [promoted_piece, to]
  end
end
