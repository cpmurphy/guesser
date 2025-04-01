import { describe, it, expect, beforeEach } from 'vitest';
import GameState from '../../public/scripts/game_state.js';
import ChessRules from '../../public/scripts/chess_rules.js';

describe('GameState', () => {

  beforeEach(() => {
    // Standard starting position FEN
  });

  describe('constructor', () => {
    it('initializes with correct castling rights from FEN', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules);
      expect(gameState.castlingRights).toBe('KQkq');
      expect(gameState.enPassant).toBe('-');
      expect(gameState.halfmoveClock).toBe(0);
    });

    it('handles FEN with partial castling rights', () => {
      let gameState = new GameState('1nbqkbnr/1ppp1ppp/r7/p3p3/P3P3/R7/1PPP1PPP/1NBQKBNR w Kk - 2 4', ChessRules);
      expect(gameState.castlingRights).toBe('Kk');
    });
  });

  describe('isWhiteToMove', () => {
    it('handles a normal game starting with white', () => {
      let gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules);
      expect(gameState.isWhiteToMove(0)).toBe(true);
    });
    it('handles jumping into the middle of a game with black to move', () => {
      let gameState = new GameState('rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2', ChessRules);
      expect(gameState.isWhiteToMove(0)).toBe(false);
    });
  });

  describe('castling rights', () => {
    it('removes white kingside castling when white king moves', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules);
      gameState.update('wk', 'e1', 'e2');
      expect(gameState.castlingRights).not.toMatch(/[KQ]/);
      expect(gameState.castlingRights).toMatch(/[kq]/);
    });

    it('removes black kingside castling when black king moves', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules);
      gameState.update('bk', 'e8', 'e7');
      expect(gameState.castlingRights).not.toMatch(/[kq]/);
      expect(gameState.castlingRights).toMatch(/[KQ]/);
    });

    it('removes white queenside castling when a1 rook moves', () => {
      let gameState = new GameState('r1bqkbnr/2pp1ppp/p1n5/1p2p3/P3P3/1P6/1BPP1PPP/RN1QKBNR w KQkq - 0 5', ChessRules);
      gameState.update('wr', 'a1', 'a2');
      expect(gameState.castlingRights).not.toMatch(/Q/);
      expect(gameState.castlingRights).toMatch(/[Kkq]/);
    });

    it('removes white kingside castling when h1 rook moves', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules);
      gameState.update('wr', 'h1', 'h2');
      expect(gameState.castlingRights).not.toMatch(/K/);
      expect(gameState.castlingRights).toMatch(/[Qkq]/);
    });
  });

  describe('move history', () => {
    it('tracks castling rights history correctly', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules);
      gameState.update('wr', 'h1', 'h2');
      expect(gameState.castlingRightsHistory[0]).toBe('KQkq');
      expect(gameState.castlingRights).toBe('Qkq');

      gameState.update('wk', 'e1', 'e2');
      expect(gameState.castlingRightsHistory[1]).toBe('Qkq');
      expect(gameState.castlingRights).toBe('kq');
    });

    it('can rewind moves and restore castling rights', () => {
      let gameState = new GameState('r1bqk2r/pppp1pp1/2n2n1p/2b1p3/2B1P3/2P2N1P/PP1P1PP1/RNBQK2R w KQkq - 0 6', ChessRules);
      gameState.update('wr', 'h1', 'h2');
      gameState.update('wk', 'e1', 'e2');

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
      gameState.update('wp', 'e2', 'e4');
      expect(gameState.enPassant).toBe('e3');
    });

    it('sets en passant square when black pawn moves two squares', () => {
      gameState.update('wp', 'e2', 'e4');
      gameState.update('bp', 'e7', 'e5');
      expect(gameState.enPassant).toBe('e6');
    });

    it('clears en passant square after any non-pawn move by opponent', () => {
      // First set an en passant square
      gameState.update('wp', 'e2', 'e4');
      // Then move a different piece
      gameState.update('bn', 'b8', 'c6');
      expect(gameState.enPassant).toBe('-');
    });

    it('tracks en passant history when rewinding moves', () => {
      gameState.update('wp', 'e2', 'e4');
      expect(gameState.enPassant).toBe('e3');
      expect(gameState.enPassantHistory[1]).toBe('e3');

      gameState.update('bn', 'b8', 'c6');
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
      gameState = new GameState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', ChessRules);
    });

    it('resets to 0 after a pawn move', () => {
      gameState.halfmoveClock = 5;
      gameState.update('wp', 'e2', 'e4');
      expect(gameState.halfmoveClock).toBe(0);
    });

    it('resets to 0 after a capture', () => {
      gameState.halfmoveClock = 5;
      gameState.update('wn', 'b1', 'c3', 'bp');
      expect(gameState.halfmoveClock).toBe(0);
    });

    it('increments after a non-pawn, non-capture move', () => {
      gameState.halfmoveClock = 5;
      gameState.update('wn', 'b1', 'c3');
      expect(gameState.halfmoveClock).toBe(6);
    });

    it('tracks halfmove clock in FEN string', () => {
      gameState.halfmoveClock = 5;
      gameState.update('wn', 'b1', 'c3');
      expect(gameState.stringForFen()).toBe('KQkq - 6');
    });
  });
});
