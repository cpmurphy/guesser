export default class Fen {

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
}
