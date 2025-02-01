export default class ChessRules {
  constructor(fenString, enPassant, castlingRights = 'KQkq') {
    this.fenString = fenString;
    this.enPassant = enPassant;
    this.castlingRights = castlingRights;
    this.position = ChessRules.fenToObj(fenString);
    this.kingPositions = {};
  }

  findKingPosition(king) {
    if (this.kingPositions[king]) {
      return this.kingPositions[king];
    } else {
      const kingSquare = this.findKingInPosition(king, this.position);
      this.kingPositions[king] = kingSquare;
      return kingSquare;
    }
  }

  findKingInPosition(king, position) {
    let kingSquare = null;
    for (const [square, piece] of Object.entries(position)) {
      if (king === piece) {
        kingSquare = square;
        break;
      }
    }
    return kingSquare;
  }

  isLegalMove(source, target, piece, skipCheckValidation = false) {
    const pieceType = piece.charAt(1).toLowerCase();
    const isWhite = piece.charAt(0) === 'w';
    const sourceRank = parseInt(source.charAt(1));
    const targetRank = parseInt(target.charAt(1));
    const sourceFile = source.charAt(0);
    const targetFile = target.charAt(0);
    const fileDiff = Math.abs(targetFile.charCodeAt(0) - sourceFile.charCodeAt(0));
    const rankDiff = Math.abs(targetRank - sourceRank);

    // First check if the destination square has a piece of the same color
    const destPiece = this.position[target];
    if (destPiece && destPiece[0] === piece[0]) {  // Compare first letter ('w' or 'b')
      return false;
    }

    // Only check for check if not skipping validation
    if (!skipCheckValidation && this.isInCheck(isWhite, this.position)) {
      const testPosition = { ...this.position };
      delete testPosition[source];
      testPosition[target] = piece;
      if (this.isInCheck(isWhite, testPosition)) {
        return false;
      }
    }

    switch (pieceType) {
      case 'p': // Pawn
        return this.isLegalPawnMove(source, target, isWhite, fileDiff, rankDiff, this.position, this.enPassant);
      case 'n': // Knight
        return this.isLegalKnightMove(fileDiff, rankDiff);
      case 'b': // Bishop
        return this.isLegalBishopMove(source, target, fileDiff, rankDiff, this.position);
      case 'r': // Rook
        return this.isLegalRookMove(source, target, fileDiff, rankDiff, this.position);
      case 'q': // Queen
        return this.isLegalQueenMove(source, target, fileDiff, rankDiff, this.position);
      case 'k': // King
        return this.isLegalKingMove(fileDiff, rankDiff, source, target, piece, this.position, this.castlingRights, skipCheckValidation);
      default:
        return false;
    }
  }

  static fenToObj(fen) {
    if (typeof fen !== 'string') {
      throw new Error('FEN must be a string');
    }
    const position = {};
    const [piecePlacement] = fen.split(' ');
    let row = 7;
    let col = 0;

    for (const char of piecePlacement) {
      if (char === '/') {
        row--;
        col = 0;
      } else if (/\d/.test(char)) {
        col += parseInt(char, 10);
      } else {
        const square = String.fromCharCode('a'.charCodeAt(0) + col) + (row + 1);
        const color = char === char.toUpperCase() ? 'w' : 'b';
        const piece = color + char.toLowerCase();
        position[square] = piece;
        col++;
      }
    }

    return position;
  }

  static objToFen(position) {
    let fen = '';
    for (let rank = 8; rank >= 1; rank--) {
      let emptySquares = 0;

      for (let file = 'a'; file <= 'h'; file = String.fromCharCode(file.charCodeAt(0) + 1)) {
        const square = file + rank;
        const piece = position[square];

        if (piece) {
          // If we had empty squares before this piece, add the count
          if (emptySquares > 0) {
            fen += emptySquares;
            emptySquares = 0;
          }
          // Convert piece notation (e.g., 'wP' to 'P' for white pieces, 'p' for black)
          const pieceChar = piece[1].toUpperCase();
          fen += piece[0] === 'w' ? pieceChar : pieceChar.toLowerCase();
        } else {
          emptySquares++;
        }
      }

      // Add any remaining empty squares at the end of the rank
      if (emptySquares > 0) {
        fen += emptySquares;
      }

      // Add rank separator (except for the last rank)
      if (rank > 1) {
        fen += '/';
      }
    }

    return fen;
  }

  isLegalPawnMove(source, target, isWhite, fileDiff, rankDiff, position, enPassant) {
    const sourceRank = parseInt(source.charAt(1));
    const targetRank = parseInt(target.charAt(1));
    const sourceFile = source.charAt(0);
    const direction = isWhite ? 1 : -1;
    const startRank = isWhite ? 2 : 7;

    // Normal one-square move
    if (fileDiff === 0 && rankDiff === 1 &&
        (targetRank - sourceRank) === direction &&
        !position[target]) {
      return true;
    }

    // Initial two-square move
    if (sourceRank === startRank && fileDiff === 0 && rankDiff === 2 &&
        (targetRank - sourceRank) === 2 * direction &&
        !position[target] &&
        !position[`${sourceFile}${sourceRank + direction}`]) {
      return true;
    }
    if (this.isLegalPawnCapture(source, target, isWhite, fileDiff, rankDiff, position, enPassant)) {
      return true;
    }

    return false;
  }

  isLegalPawnCapture(source, target, isWhite, fileDiff, rankDiff, position, enPassant) {
    const sourceRank = parseInt(source.charAt(1));
    const targetRank = parseInt(target.charAt(1));
    const direction = isWhite ? 1 : -1;

    if (fileDiff === 1 && rankDiff === 1 &&
        (targetRank - sourceRank) === direction &&
        (position[target] || target === enPassant)) {
      return true;
    }

    return false;
  }

  isLegalCapture(source, target, piece, position, enPassant, skipCheckValidation = false) {
    const fileDiff = Math.abs(target.charCodeAt(0) - source.charCodeAt(0));
    const rankDiff = Math.abs(parseInt(target.charAt(1)) - parseInt(source.charAt(1)));
    if (piece.charAt(1) === 'n') {
      return this.isLegalKnightMove(fileDiff, rankDiff);
    } else if (piece.charAt(1) === 'b') {
      return this.isLegalBishopMove(source, target, fileDiff, rankDiff, position);
    } else if (piece.charAt(1) === 'r') {
      return this.isLegalRookMove(source, target, fileDiff, rankDiff, position);
    } else if (piece.charAt(1) === 'q') {
      return this.isLegalQueenMove(source, target, fileDiff, rankDiff, position);
    } else if (piece.charAt(1) === 'p') {
      const isWhite = piece.charAt(0) === 'w';
      return this.isLegalPawnCapture(source, target, isWhite, fileDiff, rankDiff, position, enPassant, skipCheckValidation);
    }
    return false;
  }

  isLegalKnightMove(fileDiff, rankDiff) {
    return (fileDiff === 2 && rankDiff === 1) ||
           (fileDiff === 1 && rankDiff === 2);
  }

  isLegalBishopMove(source, target, fileDiff, rankDiff, position) {
    return fileDiff === rankDiff &&
           this.isDiagonalPathClear(source, target, position);
  }

  isLegalRookMove(source, target, fileDiff, rankDiff, position) {
    return (fileDiff === 0 || rankDiff === 0) &&
           this.isStraightPathClear(source, target, position);
  }

  isLegalQueenMove(source, target, fileDiff, rankDiff, position) {
    return (fileDiff === rankDiff && this.isDiagonalPathClear(source, target, position)) ||
           ((fileDiff === 0 || rankDiff === 0) && this.isStraightPathClear(source, target, position));
  }

  isLegalKingMove(fileDiff, rankDiff, source, target, piece, position, castlingRights, skipCheckValidation = false) {
    const isWhite = piece === 'wk';
    const opponentKing = isWhite ? 'bk' : 'wk';

    // Check if target square is adjacent to opponent's king
    for (let fileOffset = -1; fileOffset <= 1; fileOffset++) {
      for (let rankOffset = -1; rankOffset <= 1; rankOffset++) {
        if (fileOffset === 0 && rankOffset === 0) continue;

        const file = String.fromCharCode(target.charCodeAt(0) + fileOffset);
        const rank = parseInt(target[1]) + rankOffset;
        const square = file + rank;

        // Check if square is on board and contains opponent's king
        if (file >= 'a' && file <= 'h' && rank >= 1 && rank <= 8) {
          if (position[square] === opponentKing) {
            return false;
          }
        }
      }
    }

    // Normal king moves (one square in any direction)
    if (fileDiff <= 1 && rankDiff <= 1) {
      // Skip check validation if requested
      if (skipCheckValidation) {
        return true;
      }
      // Check if the target square is under attack
      const testPosition = { ...position };
      delete testPosition[source];
      testPosition[target] = piece;
      return !this.isSquareUnderAttack(target, isWhite, testPosition, this.enPassant);
    }

    // Skip castling validation if we're just checking for attacks
    if (skipCheckValidation) {
      return false;
    }

    // Castling
    if (rankDiff === 0 && fileDiff === 2) {
      const rank = isWhite ? '1' : '8';

      // Cannot castle while in check
      if (this.isInCheck(isWhite, position)) {
        return false;
      }

      // Kingside castling
      if (target === `g${rank}` &&
          this.canCastleKingside(isWhite, position, castlingRights)) {
        // Check if squares between king and rook are under attack
        return !this.isSquareUnderAttack(`f${rank}`, isWhite, position, this.enPassant) &&
               !this.isSquareUnderAttack(`g${rank}`, isWhite, position, this.enPassant);
      }

      // Queenside castling
      if (target === `c${rank}` &&
          this.canCastleQueenside(isWhite, position, castlingRights)) {
        // Check if squares between king and rook are under attack
        return !this.isSquareUnderAttack(`d${rank}`, isWhite, position, this.enPassant) &&
               !this.isSquareUnderAttack(`c${rank}`, isWhite, position, this.enPassant);
      }
    }

    return false;
  }

  canCastleKingside(isWhite, position, castlingRights) {
    const rank = isWhite ? '1' : '8';
    const rights = isWhite ? 'K' : 'k';

    return castlingRights.includes(rights) &&
           !position[`f${rank}`] &&
           !position[`g${rank}`] &&
           position[`h${rank}`] === (isWhite ? 'wr' : 'br');
  }

  canCastleQueenside(isWhite, position, castlingRights) {
    const rank = isWhite ? '1' : '8';
    const rights = isWhite ? 'Q' : 'q';

    return castlingRights.includes(rights) &&
           !position[`d${rank}`] &&
           !position[`c${rank}`] &&
           !position[`b${rank}`] &&
           position[`a${rank}`] === (isWhite ? 'wr' : 'br');
  }

  isInCheck(isWhite, position) {
    // Find the king
    const king = isWhite ? 'wk' : 'bk';
    const kingSquare = this.findKingInPosition(king, position);

    return kingSquare && this.isSquareUnderAttack(kingSquare, isWhite, position, this.enPassant);
  }

  isSquareUnderAttack(square, isWhite, position, enPassant) {
    for (const [src, piece] of Object.entries(position)) {
      // Skip pieces of the same color
      if ((isWhite && piece[0] === 'w') || (!isWhite && piece[0] === 'b')) {
        continue;
      }

      // Pass skipCheckValidation=true to avoid infinite recursion
      if (this.isLegalCapture(src, square, piece, position, enPassant, true)) {
        return true;
      }
    }
    return false;
  }

  isDiagonalPathClear(source, target, position) {
    const fileStep = Math.sign(target.charCodeAt(0) - source.charCodeAt(0));
    const rankStep = Math.sign(target.charAt(1) - source.charAt(1));
    let file = String.fromCharCode(source.charCodeAt(0) + fileStep);
    let rank = parseInt(source.charAt(1)) + rankStep;

    while (`${file}${rank}` !== target) {
      if (position[`${file}${rank}`]) {
        return false;
      }
      file = String.fromCharCode(file.charCodeAt(0) + fileStep);
      rank += rankStep;
    }
    return true;
  }

  isStraightPathClear(source, target, position) {
    const fileStep = Math.sign(target.charCodeAt(0) - source.charCodeAt(0));
    const rankStep = Math.sign(target.charAt(1) - source.charAt(1));
    let file = String.fromCharCode(source.charCodeAt(0) + fileStep);
    let rank = parseInt(source.charAt(1)) + rankStep;

    while (`${file}${rank}` !== target) {
      if (position[`${file}${rank}`]) {
        return false;
      }
      if (fileStep !== 0) file = String.fromCharCode(file.charCodeAt(0) + fileStep);
      if (rankStep !== 0) rank += rankStep;
    }
    return true;
  }

  isCheckmate(isWhite) {
    return this.isInCheck(isWhite, this.position) && !this.isAnyMovePossible(isWhite);
  }

  isStalemate(isWhite) {
    return !this.isInCheck(isWhite, this.position) && !this.isAnyMovePossible(isWhite);
  }

  isInsufficientMaterial() {
    const pieces = Object.values(this.position);

    // Count pieces
    const pieceCount = pieces.length;

    // King vs King
    if (pieceCount === 2) return true;

    // King and Bishop/Knight vs King
    if (pieceCount === 3) {
      const nonKingPiece = pieces.find(p => !p.endsWith('k'));
      return nonKingPiece && (nonKingPiece.endsWith('b') || nonKingPiece.endsWith('n'));
    }

    // King and Bishop vs King and Bishop (same color bishops)
    if (pieceCount === 4) {
      const bishops = pieces.filter(p => p.endsWith('b'));
      if (bishops.length === 2) {
        // Check if bishops are on same colored squares
        const bishopSquares = Object.entries(this.position)
          .filter(([_, piece]) => piece.endsWith('b'))
          .map(([square, _]) => this.isLightSquare(square));
        return bishopSquares[0] === bishopSquares[1];
      }
    }

    return false;
  }

  isLightSquare(square) {
    const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = parseInt(square[1]) - 1;
    return (file + rank) % 2 === 0;
  }

  isAnyMovePossible(isWhite) {
    for (const [from, piece] of Object.entries(this.position)) {
      if (piece.charAt(0) !== (isWhite ? 'w' : 'b')) {
        continue;
      }
      // Check all possible destination squares
      for (let fileNum = 0; fileNum < 8; fileNum++) {
        for (let rankNum = 0; rankNum < 8; rankNum++) {
          const to = String.fromCharCode('a'.charCodeAt(0) + fileNum) + (rankNum + 1);
          if (from !== to && this.isLegalMove(from, to, piece)) {
            return true;
          }
        }
      }
    }

    return false;
  }
}
