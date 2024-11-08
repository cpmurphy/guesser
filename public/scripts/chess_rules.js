export default class ChessRules {
  constructor() {}

  isLegalMove(source, target, piece, position, enPassant) {
    const pieceType = piece.charAt(1).toLowerCase();
    const isWhite = piece.charAt(0) === 'w';
    const sourceRank = parseInt(source.charAt(1));
    const targetRank = parseInt(target.charAt(1));
    const sourceFile = source.charAt(0);
    const targetFile = target.charAt(0);
    const fileDiff = Math.abs(targetFile.charCodeAt(0) - sourceFile.charCodeAt(0));
    const rankDiff = Math.abs(targetRank - sourceRank);

    // Basic piece movement rules
    switch (pieceType) {
      case 'p': // Pawn
        return this.isLegalPawnMove(source, target, isWhite, fileDiff, rankDiff, position, enPassant);
      case 'n': // Knight
        return this.isLegalKnightMove(fileDiff, rankDiff);
      case 'b': // Bishop
        return this.isLegalBishopMove(source, target, fileDiff, rankDiff, position);
      case 'r': // Rook
        return this.isLegalRookMove(source, target, fileDiff, rankDiff, position);
      case 'q': // Queen
        return this.isLegalQueenMove(source, target, fileDiff, rankDiff, position);
      case 'k': // King
        return this.isLegalKingMove(fileDiff, rankDiff, source, piece, position);
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

    // Capture (including en passant)
    if (fileDiff === 1 && rankDiff === 1 &&
        (targetRank - sourceRank) === direction &&
        (position[target] || target === enPassant)) {
      return true;
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

  isLegalKingMove(fileDiff, rankDiff, source, piece, position) {
    // Normal king moves (one square in any direction)
    if (fileDiff <= 1 && rankDiff <= 1) {
      return true;
    }

    // Castling
    if (rankDiff === 0 && fileDiff === 2) {
      const isWhite = piece === 'wK';
      const rank = isWhite ? '1' : '8';
      
      // Kingside castling
      if (source === `e${rank}` && 
          !position[`f${rank}`] && 
          !position[`g${rank}`] && 
          position[`h${rank}`] === (isWhite ? 'wR' : 'bR')) {
        return true;
      }
      
      // Queenside castling
      if (source === `e${rank}` && 
          !position[`d${rank}`] && 
          !position[`c${rank}`] && 
          !position[`b${rank}`] && 
          position[`a${rank}`] === (isWhite ? 'wR' : 'bR')) {
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
}
