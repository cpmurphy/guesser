import { describe, it, expect } from 'vitest';
import Fen from '../../public/scripts/fen.js';

describe('Fen', () => {
  describe('objToFen', () => {
    it('converts an empty board to the correct FEN string', () => {
      const position = {};
      const fen = Fen.objToFen(position);
      expect(fen).toBe('8/8/8/8/8/8/8/8');
    });

    it('converts a position with two kings to the correct FEN string', () => {
      const position = { 'e1': 'wk', 'e8': 'bk' };
      const fen = Fen.objToFen(position);
      expect(fen).toBe('4k3/8/8/8/8/8/8/4K3')
    });
  });
});
