import { describe, it, expect } from 'vitest';
import Board from '../../public/scripts/board.js';

// Mock Chessboard.js
global.Chessboard = function(elementId, config) {
  // Return an instance of our mock chess board
  return {
    elementId,
    config,
    position: function(fen, useAnimation) {
      return {};
    },
    move: function(move) {},
    flip: function() {},
    orientation: function() {
      return 'white';
    },
    fen: function() {
      return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
    }
  };
};

// Add the static method
global.Chessboard.objToFen = function(obj) {
  return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
};

// Helper to create a minimal data object that Board needs
function createGameData(options = {}) {
  return {
    moves: options.moves || [],
    uiMoves: options.uiMoves || [],
    startingWholeMove: options.startingWholeMove || 1,
    currentWholeMove: options.currentWholeMove || 1,
    sideToMove: options.sideToMove || 'white',
    fen: options.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    gameResult: options.gameResult || null,
    white: options.white || 'Player 1',
    black: options.black || 'Player 2'
  };
}

describe('Board', () => {
  let board;

  beforeEach(() => {
    // Mock DOM elements that Board expects
    document.body.innerHTML = `
      <div id="board"></div>
      <div id="last-move"></div>
      <div id="move-input"></div>
      <div id="white"></div>
      <div id="black"></div>
      <button id="flipBoardBtn"></button>
      <button id="exportFenBtn"></button>
      <button id="backwardBtn"></button>
      <button id="forwardBtn"></button>
      <button id="fastRewindBtn"></button>
      <button id="fastForwardBtn"></button>
      <div id="guess_result"></div>
      <div id="guess_comment"></div>
      <div id="guess_subcomment"></div>
    `;
  });

  describe('isWhiteToMove', () => {
    it('handles a normal game starting with white', () => {
      const data = createGameData({
        sideToMove: 'white',
        startingWholeMove: 1,
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [{"moves":["e2-e4"]},{"moves":["e7-e5"]},{"moves":["g1-f3"]}]
      });
      board = new Board(data);

      expect(board.currentMoveIndex).toBe(0);
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(true);
      board.moveForward();
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(false);
      board.moveForward();
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(true);
    });

    it('handles jumping into the middle of a game with black to move', () => {
      const data = createGameData({
        startingWholeMove: 1,
        currentWholeMove: 2,
        sideToMove: 'black',
        moves: ['e4', 'e5', 'Nf3', 'Nc6'],
        uiMoves: [{"moves":["e2-e4"]},{"moves":["e7-e5"]},{"moves":["g1-f3"]},{"moves":["b8-c6"]}]
      });
      board = new Board(data);

      expect(board.currentMoveIndex).toBe(3);
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(false);
      board.moveForward();
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(true);
    });

    it('handles a game that starts with black to move', () => {
      const data = createGameData({
        uiMoves: [{"moves":["f8-c5"]},{"moves":["c2-c3"]},{"moves":["g8-f6"]}],
        moves: ["Bc5","c3","Nf6"],
        startingWholeMove: 3,
        currentWholeMove: 3,
        sideToMove: 'black',
        fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      });
      board = new Board(data);

      expect(board.currentMoveIndex).toBe(0);
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(false);
      board.moveForward();
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(true);
      board.moveForward();
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(false);
    });
  });

  describe('updateLastMoveDisplay', () => {
    it('handles a normal game starting with white', () => {
      const data = createGameData({
        sideToMove: 'white',
        startingWholeMove: 1,
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [{"moves":["e2-e4"]},{"moves":["e7-e5"]},{"moves":["g1-f3"]}]
      });
      board = new Board(data);

      board.moveForward();
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('1. e4');

      board.moveForward();
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('1... e5');

      board.moveForward();
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('2. Nf3');
    });

    it('handles a game starting with black at move 15', () => {
      const data = createGameData({
        uiMoves: [{"moves":["d7-d6"]},{"moves":["c4-e2"]},{"moves":["h5-e8"]}],
        moves: ["d6","Be2","Qe8"],
        startingWholeMove: 15,
        currentWholeMove: 15,
        sideToMove: 'black',
        fen: 'r1bk3r/pppp2bp/2n5/4p2q/2BP1pNP/2P5/PP4P1/2BQ2KR b - - 0 15',
      });
      board = new Board(data);

      board.moveForward();
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('15... d6');

      board.moveForward();
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('16. Be2');

      board.moveForward();
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('16... Qe8');
    });

    it('handles moving backward after jumping into the middle of a game with black to move', () => {
      const data = createGameData({
        startingWholeMove: 1,
        currentWholeMove: 2,
        sideToMove: 'black',
        moves: ['e4', 'e5', 'Nf3', 'Nc6'],
        uiMoves: [{"moves":["e2-e4"]},{"moves":["e7-e5"]},{"moves":["g1-f3"]},{"moves":["b8-c6"]}]
      });
      board = new Board(data);

      expect(board.currentMoveIndex).toBe(3);
      board.moveBackward();
      board.moveBackward();
      expect(board.currentMoveIndex).toBe(1);
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('1. e4');
    });
  });

});