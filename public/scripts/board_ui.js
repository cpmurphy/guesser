export default class BoardUi {
  constructor(board) {
    this.board = board;
  }

  executeMove(uiMove) {
    if (!uiMove.remove && !uiMove.add) {
      uiMove.moves.forEach(m => {
        const [from, to] = m.split('-');
        this.board.movePiece(from, to, true);
      });
    } else {
      uiMove.moves.forEach(m => {
        const [from, to] = m.split('-');
        this.board.movePiece(from, to, true);
      });
      if (uiMove.remove && uiMove.remove[1] != uiMove.moves[0].substring(3, 5)) {
        this.board.setPiece(uiMove.remove[1], null);
      }
      if (uiMove.add) {
        this.board.setPiece(uiMove.add[1], this.translatePiece(uiMove.add[0]));
      }
    }
  }

  reverseMove(uiMove, isWhiteToMove) {
    if (uiMove.moves && Array.isArray(uiMove.moves)) {
      if (uiMove.add) {
        // reverse the addition of the piece
        this.board.setPiece(uiMove.add[1], this.pawnForCurrentMove(isWhiteToMove));
      }
      uiMove.moves.forEach(m => this.board.movePiece(...m.split('-').reverse(), true));
      if (uiMove.remove || uiMove.add) {
        if (uiMove.remove) {
          // reverse the removal of the piece
          this.board.setPiece(uiMove.remove[1], this.translatePiece(uiMove.remove[0]));
        }
      }
    }
  }

  translatePiece(piece) {
    if (piece.match(/^[rnbqkp]$/)) {
      return "b" + piece.toLowerCase();
    } else {
      return "w" + piece.toLowerCase();
    }
  }

  pawnForCurrentMove(isWhiteToMove) {
    if (isWhiteToMove) {
      return 'wp';
    } else {
      return 'bp';
    }
  }
}
