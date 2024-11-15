import { describe, it, expect, beforeEach } from 'vitest';
import ChessRules from '../../public/scripts/chess_rules.js';

describe('ChessRules', () => {
  let rules;

  beforeEach(() => {
    rules = new ChessRules();
  });

  describe('objToFen', () => {
    it('converts an empty board to the correct FEN string', () => {
      const position = {};
      const fen = ChessRules.objToFen(position);
      expect(fen).toBe('8/8/8/8/8/8/8/8');
    });

    it('converts a position with two kings to the correct FEN string', () => {
      const position = { 'e1': 'wk', 'e8': 'bk' };
      const fen = ChessRules.objToFen(position);
      expect(fen).toBe('4k3/8/8/8/8/8/8/4K3')
    });
  });

  describe('Pawns', () => {
    it('allows legal pawn moves', () => {
      const position = { 'e2': 'wp', 'e7': 'bp', 'd7': 'bp' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      // Single push
      expect(rules.isLegalMove('e2', 'e3', 'wp')).toBe(true);
      expect(rules.isLegalMove('e7', 'e6', 'bp')).toBe(true);

      // Double push from starting position
      expect(rules.isLegalMove('e2', 'e4', 'wp')).toBe(true);
      expect(rules.isLegalMove('e7', 'e5', 'bp')).toBe(true);
    });

    it('prevents illegal pawn moves', () => {
      const position = { 'e2': 'wp', 'e7': 'bp', 'e3': 'wn' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      // Moving backwards
      expect(rules.isLegalMove('e7', 'e8', 'bp')).toBe(false);

      // Moving through pieces
      expect(rules.isLegalMove('e2', 'e4', 'wp')).toBe(false);

      // Moving diagonally without capture
      expect(rules.isLegalMove('e2', 'f3', 'wp')).toBe(false);
    });

    it('handles en passant captures', () => {
      const position = { 'e5': 'wp', 'd5': 'bp' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, 'd6');

      // Legal en passant
      expect(rules.isLegalMove('e5', 'd6', 'wp')).toBe(true);

      const rules2 = new ChessRules(fen, '-');
      // Illegal without en passant square
      expect(rules2.isLegalMove('e5', 'd6', 'wp')).toBe(false);
    });
  });

  describe('Knights', () => {
    it('allows legal knight moves', () => {
      const position = { 'g1': 'wn' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('g1', 'f3', 'wn')).toBe(true);
      expect(rules.isLegalMove('g1', 'h3', 'wn')).toBe(true);
      expect(rules.isLegalMove('g1', 'e2', 'wn')).toBe(true);
    });

    it('prevents illegal knight moves', () => {
      const position = { 'g1': 'wn' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('g1', 'g3', 'wn')).toBe(false);
      expect(rules.isLegalMove('g1', 'e3', 'wn')).toBe(false);
    });
  });

  describe('Bishops', () => {
    it('allows legal bishop moves', () => {
      const position = { 'c1': 'wb' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('c1', 'a3', 'wb')).toBe(true);
      expect(rules.isLegalMove('c1', 'h6', 'wb')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'c1': 'wb', 'd2': 'wp' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('c1', 'e3', 'wb')).toBe(false);
    });
  });

  describe('Rooks', () => {
    it('allows legal rook moves', () => {
      const position = { 'a1': 'wr' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('a1', 'a8', 'wr')).toBe(true);
      expect(rules.isLegalMove('a1', 'h1', 'wr')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'a1': 'wr', 'a2': 'wp' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('a1', 'a3', 'wr')).toBe(false);
    });
  });

  describe('Queens', () => {
    it('allows legal queen moves', () => {
      const position = { 'd1': 'wq' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      // Diagonal moves
      expect(rules.isLegalMove('d1', 'h5', 'wq')).toBe(true);
      // Straight moves
      expect(rules.isLegalMove('d1', 'd8', 'wq')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'd1': 'wq', 'd2': 'wp', 'e2': 'wp' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('d1', 'd3', 'wq')).toBe(false);
      expect(rules.isLegalMove('d1', 'f3', 'wq')).toBe(false);
    });
  });

  describe('Kings', () => {
    it('allows legal king moves', () => {
      const position = { 'e1': 'wk' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      // One square in any direction
      expect(rules.isLegalMove('e1', 'e2', 'wk')).toBe(true);
      expect(rules.isLegalMove('e1', 'f2', 'wk')).toBe(true);
      expect(rules.isLegalMove('e1', 'f1', 'wk')).toBe(true);
    });

    it('prevents illegal king moves', () => {
      const position = { 'e1': 'wk' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      // More than one square
      expect(rules.isLegalMove('e1', 'e3', 'wk')).toBe(false);
      expect(rules.isLegalMove('e1', 'g1', 'wk')).toBe(false);
    });

    it('allows kingside castling', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'e8': 'bk',
        'h8': 'br'
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('e1', 'g1', 'wk')).toBe(true);
      expect(rules.isLegalMove('e8', 'g8', 'bk')).toBe(true);
    });

    it('allows queenside castling', () => {
      const position = {
        'e1': 'wk',
        'a1': 'wr',
        'e8': 'bk',
        'a8': 'br'
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('e1', 'c1', 'wk')).toBe(true);
      expect(rules.isLegalMove('e8', 'c8', 'bk')).toBe(true);
    });

    it('prevents castling through pieces', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'f1': 'wb'  // Piece blocking kingside castle
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('e1', 'g1', 'wk')).toBe(false);
    });

    it('prevents castling while in check', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'e8': 'br'  // Black rook giving check
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, 'KQkq');

      expect(rules.isLegalMove('e1', 'g1', 'wk')).toBe(false);
    });

    it('prevents castling through check', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'e8': 'br',  // Black rook controlling f1
        'h8': 'bk'
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, 'KQkq');

      expect(rules.isLegalMove('e1', 'g1', 'wk')).toBe(false);
    });

    it('prevents castling when castling rights are lost', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr'
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-', '');

      // No castling rights
      expect(rules.isLegalMove('e1', 'g1', 'wk')).toBe(false);

      const rules2 = new ChessRules(fen, '-', 'Q');
      // Only queenside castling rights
      expect(rules2.isLegalMove('e1', 'g1', 'wk')).toBe(false);
    });

    it('allows normal king moves even after losing castling rights', () => {
      const position = {
        'e1': 'wk'
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '');

      // Should be able to move one square even without castling rights
      expect(rules.isLegalMove('e1', 'e2', 'wk')).toBe(true);
    });

    it('prevents moving into check', () => {
      const position = {
        'f1': 'wk',
        'e8': 'br'  // Black rook controlling e-file
      };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, 'KQkq');

      expect(rules.isLegalMove('f1', 'e2', 'wk')).toBe(false);
    });
  });
});
