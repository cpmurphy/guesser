import { vi } from 'vitest';

export const INPUT_EVENT_TYPE = {
    moveStart: 'moveStart',
    moveDone: 'moveDone',
    moveCanceled: 'moveCanceled',
    moveInputStarted: 'moveInputStarted',
    validateMoveInput: 'validateMoveInput'
  };
  
  export const PIECE = {
    wp: "wp", wb: "wb", wn: "wn", wr: "wr", wq: "wq", wk: "wk",
    bp: "bp", bb: "bb", bn: "bn", br: "br", bq: "bq", bk: "bk"
  }

  export const COLOR = {
    white: 'w',
    black: 'b'
  };
  
  export class Chessboard {
    constructor(element, config) {
      this._position = config.position || '';
      this._orientation = COLOR.white;
      this._moveInputCallback = null;
      
      // Add spies for testing
      this.setPosition = vi.fn().mockImplementation((fen) => {
        this._position = fen;
        return true;
      });
      
      this.getPosition = vi.fn().mockImplementation(() => {
        return this._position;
      });
      
      this.movePiece = vi.fn().mockReturnValue(true);
      
      this.setPiece = vi.fn().mockReturnValue(true);

      this.getPiece = vi.fn().mockReturnValue('wp');
      
      this.enableMoveInput = vi.fn().mockImplementation((callback, color) => {
        this._moveInputCallback = callback;
        return true;
      });
      
      this.disableMoveInput = vi.fn().mockReturnValue(true);
      
      this.setOrientation = vi.fn().mockImplementation((color) => {
        this._orientation = color;
        return true;
      });
      
      this.getOrientation = vi.fn().mockImplementation(() => {
        return this._orientation;
      });
    }
  
    // Helper method for tests to simulate moves
    simulateMove(from, to) {
      if (!this._moveInputCallback) return false;
      
      // Simulate moveInputStarted event
      const startResult = this._moveInputCallback({
        type: INPUT_EVENT_TYPE.moveInputStarted,
        square: from
      });
      
      if (!startResult) return false;
      
      // Simulate validateMoveInput event
      return this._moveInputCallback({
        type: INPUT_EVENT_TYPE.validateMoveInput,
        squareFrom: from,
        squareTo: to
      });
    }
  }