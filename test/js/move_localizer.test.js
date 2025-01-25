import { describe, it, expect, beforeEach } from 'vitest';
import MoveLocalizer from '../../public/scripts/move_localizer.js';

describe('MoveLocalizer', () => {
  let localizer;

  describe('English notation', () => {
    beforeEach(() => {
      localizer = new MoveLocalizer('en');
    });

    it('localizes basic piece moves', () => {
      expect(localizer.localize('e4')).toBe('e4');
      expect(localizer.localize('Nf3')).toBe('Nf3');
      expect(localizer.localize('Bb5')).toBe('Bb5');
      expect(localizer.localize('Qd1')).toBe('Qd1');
      expect(localizer.localize('Ke2')).toBe('Ke2');
      expect(localizer.localize('Rad1')).toBe('Rad1');
    });

    it('localizes moves with disambiguation', () => {
      expect(localizer.localize('Nbd7')).toBe('Nbd7');  // File disambiguation
      expect(localizer.localize('N5f3')).toBe('N5f3');  // Rank disambiguation
      expect(localizer.localize('Qh4e1')).toBe('Qh4e1');  // Full square disambiguation
      expect(localizer.localize('R1a3')).toBe('R1a3');  // Rank disambiguation for rook
    });

    it('localizes special moves', () => {
      expect(localizer.localize('O-O')).toBe('O-O');
      expect(localizer.localize('O-O-O')).toBe('O-O-O');
      expect(localizer.localize('O-O+')).toBe('O-O+');
      expect(localizer.localize('O-O#')).toBe('O-O#');
      expect(localizer.localize('O-O-O+')).toBe('O-O-O+');
      expect(localizer.localize('O-O-O#')).toBe('O-O-O#');
      expect(localizer.localize('exd5')).toBe('exd5');
      expect(localizer.localize('Nxe4')).toBe('Nxe4');
      expect(localizer.localize('e8=Q')).toBe('e8=Q');
      expect(localizer.localize('e8=Q+')).toBe('e8=Q+');
      expect(localizer.localize('e8=Q#')).toBe('e8=Q#');
    });
  });

  describe('German notation', () => {
    beforeEach(() => {
      localizer = new MoveLocalizer('de');
    });

    it('localizes basic piece moves', () => {
      expect(localizer.localize('e4')).toBe('e4');
      expect(localizer.localize('Nf3')).toBe('Sf3');
      expect(localizer.localize('Bb5')).toBe('Lb5');
      expect(localizer.localize('Qd1')).toBe('Dd1');
      expect(localizer.localize('Ke2')).toBe('Ke2');
      expect(localizer.localize('Rad1')).toBe('Tad1');
    });

    it('localizes moves with disambiguation', () => {
      expect(localizer.localize('Nbd7')).toBe('Sbd7');  // File disambiguation
      expect(localizer.localize('N5f3')).toBe('S5f3');  // Rank disambiguation
      expect(localizer.localize('Qh4e1')).toBe('Dh4e1');  // Full square disambiguation
      expect(localizer.localize('R1a3')).toBe('T1a3');  // Rank disambiguation for rook
    });

    it('localizes special moves', () => {
      expect(localizer.localize('O-O')).toBe('O-O');
      expect(localizer.localize('O-O-O')).toBe('O-O-O');
      expect(localizer.localize('O-O+')).toBe('O-O+');
      expect(localizer.localize('O-O#')).toBe('O-O#');
      expect(localizer.localize('O-O-O+')).toBe('O-O-O+');
      expect(localizer.localize('O-O-O#')).toBe('O-O-O#');
      expect(localizer.localize('exd5')).toBe('exd5');
      expect(localizer.localize('Nxe4')).toBe('Sxe4');
      expect(localizer.localize('e8=Q')).toBe('e8=D');
      expect(localizer.localize('e8=Q+')).toBe('e8=D+');
      expect(localizer.localize('e8=Q#')).toBe('e8=D#');
    });
  });

  describe('Spanish notation', () => {
    beforeEach(() => {
      localizer = new MoveLocalizer('es');
    });

    it('localizes basic piece moves', () => {
      expect(localizer.localize('e4')).toBe('e4');
      expect(localizer.localize('Nf3')).toBe('Cf3');
      expect(localizer.localize('Bb5')).toBe('Ab5');
      expect(localizer.localize('Qd1')).toBe('Dd1');
      expect(localizer.localize('Ke2')).toBe('Re2');
      expect(localizer.localize('Rad1')).toBe('Tad1');
    });

    it('localizes moves with disambiguation', () => {
      expect(localizer.localize('Nbd7')).toBe('Cbd7');  // File disambiguation
      expect(localizer.localize('N5f3')).toBe('C5f3');  // Rank disambiguation
      expect(localizer.localize('Qh4e1')).toBe('Dh4e1');  // Full square disambiguation
      expect(localizer.localize('R1a3')).toBe('T1a3');  // Rank disambiguation for rook
    });

    it('localizes special moves', () => {
      expect(localizer.localize('O-O')).toBe('O-O');
      expect(localizer.localize('O-O-O')).toBe('O-O-O');
      expect(localizer.localize('O-O+')).toBe('O-O+');
      expect(localizer.localize('O-O#')).toBe('O-O#');
      expect(localizer.localize('O-O-O+')).toBe('O-O-O+');
      expect(localizer.localize('O-O-O#')).toBe('O-O-O#');
      expect(localizer.localize('exd5')).toBe('exd5');
      expect(localizer.localize('Nxe4')).toBe('Cxe4');
      expect(localizer.localize('e8=Q')).toBe('e8=D');
      expect(localizer.localize('e8=Q+')).toBe('e8=D+');
      expect(localizer.localize('e8=Q#')).toBe('e8=D#');
    });
  });

  describe('Russian notation', () => {
    beforeEach(() => {
      localizer = new MoveLocalizer('ru');
    });

    it('localizes basic piece moves', () => {
      expect(localizer.localize('e4')).toBe('д4');
      expect(localizer.localize('Nf3')).toBe('Ке3');
      expect(localizer.localize('Bb5')).toBe('Сб5');
      expect(localizer.localize('Qd1')).toBe('Фг1');
      expect(localizer.localize('Ke2')).toBe('Крд2');
      expect(localizer.localize('Rad1')).toBe('Лаг1');
    });

    it('localizes moves with disambiguation', () => {
      expect(localizer.localize('Nbd7')).toBe('Кбг7');  // File disambiguation
      expect(localizer.localize('N5f3')).toBe('К5е3');  // Rank disambiguation
      expect(localizer.localize('Qh4e1')).toBe('Фз4д1');  // Full square disambiguation
      expect(localizer.localize('R1a3')).toBe('Л1а3');  // Rank disambiguation for rook
    });

    it('localizes special moves', () => {
      expect(localizer.localize('O-O')).toBe('O-O');      // Kingside castling
      expect(localizer.localize('O-O-O')).toBe('O-O-O');  // Queenside castling
      expect(localizer.localize('O-O+')).toBe('O-O+');    // Kingside castling with check
      expect(localizer.localize('O-O#')).toBe('O-O#');    // Kingside castling with checkmate
      expect(localizer.localize('O-O-O+')).toBe('O-O-O+');  // Queenside castling with check
      expect(localizer.localize('O-O-O#')).toBe('O-O-O#');  // Queenside castling with checkmate
      expect(localizer.localize('exd5')).toBe('дxг5');
      expect(localizer.localize('Nxe4')).toBe('Кxд4');
      expect(localizer.localize('e8=Q')).toBe('д8=Ф');
      expect(localizer.localize('e8=Q+')).toBe('д8=Ф+');
      expect(localizer.localize('e8=Q#')).toBe('д8=Ф#');
    });

    it('handles complex combinations', () => {
      expect(localizer.localize('Nf3xd4+')).toBe('Ке3xг4+');  // Capture with check
      expect(localizer.localize('Bb5xc6')).toBe('Сб5xв6');    // Bishop capture
      expect(localizer.localize('Qh4xe1#')).toBe('Фз4xд1#');  // Queen capture with checkmate
    });
  });

  it('handles passing moves', () => {
    expect(localizer.localize('--')).toBe('--');
  });

});
