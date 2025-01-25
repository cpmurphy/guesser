export default class GameState {
    constructor(fen) {
      const fenParts = fen.split(' ');
      this.castlingRightsHistory = [];
      this.enPassantHistory = [];
      this.castlingRights = fenParts[2];
      this.enPassant = fenParts[3];
      this.halfmoveClock = parseInt(fenParts[4]);
      this.changeIndex = 0;
    }

    update(piece, from, to, capturedPiece) {
      if (piece === "wk" || piece === "bk") {
        this.removeCastlingRights(piece);
      } else if (piece === "wr" || piece === "br") {
        this.updateCastlingRights(piece, from);
      }
      this.updateEnPassant(piece, from, to);
      if (piece === "wp" || piece === "bp" || capturedPiece) {
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

    updateEnPassant(piece, from, to) {
      if (!piece.endsWith('p')) {
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
      if (this.castlingRightsHistory[this.changeIndex]) {
        this.castlingRights = this.castlingRightsHistory[this.changeIndex];
      }
      if (this.enPassantHistory[this.changeIndex]) {
        this.enPassant = this.enPassantHistory[this.changeIndex];
      } else {
        this.enPassant = '-';
      }
    }

    removeCastlingRights(piece) {
      if (piece === "wk" && this.castlingRights.match(/[KQ]/)) {
        this.castlingRightsHistory[this.changeIndex] = this.castlingRights;
        this.castlingRights = this.castlingRights.replaceAll(/[KQ]/g, '');
      } else if (piece === "bk" && this.castlingRights.match(/[kq]/)) {
        this.castlingRightsHistory[this.changeIndex] = this.castlingRights;
        this.castlingRights = this.castlingRights.replaceAll(/[kq]/g, '');
      }
    }

    updateCastlingRights(piece, from) {
      if (piece === "wr") {
        if (from === 'a1' && this.castlingRights.match(/Q/)) {
          this.castlingRightsHistory[this.changeIndex] = this.castlingRights;
          this.castlingRights = this.castlingRights.replace('Q', '');
        } else if (from === 'h1' && this.castlingRights.match(/K/)) {
          this.castlingRightsHistory[this.changeIndex] = this.castlingRights;
          this.castlingRights = this.castlingRights.replace('K', '');
        }
      } else if (piece === "br") {
        if (from === 'a8' && !this.castlingRights.match(/q/)) {
          this.castlingRightsHistory[this.changeIndex] = this.castlingRights;
          this.castlingRights = this.castlingRights.replace('q', '');
        } else if (from === 'h8' && !this.castlingRights.match(/k/)) {
          this.castlingRightsHistory[this.changeIndex] = this.castlingRights;
          this.castlingRights = this.castlingRights.replace('k', '');
        }
      }
    }
  }
