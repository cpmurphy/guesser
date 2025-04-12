export default class GameState {
    constructor(fen, ChessRules, Fen) {
      const fenParts = fen.split(' ');
      this.castlingRightsHistory = new Map();
      this.enPassantHistory = [];
      this.castlingRights = fenParts[2];
      this.enPassant = fenParts[3];
      this.halfmoveClock = parseInt(fenParts[4]);
      this.changeIndex = 0;
      this.startingWholeMove = parseInt(fenParts[5]);
      this.sideWithFirstMove = this.extractSideFromFen(fen);
      this.chessRules = new ChessRules(Fen);
      this.Fen = Fen;
      this.chessRules.setCurrentState(this.enPassant, this.castlingRights);
    }

    update(piece, from, to, capturedPiece) {
      if (piece.toLowerCase() === "k") {
        this.removeCastlingRights(piece);
      } else if (piece.toLowerCase() === "r") {
        this.updateCastlingRights(piece, from);
      }
      this.updateEnPassant(piece, from, to);
      if (piece.toLowerCase() === "p" || capturedPiece) {
        this.halfmoveClock = 0;
      } else {
        this.halfmoveClock++;
      }
      this.changeIndex++;
    }

    updateForPassingMove() {
      this.halfmoveClock++;
      this.changeIndex++;
    }

    stringForFen() {
      if (this.castlingRights === '') {
        this.castlingRights = '-';
      }
      return `${this.castlingRights} ${this.enPassant} ${this.halfmoveClock}`;
    }

    generateCompleteFen(partialFen, moveIndex) {
      const activeColor = this.isWhiteToMove(moveIndex) ? 'w' : 'b';
      // Calculate the full move number
      const fullmoveNumber = Math.floor(moveIndex / 2) + this.startingWholeMove;
      return `${partialFen} ${activeColor} ${this.stringForFen()} ${fullmoveNumber}`;
    }

    updateEnPassant(piece, from, to) {
      if (piece.toLowerCase() !== 'p') {
        this.enPassant = '-';
      } else {
        const fromRank = parseInt(from[1]);
        const toRank = parseInt(to[1]);
        if (Math.abs(toRank - fromRank) === 2) {
          // Set the en passant square to the square the pawn passed through
          const file = from[0];
          const middleRank = (fromRank + toRank) / 2;
          this.enPassant = file + middleRank;
          this.enPassantHistory[this.changeIndex+1] = this.enPassant;
        }
      }
    }

    rewind() {
      if (this.changeIndex > 0) {
        this.changeIndex--;
      }
      if (this.halfmoveClock > 0) {
        this.halfmoveClock--;
      }
      if (this.castlingRightsHistory.has(this.changeIndex)) {
        this.castlingRights = this.castlingRightsHistory.get(this.changeIndex);
      }
      if (this.enPassantHistory[this.changeIndex]) {
        this.enPassant = this.enPassantHistory[this.changeIndex];
      } else {
        this.enPassant = '-';
      }
    }

    removeCastlingRights(piece) {
      const whiteToMove = this.isWhiteToMove(this.changeIndex);
      if (whiteToMove && piece.toLowerCase() === "k" && this.castlingRights.match(/[KQ]/)) {
        this.castlingRightsHistory.set(this.changeIndex, this.castlingRights);
        this.castlingRights = this.castlingRights.replaceAll(/[KQ]/g, '');
      } else if (!whiteToMove && piece.toLowerCase() === "k" && this.castlingRights.match(/[kq]/)) {
        this.castlingRightsHistory.set(this.changeIndex, this.castlingRights);
        this.castlingRights = this.castlingRights.replaceAll(/[kq]/g, '');
      }
    }

    updateCastlingRights(piece, from) {
      const whiteToMove = this.isWhiteToMove(this.changeIndex);
      if (whiteToMove && piece.toLowerCase() === "r") {
        if (from === 'a1' && this.castlingRights.match(/Q/)) {
          this.castlingRightsHistory.set(this.changeIndex, this.castlingRights);
          this.castlingRights = this.castlingRights.replace('Q', '');
        } else if (from === 'h1' && this.castlingRights.match(/K/)) {
          this.castlingRightsHistory.set(this.changeIndex, this.castlingRights);
          this.castlingRights = this.castlingRights.replace('K', '');
        }
      } else if (!whiteToMove && piece.toLowerCase() === "r") {
        if (from === 'a8' && !this.castlingRights.match(/q/)) {
          this.castlingRightsHistory.set(this.changeIndex, this.castlingRights);
          this.castlingRights = this.castlingRights.replace('q', '');
        } else if (from === 'h8' && !this.castlingRights.match(/k/)) {
          this.castlingRightsHistory.set(this.changeIndex, this.castlingRights);
          this.castlingRights = this.castlingRights.replace('k', '');
        }
      }
    }

    extractSideFromFen(fen) {
      if (fen) {
        return fen.split(' ')[1].toLowerCase() == 'w' ? 'white' : 'black';
      }
      return 'white';
    }

    isWhiteToMove(moveIndex) {
      const isFirstMoveWhite = this.sideWithFirstMove === 'white';
      return (moveIndex % 2 === 0) === isFirstMoveWhite;
    }

    isPawnPromotion(to, piece) {
      if (piece.toLowerCase() !== 'p') return false;
      const targetRank = to[1];
      return targetRank === '8' || targetRank === '1';
    }
  
    isCastling(piece, source, target) {
      const kingside = (piece.toLowerCase() === 'k' && source === 'e1' && target === 'g1') ||
        (piece.toLowerCase() === 'k' && source === 'e8' && target === 'g8');
      const queenside = (piece.toLowerCase() === 'k' && source === 'e1' && target === 'c1') ||
        (piece.toLowerCase() === 'k' && source === 'e8' && target === 'c8');
      return kingside || queenside;
    }

    isGameTerminated(fen, moveIndex) {
      this.chessRules.setCurrentState(this.enPassant, this.castlingRights);
      if (!fen) {
        return false;
      }

      const isWhite = this.isWhiteToMove(moveIndex);
      if (this.chessRules.isCheckmate(fen, isWhite)) {
        return true;
      }

      if (this.chessRules.isStalemate(fen, isWhite)) {
        return true;
      }

      if (this.chessRules.isInsufficientMaterial(fen)) {
        return true;
      }

      if (this.halfMoveClock >= 99) { // 50 moves = 100 half moves
        return true;
      }

      return false;
    }

    isLegalMove(fen, from, to, piece) {
      this.chessRules.setCurrentState(this.enPassant, this.castlingRights);
      return this.chessRules.isLegalMoveWithFen(fen, from, to, piece);
    }

    isCheckmate(fen, moveIndex) {
      const isWhite = this.isWhiteToMove(moveIndex);
      this.chessRules.setCurrentState(this.enPassant, this.castlingRights);
      return this.chessRules.isCheckmate(fen, isWhite);
    }

}
