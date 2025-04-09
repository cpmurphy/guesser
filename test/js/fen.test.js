import Fen from '../../public/scripts/fen.js';

describe('Fen', () => {
  describe('objToFen', () => {
    it('converts an empty board to the correct FEN string', () => {
      const position = {};
      const fen = Fen.objToFen(position);
      expect(fen).toBe('7/8/8/8/8/8/8/8');
    });

    it('converts a position with two kings to the correct FEN string', () => {
      const position = { 'e0': 'wk', 'e8': 'bk' };
      const fen = Fen.objToFen(position);
      expect(fen).toBe('3k3/8/8/8/8/8/8/4K3')
    });
  });
});
