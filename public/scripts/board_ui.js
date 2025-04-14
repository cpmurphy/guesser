export default class BoardUi {
  constructor(chessboard, COLOR, PIECE) {
    this.board = chessboard;
    this.COLOR = COLOR;
    this.PIECE = PIECE;
  }

  flipBoard() {
    if (this.board.getOrientation() === this.COLOR.white) {
        this.board.setOrientation(this.COLOR.black);
    } else {
      this.board.setOrientation(this.COLOR.white);
    }
  }

  setPosition(fen) {
    this.board.setPosition(fen);
    this.lastPosition = fen;
  }

  saveLastPosition(fen) {
    this.lastPosition = fen;
  }

  restoreLastPosition() {
    this.board.setPosition(this.lastPosition);
  }

  getPosition() {
    return this.board.getPosition();
  }

  getPiece(square) {
    return this.board.getPiece(square);
  }

  setPiece(square, piece, animate = false) {
    this.board.setPiece(square, piece, animate);
  }

  movePiece(from, to, animate = false) {
    this.board.movePiece(from, to, animate);
  }

  performCastling(piece, target) {
    let rookSource, rookTarget;

    if (piece === this.PIECE.wk) {
      if (target === 'g1') {
        rookSource = 'h1';
        rookTarget = 'f1';
      } else if (target === 'c1') {
        rookSource = 'a1';
        rookTarget = 'd1';
      }
    } else if (piece === this.PIECE.bk) {
      if (target === 'g8') {
        rookSource = 'h8';
        rookTarget = 'f8';
      } else if (target === 'c8') {
        rookSource = 'a8';
        rookTarget = 'd8';
      }
    }

    this.board.movePiece(rookSource, rookTarget, true);
  }

  showPromotionDialog(square, color, callback) {
    this.board.showPromotionDialog(square, color, callback);
  }

  executeMove(uiMove, isWhiteToMove) {
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
        this.setPiece(uiMove.remove[1], null);
      }
      if (uiMove.add) {
        this.setPiece(uiMove.add[1], this.translatePiece(uiMove.add[0], isWhiteToMove), true);
      }
    }
  }

  reverseMove(uiMove, isWhiteToMove) {
    if (uiMove.moves && Array.isArray(uiMove.moves)) {
      if (uiMove.add) {
        // reverse the addition of the piece
        this.setPiece(uiMove.add[1], this.pawnForCurrentMove(isWhiteToMove));
      }
      uiMove.moves.forEach(m => this.board.movePiece(...m.split('-').reverse(), true));
      if (uiMove.remove) {
        // reverse the removal of the piece
        this.setPiece(uiMove.remove[1], this.translatePiece(uiMove.remove[0], !isWhiteToMove));
      }
    }
  }

  translatePiece(piece, isWhiteToMove) {
    return isWhiteToMove ? "w" + piece.toLowerCase() : "b" + piece.toLowerCase();
  }

  pawnForCurrentMove(isWhiteToMove) {
    if (isWhiteToMove) {
      return 'wp';
    } else {
      return 'bp';
    }
  }
}
