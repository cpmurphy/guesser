import { describe, it, expect, beforeEach } from 'vitest';
import ChessRules from '../../public/scripts/chess_rules.js';
import Fen from '../../public/scripts/fen.js';

describe('ChessRules', () => {


  describe('Pawns', () => {
    it('allows legal pawn moves', () => {
      const position = { 'e2': 'wp', 'e7': 'bp', 'd7': 'bp' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      // Single push
      expect(rules.isLegalMove(position, 'e2', 'e3', 'wp')).toBe(true);
      expect(rules.isLegalMove(position, 'e7', 'e6', 'bp')).toBe(true);

      // Double push from starting position
      expect(rules.isLegalMove(position, 'e2', 'e4', 'wp')).toBe(true);
      expect(rules.isLegalMove(position, 'e7', 'e5', 'bp')).toBe(true);
    });

    it('prevents illegal pawn moves', () => {
      const position = { 'e2': 'wp', 'e7': 'bp', 'e3': 'wn' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      // Moving backwards
      expect(rules.isLegalMove(position, 'e7', 'e8', 'bp')).toBe(false);

      // Moving through pieces
      expect(rules.isLegalMove(position, 'e2', 'e4', 'wp')).toBe(false);

      // Moving diagonally without capture
      expect(rules.isLegalMove(position, 'e2', 'f3', 'wp')).toBe(false);
    });

    it('handles en passant captures', () => {
      const position = { 'e5': 'wp', 'd5': 'bp' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);
      rules.setCurrentState('d6', 'KQkq');

      // Legal en passant
      expect(rules.isLegalMove(position, 'e5', 'd6', 'wp')).toBe(true);

      const rules2 = new ChessRules(Fen);
      // Illegal without en passant square
      expect(rules2.isLegalMove(position, 'e5', 'd6', 'wp')).toBe(false);
    });
  });

  describe('Knights', () => {
    it('allows legal knight moves', () => {
      const position = { 'g1': 'wn' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'g1', 'f3', 'wn')).toBe(true);
      expect(rules.isLegalMove(position, 'g1', 'h3', 'wn')).toBe(true);
      expect(rules.isLegalMove(position, 'g1', 'e2', 'wn')).toBe(true);
    });

    it('prevents illegal knight moves', () => {
      const position = { 'g1': 'wn' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'g1', 'g3', 'wn')).toBe(false);
      expect(rules.isLegalMove(position, 'g1', 'e3', 'wn')).toBe(false);
    });
  });

  describe('Bishops', () => {
    it('allows legal bishop moves', () => {
      const position = { 'c1': 'wb' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'c1', 'a3', 'wb')).toBe(true);
      expect(rules.isLegalMove(position, 'c1', 'h6', 'wb')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'c1': 'wb', 'd2': 'wp' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'c1', 'e3', 'wb')).toBe(false);
    });
  });

  describe('Rooks', () => {
    it('allows legal rook moves', () => {
      const position = { 'a1': 'wr' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'a1', 'a8', 'wr')).toBe(true);
      expect(rules.isLegalMove(position, 'a1', 'h1', 'wr')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'a1': 'wr', 'a2': 'wp' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'a1', 'a3', 'wr')).toBe(false);
    });
  });

  describe('Queens', () => {
    it('allows legal queen moves', () => {
      const position = { 'd1': 'wq' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      // Diagonal moves
      expect(rules.isLegalMove(position, 'd1', 'h5', 'wq')).toBe(true);
      // Straight moves
      expect(rules.isLegalMove(position, 'd1', 'd8', 'wq')).toBe(true);
    });

    it('prevents moves through pieces', () => {
      const position = { 'd1': 'wq', 'd2': 'wp', 'e2': 'wp' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'd1', 'd3', 'wq')).toBe(false);
      expect(rules.isLegalMove(position, 'd1', 'f3', 'wq')).toBe(false);
    });

    it('disallows capture of own piece', () => {
      const position = { 'd1': 'wq', 'd2': 'wp' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'd1', 'd2', 'wq')).toBe(false);
    });
  });

  describe('Kings', () => {
    it('allows legal king moves', () => {
      const position = { 'e1': 'wk' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      // One square in any direction
      expect(rules.isLegalMove(position, 'e1', 'e2', 'wk')).toBe(true);
      expect(rules.isLegalMove(position, 'e1', 'f2', 'wk')).toBe(true);
      expect(rules.isLegalMove(position, 'e1', 'f1', 'wk')).toBe(true);
    });

    it('prevents illegal king moves', () => {
      const position = { 'e1': 'wk' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      // More than one square
      expect(rules.isLegalMove(position, 'e1', 'e3', 'wk')).toBe(false);
      expect(rules.isLegalMove(position, 'e1', 'g1', 'wk')).toBe(false);
    });

    it('prevents a king moving next to another king', () => {
      const position = { 'e1': 'wk', 'g1': 'bk' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'e1', 'f1', 'wk')).toBe(false);
      expect(rules.isLegalMove(position, 'e1', 'f2', 'wk')).toBe(false);
    });

    it('prevents a king moving into check from a pawn', () => {
      const position = { 'g1': 'wk', 'g6': 'wp', 'h6': 'wp', 'g8': 'bk' };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'g8', 'f7', 'bk')).toBe(false);
    });

    it('allows kingside castling', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'e8': 'bk',
        'h8': 'br'
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'e1', 'g1', 'wk')).toBe(true);
      expect(rules.isLegalMove(position, 'e8', 'g8', 'bk')).toBe(true);
    });

    it('allows queenside castling', () => {
      const position = {
        'e1': 'wk',
        'a1': 'wr',
        'e8': 'bk',
        'a8': 'br'
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'e1', 'c1', 'wk')).toBe(true);
      expect(rules.isLegalMove(position, 'e8', 'c8', 'bk')).toBe(true);
    });

    it('prevents castling through pieces', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'f1': 'wb'  // Piece blocking kingside castle
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);

      expect(rules.isLegalMove(position, 'e1', 'g1', 'wk')).toBe(false);
    });

    it('prevents castling while in check', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'e8': 'br'  // Black rook giving check
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);
      rules.setCurrentState('d6', 'KQkq');

      expect(rules.isLegalMove(position, 'e1', 'g1', 'wk')).toBe(false);
    });

    it('prevents castling through check', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr',
        'e8': 'br',  // Black rook controlling f1
        'h8': 'bk'
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);
      rules.setCurrentState('d6', 'KQkq');

      expect(rules.isLegalMove(position, 'e1', 'g1', 'wk')).toBe(false);
    });

    it('prevents castling when castling rights are lost', () => {
      const position = {
        'e1': 'wk',
        'h1': 'wr'
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);
      rules.setCurrentState('-', '');

      // No castling rights
      expect(rules.isLegalMove(position, 'e1', 'g1', 'wk')).toBe(false);

      const rules2 = new ChessRules(Fen);
      rules2.setCurrentState('-', 'Q');
      // Only queenside castling rights
      expect(rules2.isLegalMove(position, 'e1', 'g1', 'wk')).toBe(false);
    });

    it('allows normal king moves even after losing castling rights', () => {
      const position = {
        'e1': 'wk'
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);
      rules.setCurrentState('-', '');

      // Should be able to move one square even without castling rights
      expect(rules.isLegalMove(position, 'e1', 'e2', 'wk')).toBe(true);
    });

    it('prevents moving into check', () => {
      const position = {
        'f1': 'wk',
        'e8': 'br'  // Black rook controlling e-file
      };
      const fen = Fen.objToFen(position);
      const rules = new ChessRules(Fen);
      rules.setCurrentState('d6', 'KQkq');

      expect(rules.isLegalMove(position, 'f1', 'e2', 'wk')).toBe(false);
    });

    it ('allows the king to move out of check', () => {
      const fen = '8/pppk1p2/8/2P3p1/P1P5/2K1n1P1/3R4/1r6 b KQ - 0 33';
      const position = Fen.fenToObj(fen);
      const rules = new ChessRules(Fen);
      rules.setCurrentState('d6', 'KQkq');

      expect(rules.isLegalMove(position, 'd7', 'c6', 'bk')).toBe(true);
    });
  });

  describe('Game ending conditions', () => {
    describe('Checkmate', () => {
      it('detects scholar\'s mate', () => {
        const fen = 'r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4';
        const rules = new ChessRules(Fen);

        expect(rules.isCheckmate(fen, false)).toBe(true);
      });

      it('detects simple mate in the corner', () => {
        const fen = '8/8/1p6/1P5p/7P/8/1QK3P1/k7 b - - 5 56';
        const rules = new ChessRules(Fen);

        expect(rules.isCheckmate(fen, false)).toBe(true);
      });

      it('recognizes it is possible to move out of check', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'h5': 'wq'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isLegalMove(position, 'e8', 'e7', 'bk')).toBe(true);
      });

      it('recognizes check is not checkmate', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'h5': 'wq'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isCheckmate(fen, false)).toBe(false);
      });

      it('detects a checkmate with queen and pawns', () => {
        const fen = '3Q2k1/8/1P4PP/8/8/8/8/3b2K1 b - - 2 51';
        const rules = new ChessRules(Fen);

        expect(rules.isCheckmate(fen, false)).toBe(true);
      });

      it('detects a checkmate with queen and pawns', () => {
        const fen = '3Q2k1/8/1P4PP/8/8/8/8/3b2K1 b - - 2 51';
        const rules = new ChessRules(Fen);

        expect(rules.isCheckmate(fen, false)).toBe(true);
      });
    });

    describe('Stalemate', () => {
      it('detects basic stalemate', () => {
        const position = {
          'h8': 'wk',
          'f8': 'bk',
          'g6': 'bq'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isStalemate(fen, true)).toBe(true);
      });

      it('recognizes non-stalemate position', () => {
        const position = {
          'h8': 'wk',
          'f8': 'bk',
          'g5': 'bq'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isStalemate(fen, false)).toBe(false);
      });
    });

    describe('Insufficient Material', () => {
      it('recognizes king vs king', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isInsufficientMaterial(fen)).toBe(true);
      });

      it('recognizes king and bishop vs king', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wb'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isInsufficientMaterial(fen)).toBe(true);
      });

      it('recognizes king and knight vs king', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wn'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isInsufficientMaterial(fen)).toBe(true);
      });

      it('recognizes king and bishop vs king and bishop (same colored squares)', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wb', // light square bishop
          'f8': 'bb'  // light square bishop
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isInsufficientMaterial(fen)).toBe(true);
      });

      it('recognizes sufficient material with opposite colored bishops', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'c1': 'wb', // light square bishop
          'c8': 'bb'  // dark square bishop
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isInsufficientMaterial(fen)).toBe(false);
      });

      it('recognizes sufficient material with pawns', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'e2': 'wp'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isInsufficientMaterial(fen)).toBe(false);
      });

      it('recognizes sufficient material with two knights', () => {
        const position = {
          'e1': 'wk',
          'e8': 'bk',
          'b1': 'wn',
          'g1': 'wn'
        };
        const fen = Fen.objToFen(position);
        const rules = new ChessRules(Fen);

        expect(rules.isInsufficientMaterial(fen)).toBe(false);
      });
    });
  });

  describe('Possible target squares', () => {
    describe('possibleTargetSquaresForPawn', () => {
      let rules;

      beforeEach(() => {
        rules = new ChessRules(Fen);
      });

      it('returns correct squares for white pawn on starting rank', () => {
        const squares = rules.possibleTargetSquaresForPawn('e2', true);
        expect(squares).toEqual(['e3', 'e4', 'd3', 'f3']);
      });

      it('returns correct squares for black pawn on starting rank', () => {
        const squares = rules.possibleTargetSquaresForPawn('e7', false);
        expect(squares).toEqual(['e6', 'e5', 'd6', 'f6']);
      });

      it('returns correct squares for white pawn not on starting rank', () => {
        const squares = rules.possibleTargetSquaresForPawn('e3', true);
        expect(squares).toEqual(['e4', 'd4', 'f4']);
      });

      it('returns correct squares for black pawn not on starting rank', () => {
        const squares = rules.possibleTargetSquaresForPawn('e6', false);
        expect(squares).toEqual(['e5', 'd5', 'f5']);
      });
    });

    describe('possibleTargetSquaresForKnight', () => {
      let rules;

      beforeEach(() => {
        rules = new ChessRules(Fen);
      });

      it('returns all eight squares for knight in center', () => {
        const squares = rules.possibleTargetSquaresForKnight('e4');
        expect(squares).toEqual(['g5', 'g3', 'c5', 'c3', 'f6', 'f2', 'd6', 'd2']);
      });

      it('returns correct squares for knight on edge', () => {
        const squares = rules.possibleTargetSquaresForKnight('a1');
        expect(squares).toEqual(['c2', 'b3']);
      });
    });

    describe('possibleTargetSquaresForKing', () => {
      let rules;

      beforeEach(() => {
        rules = new ChessRules(Fen);
      });

      it('returns all squares for king in center', () => {
        const squares = rules.possibleTargetSquaresForKing('e4');
        expect(squares).toContain('d3');
        expect(squares).toContain('d4');
        expect(squares).toContain('d5');
        expect(squares).toContain('e3');
        expect(squares).toContain('e5');
        expect(squares).toContain('f3');
        expect(squares).toContain('f4');
        expect(squares).toContain('f5');
        expect(squares).toHaveLength(10); // 8 adjacent squares + 2 castling squares
      });

      it('returns correct squares for king on edge', () => {
        const squares = rules.possibleTargetSquaresForKing('a1');
        expect(squares).toContain('a2');
        expect(squares).toContain('b1');
        expect(squares).toContain('b2');
        expect(squares).toContain('c1');
        expect(squares).toContain('g1');
        expect(squares).toHaveLength(5); // 3 adjacent squares + 2 castling squares
      });
    });

    describe('possibleTargetSquaresForBishop', () => {
      let rules;

      beforeEach(() => {
        rules = new ChessRules(Fen);
      });

      it('returns all diagonal squares for bishop in center', () => {
        const squares = rules.possibleTargetSquaresForBishop('e4');
        // Check some key squares in each diagonal
        expect(squares).toContain('f5');
        expect(squares).toContain('g6');
        expect(squares).toContain('h7');
        expect(squares).toContain('d3');
        expect(squares).toContain('c2');
        expect(squares).toContain('b1');
        expect(squares).toContain('f3');
        expect(squares).toContain('g2');
        expect(squares).toContain('h1');
        expect(squares).toContain('d5');
        expect(squares).toContain('c6');
        expect(squares).toContain('b7');
        expect(squares).toContain('a8');
      });

      it('returns correct squares for bishop in corner', () => {
        const squares = rules.possibleTargetSquaresForBishop('a1');
        expect(squares).toContain('b2');
        expect(squares).toContain('c3');
        expect(squares).toContain('d4');
        expect(squares).toContain('e5');
        expect(squares).toContain('f6');
        expect(squares).toContain('g7');
        expect(squares).toContain('h8');
      });
    });

    describe('possibleTargetSquaresForRook', () => {
      let rules;

      beforeEach(() => {
        rules = new ChessRules(Fen);
      });

      it('returns all straight squares for rook in center', () => {
        const squares = rules.possibleTargetSquaresForRook('e4');
        // Check some key squares in each direction
        ['e1', 'e2', 'e3', 'e5', 'e6', 'e7', 'e8'].forEach(square => {
          expect(squares).toContain(square);
        });
        ['a4', 'b4', 'c4', 'd4', 'f4', 'g4', 'h4'].forEach(square => {
          expect(squares).toContain(square);
        });
      });

      it('returns correct squares for rook in corner', () => {
        const squares = rules.possibleTargetSquaresForRook('a1');
        // Check vertical squares
        ['a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'].forEach(square => {
          expect(squares).toContain(square);
        });
        // Check horizontal squares
        ['b1', 'c1', 'd1', 'e1', 'f1', 'g1', 'h1'].forEach(square => {
          expect(squares).toContain(square);
        });
      });
    });

    describe('possibleTargetSquaresForQueen', () => {
      let rules;

      beforeEach(() => {
        rules = new ChessRules(Fen);
      });

      it('returns all possible squares for queen in center', () => {
        const squares = rules.possibleTargetSquaresForQueen('e4');
        const bishopSquares = rules.possibleTargetSquaresForBishop('e4');
        const rookSquares = rules.possibleTargetSquaresForRook('e4');

        // Queen moves should be union of bishop and rook moves
        bishopSquares.forEach(square => {
          expect(squares).toContain(square);
        });
        rookSquares.forEach(square => {
          expect(squares).toContain(square);
        });
        expect(squares.length).toBe(new Set([...bishopSquares, ...rookSquares]).size);
      });

      it('returns correct squares for queen in corner', () => {
        const squares = rules.possibleTargetSquaresForQueen('a1');
        const bishopSquares = rules.possibleTargetSquaresForBishop('a1');
        const rookSquares = rules.possibleTargetSquaresForRook('a1');

        bishopSquares.forEach(square => {
          expect(squares).toContain(square);
        });
        rookSquares.forEach(square => {
          expect(squares).toContain(square);
        });
        expect(squares.length).toBe(new Set([...bishopSquares, ...rookSquares]).size);
      });
    });
  });
});
