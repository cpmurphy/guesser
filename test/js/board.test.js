import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Board from '../../public/scripts/board.js';
import { Chessboard } from './__mocks__/cm-chessboard.js';

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
      const chessboard = new Chessboard('element', {});
      board = new Board(data, chessboard);

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
      const chessboard = new Chessboard('element', {});
      board = new Board(data, chessboard);

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
      const chessboard = new Chessboard('element', {});
      board = new Board(data, chessboard);

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
      const chessboard = new Chessboard('element', {});
      board = new Board(data, chessboard);

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
      const chessboard = new Chessboard('element', { position: data.fen });
      board = new Board(data, chessboard);

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
      const chessboard = new Chessboard('element', {});
      board = new Board(data, chessboard);

      expect(board.currentMoveIndex).toBe(3);
      board.moveBackward();
      board.moveBackward();
      expect(board.currentMoveIndex).toBe(1);
      board.updateLastMoveDisplay();
      expect(document.getElementById('last-move').textContent).toBe('1. e4');
    });
  });

  describe('initializeGuessMode', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <input type="radio" name="guess_mode" value="white">
        <input type="radio" name="guess_mode" value="black">
        <input type="radio" name="guess_mode" value="both">
      `;
    });

    it('sets correct guess mode when starting mid-game with black to move', () => {
      const data = createGameData({
        currentWholeMove: 15,
        sideToMove: 'black',
        fen: 'r1bk3r/pppp2bp/2n5/4p2q/2BP1pNP/2P5/PP4P1/2BQ2KR b - - 0 15'
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      const blackRadio = document.querySelector('input[name="guess_mode"][value="black"]');
      expect(blackRadio.checked).toBe(true);
    });

    it('sets correct guess mode when starting mid-game with white to move', () => {
      const data = createGameData({
        currentWholeMove: 15,
        sideToMove: 'white',
        fen: 'r1bk3r/pppp2bp/2n5/4p2q/2BP1pNP/2P5/PP4P1/2BQ2KR w - - 0 15'
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      const whiteRadio = document.querySelector('input[name="guess_mode"][value="white"]');
      expect(whiteRadio.checked).toBe(true);
    });

    it('does not change guess mode when starting from move 1', () => {
      const whiteRadio = document.querySelector('input[name="guess_mode"][value="white"]');
      whiteRadio.checked = true;

      const data = createGameData({
        currentWholeMove: 1,
        sideToMove: 'white'
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      expect(whiteRadio.checked).toBe(true);
    });
  });

  describe('handleCorrectGuess', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <input type="radio" name="guess_mode" value="white">
        <input type="radio" name="guess_mode" value="black">
        <input type="radio" name="guess_mode" value="both">
      `;

      // Mock setTimeout
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-plays opponent move when guessing as white only', () => {
      const data = createGameData({
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [
          {"moves":["e2-e4"]},
          {"moves":["e7-e5"]},
          {"moves":["g1-f3"]}
        ]
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      document.querySelector('input[value="white"]').checked = true;

      const moveForwardSpy = vi.spyOn(board, 'moveForward');

      board.handleCorrectGuess(data.uiMoves[0]);
      vi.runAllTimers();

      expect(moveForwardSpy).toHaveBeenCalled();
      expect(board.currentMoveIndex).toBe(2); // Should have moved forward twice
    });

    it('auto-plays opponent move when guessing as black only', () => {
      const data = createGameData({
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [
          {"moves":["e2-e4"]},
          {"moves":["e7-e5"]},
          {"moves":["g1-f3"]},
          {"moves":["b8-c6"]}
        ],
        sideToMove: 'black'
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      document.querySelector('input[value="black"]').checked = true;

      const moveForwardSpy = vi.spyOn(board, 'moveForward');

      board.moveForward(); // play White's move first
      board.handleCorrectGuess(data.uiMoves[1]);
      vi.runAllTimers();

      expect(moveForwardSpy).toHaveBeenCalled();
      expect(board.currentMoveIndex).toBe(3); // Should have moved forward twice
    });

    it('does not auto-play opponent move when guessing both sides', () => {
      const data = createGameData({
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [
          {"moves":["e2-e4"]},
          {"moves":["e7-e5"]},
          {"moves":["g1-f3"]}
        ]
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      document.querySelector('input[value="both"]').checked = true;

      const moveForwardSpy = vi.spyOn(board, 'moveForward');

      board.handleCorrectGuess(data.uiMoves[0]);
      vi.runAllTimers();

      expect(moveForwardSpy).not.toHaveBeenCalled();
      expect(board.currentMoveIndex).toBe(1); // Should have moved forward only once
    });
  });

  describe('submitGuess', () => {
    it('removes the captured pawn after a correct en-passant move', () => {
      const data = createGameData({
        uiMoves: [{'moves':['e2-e4']},{'moves':['c7-c5']},{'moves':['e4-e5']},{'moves':['f7-f5']},{'moves':['e5-f6'],'remove':['p','f5']}],
        moves: ['e4','c5','e5','f5','exf6']
      });
      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      for (let i = 0; i < 4; i++) {
        board.moveForward();
      }
      board.submitGuess('e5', 'f6', 'wp', null, 'rnbqkbnr/pp1pp1pp/8/2p1Pp2/8/8/PPPP1PPP/RNBQKBNR');
      expect(board.board.getPiece('f5')).toBeNull();
    });
  });

  describe('handleGuessResult', () => {
    beforeEach(() => {
      document.body.innerHTML += `
        <input type="radio" name="guess_mode" value="white">
        <input type="radio" name="guess_mode" value="black">
        <input type="radio" name="guess_mode" value="both">
      `;

      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('auto-plays opponent move when guessing as white only', () => {
      const data = createGameData({
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [
          {"moves":["e2-e4"]},
          {"moves":["e7-e5"]},
          {"moves":["g1-f3"]}
        ]
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      document.querySelector('input[value="white"]').checked = true;

      const moveForwardSpy = vi.spyOn(board, 'moveForward');

      board.handleGuessResult([{
        "result": "correct",
        "same_as_game": false,
        "game_move": data.uiMoves[0],
        "best_eval": {
          "score": 26,
          "move": "e2e4",
          "variation": [ "c7c5", "c2c3" ]
        },
        "game_eval": {
          "best_eval": {
            "score": 26,
            "move": "e2e4",
            "variation": [ "c7c5", "c2c3" ]
          }
        },
        "guess_eval": {
          "score": 29,
          "move": "c7c5",
          "variation": [ "c2c3", "b8c6" ]
        }
      },
      {
        "result": "auto_move",
        "fen": "rnbqkbnr/pppppp1p/6p1/8/2P5/8/PP1PPPPP/RNBQKBNR w KQkq - 0 2",
        "move": "g6",
        "move_number": 3,
        "total_moves": 96
      }
      ]);
      vi.runAllTimers();
      expect(board.currentMoveIndex).toBe(2); // Should have moved forward twice
    });

    it('auto-plays opponent move when guessing as black only', () => {
      const data = createGameData({
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [
          {"moves":["e2-e4"]},
          {"moves":["e7-e5"]},
          {"moves":["g1-f3"]}
        ],
        sideToMove: 'black'
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      document.querySelector('input[value="black"]').checked = true;
      board.moveForward(); // Play white's first move

      const moveForwardSpy = vi.spyOn(board, 'moveForward');

      board.handleGuessResult([
        {
          "result": "correct",
          "same_as_game": false,
          "game_move": "e5",
          "best_eval": {
            "score": -27,
            "move": "e7e5",
            "variation": [ "g1f3", "b8c6" ]
          },
          "guess_eval": {
            "score": -46,
            "move": "d2d4",
            "variation": [ "d7d5", "e4e5" ]
          },
          "game_eval": {
            "score": -25,
            "move": "g1f3",
            "variation": [ "b8c6", "f1b5" ]
          },
          "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
          "move": "e5",
          "move_number": 3,
          "total_moves": 53
        },
        {
          "result": "auto_move",
          "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
          "move": "Nf3",
          "move_number": 4,
          "total_moves": 53
        }
      ]);
      vi.runAllTimers();

      expect(moveForwardSpy).toHaveBeenCalledTimes(2);
      expect(board.currentMoveIndex).toBe(3); // Should have moved forward twice
    });

    it('does not auto-play opponent move when guessing both sides', () => {
      const data = createGameData({
        moves: ['e4', 'e5', 'Nf3'],
        uiMoves: [
          {"moves":["e2-e4"]},
          {"moves":["e7-e5"]},
          {"moves":["g1-f3"]}
        ]
      });

      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      document.querySelector('input[value="both"]').checked = true;

      const moveForwardSpy = vi.spyOn(board, 'moveForward');

      board.moveForward(); // Play White's first move
      // Now handle a guess of Black's first move
      board.handleGuessResult([
        {
          "result": "correct",
          "same_as_game": false,
          "game_move": "e5",
          "best_eval": {
            "score": -24,
            "move": "e7e5",
            "variation": [ "g1f3", "b8c6" ]
          },
          "guess_eval": {
            "score": -50,
            "move": "d2d4",
            "variation": [ "d7d5", "e4e5" ]
          },
          "game_eval": {
            "score": -24,
            "move": "g1f3",
            "variation": [ "b8c6", "f1b5" ]
          },
          "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2",
          "move": "e5",
          "move_number": 3,
          "total_moves": 53
        },
        {
          "result": "auto_move",
          "fen": "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2",
          "move": "Nf3",
          "move_number": 4,
          "total_moves": 53
        }
      ]);
      vi.runAllTimers();

      expect(moveForwardSpy).toHaveBeenCalledTimes(2);
      expect(board.currentMoveIndex).toBe(2); // Should have moved forward only one move -- White's second move
    });

    it('updates the last move after a good guess', () => {
      document.querySelector('input[value="both"]').checked = true;
      const data = createGameData({
        moves: ['e4', 'c5', 'Nf3'],
        uiMoves: [
          {moves:['e2-e4']},
          {moves:['c7-c5']},
          {moves:['g1-f3']}
        ]
      });
      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      board.moveForward();
      board.handleGuessResult([
        {
          result: 'correct',
          same_as_game: false,
          game_move: 'c5',
          best_eval: {'score':-28,'move':'e7e5','variation':['g1f3','b8c6']},
          guess_eval: {'score':-31,'move':'g1f3','variation':['b8c6','f1c4']},
          game_eval: {'score':-26,'move':'g1f3','variation':['b8c6','f1b5']},
          fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2',
          move: 'c5',
          move_number: 3,
          total_moves: 16
        },
        {
          result: 'auto_move',
          fen: 'rnbqkbnr/pp1ppppp/8/2p1P3/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2',
          move: 'e5',
          move_number: 4,
          total_moves: 16
        }
      ]);
      expect(board.lastMoveElement.textContent).toBe('1... c5');
      expect(board.currentMoveIndex).toBe(2);
      expect(board.isWhiteToMove(board.currentMoveIndex)).toBe(true);
    });
  });

  describe('promotion', () => {
    it('correctly handles the promotion of a black pawn', () => {
      const data = createGameData({
        fen: '8/8/8/8/8/8/2pk1K2/8 b - - 0 1',
        uiMoves: [{"moves":["c2-c1"],"add":["Q","c1"]}],
        moves: ["c1=Q"],
        startingWholeMove: 1,
        currentWholeMove: 1,
        sideToMove: 'black',
      });
      const chessboard = new Chessboard('element', {});
      const board = new Board(data, chessboard);
      board.moveForward();
      expect(board.board.getPiece('c2')).toBe(null);
      expect(board.board.getPiece('c1')).toBe('bq');
      board.moveBackward();
      expect(board.board.getPiece('c1')).toBe(null);
      expect(board.board.getPiece('c2')).toBe('bp');
    });
  });

});