import { describe, it, expect, beforeEach } from 'vitest';
import GameState from '../../public/scripts/game_state.js';
import ChessRules from '../../public/scripts/chess_rules.js';
import Fen from '../../public/scripts/fen.js';

describe('GameState', () => {

  beforeEach(() => {
    // Standard starting position FEN
  });

  describe('constructor', () => {
    it('initializes with correct castling rights from FEN', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules, Fen);
      expect(gameState.castlingRights).toBe('KQkq');
      expect(gameState.enPassant).toBe('-');
      expect(gameState.halfmoveClock).toBe(0);
    });

    it('handles FEN with partial castling rights', () => {
      let gameState = new GameState('1nbqkbnr/1ppp1ppp/r7/p3p3/P3P3/R7/1PPP1PPP/1NBQKBNR w Kk - 2 4', ChessRules, Fen);
      expect(gameState.castlingRights).toBe('Kk');
    });
  });

  describe('isWhiteToMove', () => {
    it('handles a normal game starting with white', () => {
      let gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules, Fen);
      expect(gameState.isWhiteToMove(0)).toBe(true);
    });
    it('handles jumping into the middle of a game with black to move', () => {
      let gameState = new GameState('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', ChessRules, Fen);
      expect(gameState.isWhiteToMove(0)).toBe(false);
    });
  });

  describe('castling rights', () => {
    it('removes white kingside castling when white king moves', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules, Fen);
      gameState.update('K', 'e1', 'e2');
      expect(gameState.castlingRights).not.toMatch(/[KQ]/);
      expect(gameState.castlingRights).toMatch(/[kq]/);
    });

    it('removes black kingside castling when black king moves', () => {
      let gameState = new GameState('r1bqkb1r/p4ppp/2p2n2/n3p1N1/8/8/PPPPBPPP/RNBQK2R b KQkq - 1 8', ChessRules, Fen);
      gameState.update('K', 'e8', 'e7');
      expect(gameState.castlingRights).not.toMatch(/[kq]/);
      expect(gameState.castlingRights).toMatch(/[KQ]/);
    });

    it('removes white queenside castling when a1 rook moves', () => {
      let gameState = new GameState('r1bqkbnr/2pp1ppp/p1n5/1p2p3/P3P3/1P6/1BPP1PPP/RN1QKBNR w KQkq - 0 5', ChessRules, Fen);
      gameState.update('R', 'a1', 'a2');
      expect(gameState.castlingRights).not.toMatch(/Q/);
      expect(gameState.castlingRights).toMatch(/[Kkq]/);
    });

    it('removes white kingside castling when h1 rook moves', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules, Fen);
      gameState.update('R', 'h1', 'h2');
      expect(gameState.castlingRights).not.toMatch(/K/);
      expect(gameState.castlingRights).toMatch(/[Qkq]/);
    });
  });

  describe('move history', () => {
    it('tracks castling rights history correctly', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules, Fen);
      gameState.update('R', 'h1', 'h2');
      expect(gameState.castlingRightsHistory.size).toBe(1);
      expect(gameState.castlingRightsHistory.get(0)).toBe('KQkq');
      expect(gameState.castlingRights).toBe('Qkq');

      // insert a move that doesn't change castling rights
      gameState.update('P', 'a7', 'a6');
      expect(gameState.castlingRightsHistory.size).toBe(1);
      expect(gameState.castlingRights).toBe('Qkq');

      gameState.update('K', 'e1', 'e2');
      expect(gameState.castlingRightsHistory.size).toBe(2);
      expect(gameState.castlingRightsHistory.get(2)).toBe('Qkq');
      expect(gameState.castlingRights).toBe('kq');
    });

    it('can rewind moves and restore castling rights', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules, Fen);
      gameState.update('R', 'h1', 'h2');
      gameState.update('K', 'e1', 'e2');

      gameState.rewind();
      expect(gameState.castlingRights).toBe('Qkq');

      gameState.rewind();
      expect(gameState.castlingRights).toBe('KQkq');
    });
  });

  describe('en passant tracking', () => {
    let gameState;

    beforeEach(() => {
      gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules);
    });

    it('starts with no en passant square', () => {
      expect(gameState.enPassant).toBe('-');
    });

    it('sets en passant square when white pawn moves two squares', () => {
      gameState.update('P', 'e2', 'e4');
      expect(gameState.enPassant).toBe('e3');
    });

    it('sets en passant square when black pawn moves two squares', () => {
      gameState.update('P', 'e2', 'e4');
      gameState.update('P', 'e7', 'e5');
      expect(gameState.enPassant).toBe('e6');
    });

    it('clears en passant square after any non-pawn move by opponent', () => {
      // First set an en passant square
      gameState.update('P', 'e2', 'e4');
      // Then move a different piece
      gameState.update('N', 'b8', 'c6');
      expect(gameState.enPassant).toBe('-');
    });

    it('tracks en passant history when rewinding moves', () => {
      gameState.update('P', 'e2', 'e4');
      expect(gameState.enPassant).toBe('e3');
      expect(gameState.enPassantHistory[1]).toBe('e3');

      gameState.update('N', 'b8', 'c6');
      expect(gameState.enPassant).toBe('-');

      gameState.rewind();
      expect(gameState.enPassant).toBe('e3');

      gameState.rewind();
      expect(gameState.enPassant).toBe('-');
    });
  });

  describe('halfmove clock', () => {
    let gameState;

    beforeEach(() => {
      gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules, Fen);
    });

    it('resets to 0 after a pawn move', () => {
      gameState.halfmoveClock = 5;
      gameState.update('P', 'e2', 'e4');
      expect(gameState.halfmoveClock).toBe(0);
    });

    it('resets to 0 after a capture', () => {
      gameState.halfmoveClock = 5;
      gameState.update('N', 'b1', 'c3', 'P');
      expect(gameState.halfmoveClock).toBe(0);
    });

    it('increments after a non-pawn, non-capture move', () => {
      gameState.halfmoveClock = 5;
      gameState.update('N', 'b1', 'c3');
      expect(gameState.halfmoveClock).toBe(6);
    });

    it('tracks halfmove clock in FEN string', () => {
      gameState.halfmoveClock = 5;
      gameState.update('N', 'b1', 'c3');
      expect(gameState.stringForFen()).toBe('KQkq - 6');
    });
  });

  describe('isPawnPromotion', () => {
    let gameState;

    beforeEach(() => {
      gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules, Fen);
    });

    it('returns true for white pawn reaching 8th rank', () => {
      expect(gameState.isPawnPromotion('e8', 'wp')).toBe(true);
    });

    it('returns true for black pawn reaching 1st rank', () => {
      expect(gameState.isPawnPromotion('e1', 'bp')).toBe(true);
    });

    it('returns false for non-pawn pieces', () => {
      expect(gameState.isPawnPromotion('e8', 'wn')).toBe(false);
      expect(gameState.isPawnPromotion('e1', 'bn')).toBe(false);
    });

    it('returns false for pawns not reaching promotion rank', () => {
      expect(gameState.isPawnPromotion('e7', 'wp')).toBe(false);
      expect(gameState.isPawnPromotion('e2', 'bp')).toBe(false);
    });
  });

  describe('isCastling', () => {
    let gameState;

    beforeEach(() => {
      gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules, Fen);
    });

    it('returns true for white kingside castling', () => {
      expect(gameState.isCastling('wk', 'e1', 'g1')).toBe(true);
    });

    it('returns true for white queenside castling', () => {
      expect(gameState.isCastling('wk', 'e1', 'c1')).toBe(true);
    });

    it('returns true for black kingside castling', () => {
      expect(gameState.isCastling('bk', 'e8', 'g8')).toBe(true);
    });

    it('returns true for black queenside castling', () => {
      expect(gameState.isCastling('bk', 'e8', 'c8')).toBe(true);
    });

    it('returns false for non-castling king moves', () => {
      expect(gameState.isCastling('wk', 'e1', 'e2')).toBe(false);
      expect(gameState.isCastling('bk', 'e8', 'e7')).toBe(false);
    });

    it('returns false for non-king pieces', () => {
      expect(gameState.isCastling('wq', 'd1', 'd2')).toBe(false);
      expect(gameState.isCastling('br', 'h8', 'h7')).toBe(false);
    });
  });

  describe('isLegalMove', () => {
    let gameState;

    beforeEach(() => {
      gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules, Fen);
    });

    it('returns true for legal pawn moves', () => {
      expect(gameState.isLegalMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2', 'e4', 'wp')).toBe(true);
    });

    it('returns true for legal knight moves', () => {
      expect(gameState.isLegalMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'g1', 'f3', 'wn')).toBe(true);
    });

    it('returns false for illegal pawn moves', () => {
      expect(gameState.isLegalMove('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'e2', 'e5', 'wp')).toBe(false);
    });

    it('returns false for moves that would leave king in check', () => {
      const fen = 'r1bqk2r/pppp1ppp/2n2n2/8/2BPP3/2b2N2/PP3PPP/R1BQK2R w KQkq - 0 8';
      expect(gameState.isLegalMove(fen, 'f2', 'f3', 'wp')).toBe(false);
    });
  });

  describe('isGameTerminated', () => {
    let gameState;

    beforeEach(() => {
      gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules, Fen);
    });

    it('returns true for checkmate', () => {
      const fen = 'rnR2b1r/1p2kQpp/pN1q1p2/6N1/8/8/PP2PPPP/4KB1R b K - 1 17';
      expect(gameState.isGameTerminated(fen, 17)).toBe(true);
    });

    it('returns true for stalemate', () => {
      const fen = '2q5/5p2/6p1/3p1k2/6pK/5r2/5P2/8 w - - 0 29';
      expect(gameState.isGameTerminated(fen, 20)).toBe(true);
    });

    it('returns true for insufficient material', () => {
      const fen = '8/8/8/1b3k2/7K/8/8/8 b - - 0 78';
      expect(gameState.isGameTerminated(fen, 0)).toBe(true);
    });

    it('returns true for 50-move rule', () => {
      const fen = '8/8/8/8/5k2/5P2/5K2/8 w - - 99 150';
      gameState.halfMoveClock = 99;
      expect(gameState.isGameTerminated(fen, 150)).toBe(true);
    });

    it('returns false for normal position', () => {
      const fen = 'r1bq1r1k/ppppnp1p/2n3p1/6B1/2PQ2N1/8/PP2PPPP/R3KB1R b KQ - 4 10';
      expect(gameState.isGameTerminated(fen, 0)).toBe(false);
    });
  });
});
