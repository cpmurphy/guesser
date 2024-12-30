export default class MoveLocalizer {


    constructor(locale) {
      this.locale = locale;
      this.CASTLING_REGEX = /^(O-O-O|O-O)([+#])?$/;
      this.STANDARD_MOVE_REGEX = /^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=[QRBN])?([+#])?$/;
      this.CAPTURE = 'x'
      this.PROMOTION = '='
      this.CHECK = '+'
      this.CHECKMATE = '#'

      this.TRANSLATIONS = {
        en: {
          'piece.K': 'K',
          'piece.Q': 'Q',
          'piece.R': 'R',
          'piece.B': 'B',
          'piece.N': 'N',
          'piece.P': '',
        },
        de: {
          'piece.K': 'K',
          'piece.Q': 'D',
          'piece.R': 'T',
          'piece.B': 'L',
          'piece.N': 'S',
          'piece.P': '',
        },
        es: {
          'piece.K': 'R',
          'piece.Q': 'D',
          'piece.R': 'T',
          'piece.B': 'A',
          'piece.N': 'C',
          'piece.P': '',
        },
        fr: {
          'piece.K': 'R',
          'piece.Q': 'D',
          'piece.R': 'T',
          'piece.B': 'L',
          'piece.N': 'S',
          'piece.P': '',
        },
        nb: {
          'piece.K': 'K',
          'piece.Q': 'D',
          'piece.R': 'T',
          'piece.B': 'L',
          'piece.N': 'S',
          'piece.P': '',
        },
        ru: {
          'piece.K': 'Кр',
          'piece.Q': 'Ф',
          'piece.R': 'Л',
          'piece.B': 'С',
          'piece.N': 'К',
          'piece.P': '',
          'file.a': 'а',
          'file.b': 'б',
          'file.c': 'в',
          'file.d': 'г',
          'file.e': 'д',
          'file.f': 'е',
          'file.g': 'ж',
          'file.h': 'з',
        }
      };
    }

    localize(algebraic) {
      // Convert English algebraic notation to moveInfo
      const moveInfo = this.moveInfoFromAlgebraic(algebraic);

      // Convert moveInfo to localized notation
      const piece = moveInfo['piece'] || 'P';
      const pieceLetter = (piece && piece.toUpperCase() != 'P') ? this.TRANSLATIONS[this.locale][`piece.${piece.toUpperCase()}`] : '';

      if (moveInfo['castling']) {
        return algebraic;
      } else {
        // For regular moves, maintain algebraic notation format
        const disambiguation = this.localizeDisambiguation(moveInfo['disambiguation'] || '');  // Use the original disambiguation if any
        const capture = moveInfo['capture'] ? this.CAPTURE : '';
        const to = this.localizeTo(moveInfo['to']); 
        const promotion = moveInfo['promotion'] ? `${this.PROMOTION}${this.TRANSLATIONS[this.locale][`piece.${moveInfo['promotion'].toUpperCase()}`]}` : '';
        const check = moveInfo['check'] ? this.CHECK : '';
        const checkmate = moveInfo['checkmate'] ? this.CHECKMATE : '';

        return `${pieceLetter}${disambiguation}${capture}${to}${promotion}${check}${checkmate}`;
      }
    }

    localizeDisambiguation(disambiguation) {
        if (this.locale !== 'ru') {
            return disambiguation;
        }

        if (disambiguation && disambiguation.match(/^([a-h])([1-8])?$/)) {
            return this.TRANSLATIONS[this.locale][`file.${disambiguation[0]}`] + (disambiguation[1] || '');
        } else {
            return disambiguation;
        }
    }

    localizeTo(to) {
      if (to.length > 1 && this.locale === 'ru') {
        return `${this.TRANSLATIONS[this.locale][`file.${to[0]}`]}${to[1]}`;
      } else {
        return to;
      }
    }

    moveInfoFromAlgebraic(algebraic) {
      // Handle castling first
      const castlingMatch = algebraic.match(this.CASTLING_REGEX);
      if (castlingMatch) {
        const castling = castlingMatch[1] === 'O-O' ? 'kingside' : 'queenside';
        const check = castlingMatch[2] === '+';
        const checkmate = castlingMatch[2] === '#';
        return {
          castling: castling,
          check: check,
          checkmate: checkmate
        };
      }

      // Parse the move components
      const standardMatch = algebraic.match(this.STANDARD_MOVE_REGEX);
      if (standardMatch) {
        const piece = standardMatch[1] || 'P';
        const fileHint = standardMatch[2];
        const rankHint = standardMatch[3];
        const capture = standardMatch[4] === 'x';
        const to = standardMatch[5];
        const promotion = standardMatch[6]?.replace('=', '');
        const check = standardMatch[7] === '+';
        const checkmate = standardMatch[7] === '#';

        // Keep original disambiguation (if any)
        let disambiguation = '';
        if (fileHint) { disambiguation += fileHint; }
        if (rankHint) { disambiguation += rankHint; }

        return {
          piece: piece,
          disambiguation: disambiguation,
          to: to,
          capture: capture,
          promotion: promotion,
          check: check,
          checkmate: checkmate
        };
      } else {
        throw new Error(`Invalid algebraic notation: ${algebraic}`);
      }
    }

}