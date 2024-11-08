import { describe, it, expect } from 'vitest';
import ChessRules from '../../public/scripts/chess_rules.js';

describe('ChessRules', () => {
  let rules;

  beforeEach(() => {
    rules = new ChessRules();
  });

  describe('Pawns', () => {
    it('allows legal pawn moves', () => {
      const position = { 'e2': 'wP', 'e7': 'bP', 'd7': 'bP' };

      // Single push
      expect(rules.isLegalMove('e2', 'e3', 'wP', position, '-')).toBe(true);
      expect(rules.isLegalMove('e7', 'e6', 'bP', position, '-')).toBe(true);

      // Double push from starting position
      expect(rules.isLegalMove('e2', 'e4', 'wP', position, '-')).toBe(true);
      expect(rules.isLegalMove('e7', 'e5', 'bP', position, '-')).toBe(true);
    });

    it('prevents illegal pawn moves', () => {
      const position = { 'e2': 'wP', 'e7': 'bP', 'e3': 'wN' };

      // Moving backwards
      expect(rules.isLegalMove('e7', 'e8', 'bP', position, '-')).toBe(false);

      // Moving through pieces
      expect(rules.isLegalMove('e2', 'e4', 'wP', position, '-')).toBe(false);

      // Moving diagonally without capture
      expect(rules.isLegalMove('e2', 'f3', 'wP', position, '-')).toBe(false);
    });

    it('handles en passant captures', () => {
      const position = { 'e5': 'wP', 'd5': 'bP' };

      // Legal en passant
      expect(rules.isLegalMove('e5', 'd6', 'wP', position, 'd6')).toBe(true);

      // Illegal without en passant square
      expect(rules.isLegalMove('e5', 'd6', 'wP', position, '-')).toBe(false);
    });
  });

  describe('Knights', () => {
    it('allows legal knight moves', () => {
      const position = { 'g1': 'wN' };

      expect(rules.isLegalMove('g1', 'f3', 'wN', position, '-')).toBe(true);
      expect(rules.isLegalMove('g1', 'h3', 'wN', position, '-')).toBe(true);
      expect(rules.isLegalMove('g1', 'e2', 'wN', position, '-')).toBe(true);
    });

    it('prevents illegal knight moves', () => {
      const position = { 'g1': 'wN' };

      expect(rules.isLegalMove('g1', 'g3', 'wN', position, '-')).toBe(false);
      expect(rules.isLegalMove('g1', 'e3', 'wN', position, '-')).toBe(false);
    });
  });

  describe('Bishops', () => {
    it('allows legal bishop moves', () => {
      const position = { 'c1': 'wB' };

      expect(rules.isLegalMove('c1', 'a3', 'wB', position, '-')).toBe(true);
      expect(rules.isLegalMove('c1', 'h6', 'wB', position, '-')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'c1': 'wB', 'd2': 'wP' };

      expect(rules.isLegalMove('c1', 'e3', 'wB', position, '-')).toBe(false);
    });
  });

  describe('Rooks', () => {
    it('allows legal rook moves', () => {
      const position = { 'a1': 'wR' };

      expect(rules.isLegalMove('a1', 'a8', 'wR', position, '-')).toBe(true);
      expect(rules.isLegalMove('a1', 'h1', 'wR', position, '-')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'a1': 'wR', 'a2': 'wP' };

      expect(rules.isLegalMove('a1', 'a3', 'wR', position, '-')).toBe(false);
    });
  });

  describe('Queens', () => {
    it('allows legal queen moves', () => {
      const position = { 'd1': 'wQ' };

      // Diagonal moves
      expect(rules.isLegalMove('d1', 'h5', 'wQ', position, '-')).toBe(true);
      // Straight moves
      expect(rules.isLegalMove('d1', 'd8', 'wQ', position, '-')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'd1': 'wQ', 'd2': 'wP', 'e2': 'wP' };

      expect(rules.isLegalMove('d1', 'd3', 'wQ', position, '-')).toBe(false);
      expect(rules.isLegalMove('d1', 'f3', 'wQ', position, '-')).toBe(false);
    });
  });

  describe('Kings', () => {
    it('allows legal king moves', () => {
      const position = { 'e1': 'wK' };

      // One square in any direction
      expect(rules.isLegalMove('e1', 'e2', 'wK', position, '-')).toBe(true);
      expect(rules.isLegalMove('e1', 'f2', 'wK', position, '-')).toBe(true);
      expect(rules.isLegalMove('e1', 'f1', 'wK', position, '-')).toBe(true);
    });

    it('prevents illegal king moves', () => {
      const position = { 'e1': 'wK' };

      // More than one square
      expect(rules.isLegalMove('e1', 'e3', 'wK', position, '-')).toBe(false);
      expect(rules.isLegalMove('e1', 'g1', 'wK', position, '-')).toBe(false);
    });

    it('allows kingside castling', () => {
      const position = {
        'e1': 'wK',
        'h1': 'wR',
        'e8': 'bK',
        'h8': 'bR'
      };

      expect(rules.isLegalMove('e1', 'g1', 'wK', position, '-')).toBe(true);
      expect(rules.isLegalMove('e8', 'g8', 'bK', position, '-')).toBe(true);
    });

    it('allows queenside castling', () => {
      const position = {
        'e1': 'wK',
        'a1': 'wR',
        'e8': 'bK',
        'a8': 'bR'
      };

      expect(rules.isLegalMove('e1', 'c1', 'wK', position, '-')).toBe(true);
      expect(rules.isLegalMove('e8', 'c8', 'bK', position, '-')).toBe(true);
    });

    it('prevents castling through pieces', () => {
      const position = {
        'e1': 'wK',
        'h1': 'wR',
        'f1': 'wB'  // Piece blocking kingside castle
      };

      expect(rules.isLegalMove('e1', 'g1', 'wK', position, '-')).toBe(false);
    });

    it('prevents castling while in check', () => {
      const position = {
        'e1': 'wK',
        'h1': 'wR',
        'e8': 'bR'  // Black rook giving check
      };

      expect(rules.isLegalMove('e1', 'g1', 'wK', position, '-', 'KQkq')).toBe(false);
    });

    it('prevents castling through check', () => {
      const position = {
        'e1': 'wK',
        'h1': 'wR',
        'e8': 'bR',  // Black rook controlling f1
        'h8': 'bK'
      };

      expect(rules.isLegalMove('e1', 'g1', 'wK', position, '-', 'KQkq')).toBe(false);
    });

    it('prevents castling when castling rights are lost', () => {
      const position = {
        'e1': 'wK',
        'h1': 'wR'
      };

      // No castling rights
      expect(rules.isLegalMove('e1', 'g1', 'wK', position, '-', '')).toBe(false);

      // Only queenside castling rights
      expect(rules.isLegalMove('e1', 'g1', 'wK', position, '-', 'Q')).toBe(false);
    });

    it('allows normal king moves even after losing castling rights', () => {
      const position = {
        'e1': 'wK'
      };

      // Should be able to move one square even without castling rights
      expect(rules.isLegalMove('e1', 'e2', 'wK', position, '-', '')).toBe(true);
    });

    it('prevents moving into check', () => {
      const position = {
        'f1': 'wK',
        'e8': 'bR'  // Black rook controlling e-file
      };

      expect(rules.isLegalMove('f1', 'e2', 'wK', position, '-', 'KQkq')).toBe(false);
    });
  });
});
