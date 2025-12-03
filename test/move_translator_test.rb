# frozen_string_literal: true

require_relative 'test_helper'
require_relative '../lib/move_translator'

class MoveTranslatorTest < Minitest::Test
  def setup
    @translator = MoveTranslator.new
  end

  def test_pawn_move
    assert_equal({ piece: 'P', moves: ['e2-e4'] }, @translator.translate_move('e4'))
    assert_equal({ piece: 'p', moves: ['d7-d5'] }, @translator.translate_move('d5'))
    assert_equal({ piece: 'P', moves: ['e4-e5'] }, @translator.translate_move('e5'))
  end

  def test_pawn_capture
    @translator.translate_moves(%w[e4 d5])

    assert_equal({ piece: 'P', moves: ['e4-d5'], remove: %w[p d5] }, @translator.translate_move('exd5'))
  end

  def test_black_pawn_capture
    @translator.translate_moves(%w[e4 d5 d4])

    assert_equal({ piece: 'p', moves: ['d5-e4'], remove: %w[P e4] }, @translator.translate_move('dxe4'))
  end

  def test_pawn_en_passant_capture
    @translator.translate_moves(%w[e4 a6 e5 d5])

    assert_equal({ piece: 'P', moves: ['e5-d6'], remove: %w[p d5] }, @translator.translate_move('exd6'))
  end

  def test_pawn_en_passant_capture_black
    @translator.translate_moves(%w[Nf3 c5 e4 c4 d4])

    assert_equal({ piece: 'p', moves: ['c4-d3'], remove: %w[P d4] }, @translator.translate_move('cxd3'))
  end

  def test_knight_move
    assert_equal({ piece: 'N', moves: ['g1-f3'] }, @translator.translate_move('Nf3'))
    assert_equal({ piece: 'n', moves: ['b8-c6'] }, @translator.translate_move('Nc6'))
  end

  def test_bishop_move
    @translator.translate_move('e4')
    @translator.translate_move('e5')

    assert_equal({ piece: 'B', moves: ['f1-c4'] }, @translator.translate_move('Bc4'))
  end

  def test_rook_move
    @translator.translate_moves(%w[Nf3 d5 e3 Nc6 Bb5 Nf6])

    assert_equal({ piece: 'R', moves: ['h1-f1'] }, @translator.translate_move('Rf1'))
  end

  def test_queen_move
    @translator.translate_move('e4')
    @translator.translate_move('e5')

    assert_equal({ piece: 'Q', moves: ['d1-h5'] }, @translator.translate_move('Qh5'))
  end

  def test_king_move
    @translator.translate_move('e4')
    @translator.translate_move('e5')

    assert_equal({ piece: 'K', moves: ['e1-e2'] }, @translator.translate_move('Ke2'))
  end

  def test_castle_short
    @translator.translate_moves(%w[e4 e5 Nf3 Nc6 Bc4 Bc5])

    assert_equal({ piece: 'K', moves: %w[e1-g1 h1-f1] }, @translator.translate_move('O-O'))
  end

  def test_castle_long
    @translator.translate_moves(%w[d4 d5 Nc3 Nc6 Bf4 Bf5 Qd3 Qd6])

    assert_equal({ piece: 'K', moves: %w[e1-c1 a1-d1] }, @translator.translate_move('O-O-O'))
  end

  def test_promotion_to_queen
    board = Translator::Board.new
    @translator = MoveTranslator.new(board)
    board.squares['a7'] = 'P'
    board.squares['a8'] = nil
    board.current_player = :white

    assert_equal({ piece: 'P', moves: ['a7-a8'], add: %w[Q a8] }, @translator.translate_move('a8=Q'))
  end

  def test_promotion_to_knight
    board = Translator::Board.new
    @translator = MoveTranslator.new(board)
    board.squares['a7'] = 'P'
    board.squares['a8'] = nil
    board.current_player = :white

    assert_equal({ piece: 'P', moves: ['a7-a8'], add: %w[N a8] }, @translator.translate_move('a8=N'))
  end

  def test_start_position_to_fen
    assert_equal('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', @translator.board_as_fen)
  end

  def test_position_to_fen_after_some_moves
    @translator.translate_moves(%w[e4 e5 Nf3 Nc6 Bc4 Bc5 c3 d6 d4 exd4 cxd4 Bb6 h3
                                   Nf6 O-O])

    assert_equal('r1bqk2r/ppp2ppp/1bnp1n2/8/2BPP3/5N1P/PP3PP1/RNBQ1RK1 b kq - 2 8', @translator.board_as_fen)
  end

  # rubocop:disable Naming/VariableNumber
  def test_position_to_fen_after_e4
    @translator.translate_move('e4')
    # it is correct to populate the en passant target even if no enemy pawn can actually take it
    assert_equal('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1', @translator.board_as_fen)
  end

  def test_position_to_fen_after_e4_e5
    @translator.translate_moves(%w[e4 e5])

    assert_equal('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2', @translator.board_as_fen)
  end
  # rubocop:enable Naming/VariableNumber

  def test_position_to_fen_after_white_bong_cloud
    @translator.translate_moves(%w[e4 e5 Ke2])

    assert_equal('rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPPKPPP/RNBQ1BNR b kq - 1 2', @translator.board_as_fen)
  end

  def test_position_to_fen_after_both_bong_cloud
    @translator.translate_moves(%w[e4 e5 Ke2 Ke7])

    assert_equal('rnbq1bnr/ppppkppp/8/4p3/4P3/8/PPPPKPPP/RNBQ1BNR w - - 2 3', @translator.board_as_fen)
  end

  def test_position_to_fen_after_white_kingside_rook_move
    @translator.translate_moves(%w[e4 e5 Nf3 Nc6 Bc4 Bc5 Rf1])

    assert_equal('r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQKR2 b Qkq - 5 4', @translator.board_as_fen)
  end

  def test_position_to_fen_after_white_queenside_rook_move
    @translator.translate_moves(%w[a4 d6 Ra3])

    assert_equal('rnbqkbnr/ppp1pppp/3p4/8/P7/R7/1PPPPPPP/1NBQKBNR b Kkq - 1 2', @translator.board_as_fen)
  end

  def test_position_to_fen_after_black_kingside_rook_move
    @translator.translate_moves(%w[e4 h6 d4 Rh7])

    assert_equal('rnbqkbn1/pppppppr/7p/8/3PP3/8/PPP2PPP/RNBQKBNR w KQq - 1 3', @translator.board_as_fen)
  end

  def test_position_to_fen_after_black_queenside_rook_move
    @translator.translate_moves(%w[e4 Nc6 d4 Rb8])

    assert_equal('1rbqkbnr/pppppppp/2n5/8/3PP3/8/PPP2PPP/RNBQKBNR w KQk - 1 3', @translator.board_as_fen)
  end

  def test_position_when_pawn_moves_after_en_passant
    @translator.translate_moves(%w[e4 e6 e5 Bc5 f4 f5 exf6 gxf6 f5])

    assert_equal('rnbqk1nr/pppp3p/4pp2/2b2P2/8/8/PPPP2PP/RNBQKBNR b KQkq - 0 5', @translator.board_as_fen)
  end

  def test_position_when_move_is_disambiguated_by_check
    @translator.translate_moves(%w[Nf3 e6 Nc3 d6 Nd4 c6 d3 Qa5])
    @translator.translate_move('Nb5') # the other knight is pinned

    assert_equal('rnb1kbnr/pp3ppp/2ppp3/qN6/8/2NP4/PPP1PPPP/R1BQKB1R b KQkq - 2 5', @translator.board_as_fen)
  end

  def test_position_with_castling_and_check
    @translator.translate_moves(%w[e3 e6 Bd3 Ba3 Ke2 Qh4 Bg6 fxg6 Kf3 Ne7 Qe2])
    @translator.translate_move('O-O#')

    assert_equal('rnb2rk1/ppppn1pp/4p1p1/8/7q/b3PK2/PPPPQPPP/RNB3NR w - - 4 7', @translator.board_as_fen)
  end

  def test_when_black_promotes
    @translator.translate_moves(%w[b4 a5 c3 axb4 Nf3 bxc3 g3 c2 Bg2])
    result = @translator.translate_move('cxb1=Q')

    assert_equal({ piece: 'p', moves: ['c2-b1'], remove: %w[N b1], add: %w[q b1] }, result)
  end

  def test_position_when_black_promotes
    @translator.translate_moves(['b4', 'a5', 'c3', 'axb4', 'Nf3', 'bxc3', 'g3', 'c2', 'Bg2', 'cxb1=Q', 'O-O'])
    @translator.translate_move('Qb4')

    assert_equal('rnbqkbnr/1ppppppp/8/8/1q6/5NP1/P2PPPBP/R1BQ1RK1 w kq - 2 7', @translator.board_as_fen)
  end

  def test_position_from_starting_fen
    @translator.load_game_from_fen('8/8/1k6/3K4/5R2/8/2B5/8 w - - 0 1')
    @translator.translate_moves(%w[Ba4 Kc7 Bc6 Kb6 Kd6 Ka5 Kc5 Ka6 Ra4])

    assert_equal('8/8/k1B5/2K5/R7/8/8/8 b - - 9 5', @translator.board_as_fen)
  end

  def test_position_with_lots_of_moves
    @translator.translate_moves(%w[e4 e5 Nf3 Nc6 Bc4 Bc5 c3 d6 d4 exd4 cxd4 Bb6 h3
                                   Nf6 O-O])

    assert_equal('r1bqk2r/ppp2ppp/1bnp1n2/8/2BPP3/5N1P/PP3PP1/RNBQ1RK1 b kq - 2 8', @translator.board_as_fen)
  end

  def test_uci_promotion_to_queen
    @translator.load_game_from_fen('6k1/8/8/8/8/8/4q2p/K7 b - - 0 52')

    assert_equal({ piece: 'p', moves: ['h2-h1'], add: %w[q h1], notation: 'h1=Q' },
                 @translator.translate_uci_move('h2h1q'))
  end

  def test_uci_promotion_with_capture
    @translator.load_game_from_fen('3q2k1/4Pppp/8/8/8/8/8/7K w - - 0 28')

    assert_equal({ piece: 'P', moves: ['e7-d8'], add: %w[R d8], remove: %w[q d8], notation: 'exd8=R' },
                 @translator.translate_uci_move('e7d8R'))
  end

  def test_passing_move
    # Sometimes seen in odds games, for example Edward Lowe vs. Howard Staunton, 1847.
    # Staunton played Black without an f-pawn, and he passed his first turn.
    assert_equal({ piece: 'P', moves: ['e2-e4'] }, @translator.translate_move('e4'))
    assert_equal({ moves: [] }, @translator.translate_move('--'))
  end

  def test_en_passant_capture_after_loading_from_fen_with_ep_target
    @translator.load_game_from_fen('6r1/1pk2p2/p1p1p2p/P2r2pP/4KP2/R2P4/1P6/7R w - g6 0 25')
    result = @translator.translate_move('hxg6')

    assert_equal({ piece: 'P', moves: ['h5-g6'], remove: %w[p g5] }, result)
    assert_equal('6r1/1pk2p2/p1p1p1Pp/P2r4/4KP2/R2P4/1P6/7R b - - 0 25', @translator.board_as_fen)
  end
end
