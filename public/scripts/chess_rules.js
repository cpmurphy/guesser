export default class ChessRules {
  constructor(Fen) {
    this.Fen = Fen;
    this.enPassant = '-';
    this.castlingRights = 'KQkq';
  }

  setCurrentState(enPassant, castlingRights) {
    this.enPassant = enPassant;
    this.castlingRights = castlingRights;
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

  isLegalMoveWithFen(fen, source, target, piece, skipCheckValidation = false) {
    if (typeof fen !== 'string') {
      throw new Error('fen must be a string');
    }
    const position = this.Fen.fenToObj(fen);
    return this.isLegalMove(position, source, target, piece, skipCheckValidation);
  }

  isLegalMove(position, source, target, piece, skipCheckValidation = false) {
    if (typeof position !== 'object') {
      throw new Error('position must be an object');
    }
    const pieceType = piece.charAt(1).toLowerCase();
    const isWhite = piece.charAt(0) === 'w';
    const sourceRank = parseInt(source.charAt(1));
    const targetRank = parseInt(target.charAt(1));
    const sourceFile = source.charAt(0);
    const targetFile = target.charAt(0);
    const fileDiff = Math.abs(targetFile.charCodeAt(0) - sourceFile.charCodeAt(0));
    const rankDiff = Math.abs(targetRank - sourceRank);

    // First check if the destination square has a piece of the same color
    const destPiece = position[target];
    if (destPiece && destPiece[0] === piece[0]) {  // Compare first letter ('w' or 'b')
      return false;
    }

    // Only check for check if not skipping validation
    if (!skipCheckValidation && this.isInCheck(isWhite, position)) {
      const testPosition = { ...position };
      delete testPosition[source];
      testPosition[target] = piece;
      if (this.isInCheck(isWhite, testPosition)) {
        return false;
      }
    }

    switch (pieceType) {
      case 'p': // Pawn
        return this.isLegalPawnMove(source, target, isWhite, fileDiff, rankDiff, position, this.enPassant);
      case 'n': // Knight
        return this.isLegalKnightMove(fileDiff, rankDiff);
      case 'b': // Bishop
        return this.isLegalBishopMove(source, target, fileDiff, rankDiff, position);
      case 'r': // Rook
        return this.isLegalRookMove(source, target, fileDiff, rankDiff, position);
      case 'q': // Queen
        return this.isLegalQueenMove(source, target, fileDiff, rankDiff, position);
      case 'k': // King
        return this.isLegalKingMove(fileDiff, rankDiff, source, target, piece, position, this.castlingRights, skipCheckValidation);
      default:
        return false;
    }
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

  isCheckmate(fen, isWhite) {
    const position = this.Fen.fenToObj(fen);
    return this.isInCheck(isWhite, position) && !this.isAnyMovePossible(position, isWhite);
  }

  isCheck(fen, isWhite) {
    const position = this.Fen.fenToObj(fen);
    return this.isInCheck(isWhite, position) && this.isAnyMovePossible(position, isWhite);
  }

  isStalemate(fen, isWhite) {
    const position = this.Fen.fenToObj(fen);
    return !this.isInCheck(isWhite, position) && !this.isAnyMovePossible(position, isWhite);
  }

  isInsufficientMaterial(fen) {
    const position = this.Fen.fenToObj(fen);
    const pieces = Object.values(position);

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
        const bishopSquares = Object.entries(position)
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

  possibleTargetSquaresForPawn(from, isWhite) {
    const rank = parseInt(from[1]);
    const file = from[0];
    const direction = isWhite ? 1 : -1;
    const startRank = isWhite ? 2 : 7;

    const targetSquares = [
      `${file}${rank + direction}`, // One square ahead
      ...(rank === startRank ? [`${file}${rank + 2 * direction}`] : []), // Two squares if on start rank
      `${String.fromCharCode(file.charCodeAt(0) - 1)}${rank + direction}`, // Diagonal captures
      `${String.fromCharCode(file.charCodeAt(0) + 1)}${rank + direction}`
    ];
    return targetSquares;
  }

  possibleTargetSquaresForKnight(from) {
    const fileCode = from.charCodeAt(0);
    const r = parseInt(from[1]);
    const targetSquares = [
      `${String.fromCharCode(fileCode + 2)}${r + 1}`,
      `${String.fromCharCode(fileCode + 2)}${r - 1}`,
      `${String.fromCharCode(fileCode - 2)}${r + 1}`,
      `${String.fromCharCode(fileCode - 2)}${r - 1}`,
      `${String.fromCharCode(fileCode + 1)}${r + 2}`,
      `${String.fromCharCode(fileCode + 1)}${r - 2}`,
      `${String.fromCharCode(fileCode - 1)}${r + 2}`,
      `${String.fromCharCode(fileCode - 1)}${r - 2}`
    ];
    return this.keepOnlySquaresOnBoard(targetSquares);
  }

  keepOnlySquaresOnBoard(targetSquares) {
    return targetSquares.filter(square => square[0] >= 'a' && square[0] <= 'h' && square[1] >= '1' && square[1] <= '8');
  }

  possibleTargetSquaresForBishop(from) {
    const file = from.charCodeAt(0);
    const rank = parseInt(from[1]);
    const targetSquares = [];

    // All four diagonal directions
    const directions = [
        [1, 1],   // up-right
        [1, -1],  // down-right
        [-1, 1],  // up-left
        [-1, -1]  // down-left
    ];

    for (const [fileStep, rankStep] of directions) {
        let currentFile = file;
        let currentRank = rank;

        while (true) {
            currentFile += fileStep;
            currentRank += rankStep;

            // Check if we're still on the board
            if (currentFile < 'a'.charCodeAt(0) || currentFile > 'h'.charCodeAt(0) ||
                currentRank < 1 || currentRank > 8) {
                break;
            }

            targetSquares.push(`${String.fromCharCode(currentFile)}${currentRank}`);
        }
    }

    return targetSquares;
  }

  possibleTargetSquaresForRook(from) {
    const file = from[0];
    const rank = parseInt(from[1]);
    const targetSquares = [];

    // all squares in the same file
    for (let i = 0; i < 8; i++) {
      const newFile = String.fromCharCode('a'.charCodeAt(0) + i);
      targetSquares.push(`${newFile}${rank}`);
    }

    // all squares in the same rank
    for (let i = 1; i <= 8; i++) {
      targetSquares.push(`${file}${i}`);
    }

    return targetSquares.filter(square => square !== from);
  }

  possibleTargetSquaresForQueen(from) {
    return [
      ...this.possibleTargetSquaresForBishop(from),
      ...this.possibleTargetSquaresForRook(from)
    ];
  }

  possibleTargetSquaresForKing(from) {
    const kRank = parseInt(from[1]);
    const kFile = from.charCodeAt(0);
    const targetSquares = [
      // Adjacent squares
      ...[-1, 0, 1].flatMap(fileOffset =>
        [-1, 0, 1].map(rankOffset =>
          `${String.fromCharCode(kFile + fileOffset)}${kRank + rankOffset}`)),
      // Castling squares
      `c${kRank}`, `g${kRank}`
    ];
    return this.keepOnlySquaresOnBoard(targetSquares).filter(square => square !== from);
  }

  isAnyMovePossibleInFen(fen, isWhite) {
    const position = this.Fen.fenToObj(fen);
    return this.isAnyMovePossible(position, isWhite);
  }

  isAnyMovePossible(position, isWhite) {
    // Get all squares with pieces of the current player's color
    const playerPieces = Object.entries(position)
        .filter(([_, piece]) => piece.charAt(0) === (isWhite ? 'w' : 'b'));

    for (const [from, piece] of playerPieces) {
        const pieceType = piece.charAt(1);

        // Get potential target squares based on piece type
        let targetSquares;

        switch (pieceType) {
            case 'p':
              targetSquares = this.possibleTargetSquaresForPawn(from, isWhite);
                break;

            case 'n':
              targetSquares = this.possibleTargetSquaresForKnight(from);
                break;

            case 'b':
              targetSquares = this.possibleTargetSquaresForBishop(from);
                break;

            case 'r':
              targetSquares = this.possibleTargetSquaresForRook(from);
                break;

            case 'q':
              targetSquares = this.possibleTargetSquaresForQueen(from);
                break;

            case 'k':
              targetSquares = this.possibleTargetSquaresForKing(from);
                break;
        }

        // Filter valid squares and check if any moves are legal
        const validSquares = targetSquares.filter(square => {
            const file = square[0];
            const rank = parseInt(square[1]);
            return file >= 'a' && file <= 'h' && rank >= 1 && rank <= 8 && from !== square;
        });

        for (const to of validSquares) {
            if (this.isLegalMove(position, from, to, piece)) {
                return true;
            }
        }
    }

    return false;
  }
}
