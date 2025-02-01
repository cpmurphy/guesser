import { describe, it, expect, beforeEach } from 'vitest';
import ChessRules from '../../public/scripts/chess_rules.js';

describe('ChessRules', () => {

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

    it('disallows capture of own piece', () => {
      const position = { 'd1': 'wq', 'd2': 'wp' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('d1', 'd2', 'wq')).toBe(false);
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

    it('prevents a king moving next to another king', () => {
      const position = { 'e1': 'wk', 'g1': 'bk' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('e1', 'f1', 'wk')).toBe(false);
      expect(rules.isLegalMove('e1', 'f2', 'wk')).toBe(false);
    });

    it('prevents a king moving into check from a pawn', () => {
      const position = { 'g1': 'wk', 'g6': 'wp', 'h6': 'wp', 'g8': 'bk' };
      const fen = ChessRules.objToFen(position);
      const rules = new ChessRules(fen, '-');

      expect(rules.isLegalMove('g8', 'f7', 'bk')).toBe(false);
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

    it ('allows the king to move out of check', () => {
      const fen = '8/pppk1p2/8/2P3p1/P1P5/2K1n1P1/3R4/1r6 b KQ - 0 33';
      const rules = new ChessRules(fen, 'KQkq');

      expect(rules.isLegalMove('d7', 'c6', 'bk')).toBe(true);
    });
  });

  describe('Game ending conditions', () => {
    describe('Checkmate', () => {
      it('detects scholar\'s mate', () => {
        const fen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
        const rules = new ChessRules(fen, '-');

        expect(rules.isCheckmate(false)).toBe(true);
      });

      it('detects simple mate in the corner', () => {
        const fen = '8/8/1p6/1P5p/7P/8/1QK3P1/k7 b - - 5 56';
        const rules = new ChessRules(fen, '-');

        expect(rules.isCheckmate(false)).toBe(true);
      });

      it('recognizes it is possible to move out of check', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'h5': 'wq'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isLegalMove('e8', 'e7', 'bk')).toBe(true);
      });

      it('recognizes check is not checkmate', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'h5': 'wq'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isCheckmate(false)).toBe(false);
      });

      it('detects a checkmate with queen and pawns', () => {
        const fen = '3Q2k1/8/1P4PP/8/8/8/8/3b2K1 b - - 2 51';
        const rules = new ChessRules(fen, '-');

        expect(rules.isCheckmate(false)).toBe(true);
      });

      it('detects a checkmate with queen and pawns', () => {
        const fen = '3Q2k1/8/1P4PP/8/8/8/8/3b2K1 b - - 2 51';
        const rules = new ChessRules(fen, '-');

        expect(rules.isCheckmate(false)).toBe(true);
      });
    });

    describe('Stalemate', () => {
      it('detects basic stalemate', () => {
        const position = {
          'h8': 'wk',
          'f8': 'bk',
          'g6': 'bq'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isStalemate(true)).toBe(true);
      });

      it('recognizes non-stalemate position', () => {
        const position = {
          'h8': 'wk',
          'f8': 'bk',
          'g5': 'bq'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isStalemate(true)).toBe(false);
      });
    });

    describe('Insufficient Material', () => {
      it('recognizes king vs king', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isInsufficientMaterial()).toBe(true);
      });

      it('recognizes king and bishop vs king', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wb'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isInsufficientMaterial()).toBe(true);
      });

      it('recognizes king and knight vs king', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wn'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isInsufficientMaterial()).toBe(true);
      });

      it('recognizes king and bishop vs king and bishop (same colored squares)', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wb', // light square bishop
          'f8': 'bb'  // light square bishop
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isInsufficientMaterial()).toBe(true);
      });

      it('recognizes sufficient material with opposite colored bishops', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wb', // light square bishop
          'c8': 'bb'  // dark square bishop
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isInsufficientMaterial()).toBe(false);
      });

      it('recognizes sufficient material with pawns', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'e2': 'wp'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isInsufficientMaterial()).toBe(false);
      });

      it('recognizes sufficient material with two knights', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'b1': 'wn',
          'g1': 'wn'
        };
        const fen = ChessRules.objToFen(position);
        const rules = new ChessRules(fen, '-');

        expect(rules.isInsufficientMaterial()).toBe(false);
      });
    });
  });
});
