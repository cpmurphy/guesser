export default class EvaluationExplainer {
  constructor(moveLocalizer) {
    this.moveLocalizer = moveLocalizer;
  }

  getEvaluationComment(move) {
    const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
    return this.chooseEvaluationComment(move.result, move.game_move, move.guess_eval.score, evalDiff);
  }

  getEvaluationHeadline(move) {
    const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
    if (move.guess_eval.score > 100 && evalDiff > -30) {
      return window.TRANSLATIONS.guess.correct.good_move;
    } else {
      return window.TRANSLATIONS.guess.correct.good_guess;
    }
  }

  compareEvaluations(guessEval, gameEval) {
    if (!guessEval || !gameEval) return 0;
    return guessEval - gameEval;
  }

  chooseEvaluationComment(guessResult, gameMove, guessEval, evalDiff) {
    var comment = '';
    const guessCorrect = guessResult == 'correct';
    const moveText = guessCorrect ? this.moveLocalizer.localize(gameMove) : '';

    if (evalDiff > 50) {
      comment = window.TRANSLATIONS.evaluation.much_better.replace('%{game_move}', gameMove);
    } else if (evalDiff > 10) {
      comment = window.TRANSLATIONS.evaluation.slightly_better.replace('%{game_move}', gameMove);
    } else if (evalDiff < -100) {
      comment = window.TRANSLATIONS.evaluation.much_worse.replace('%{move}', moveText);
    } else if (evalDiff < -50) {
      comment = window.TRANSLATIONS.evaluation.worse.replace('%{move}', moveText);
    } else if (evalDiff < -10) {
      comment = window.TRANSLATIONS.evaluation.slightly_worse.replace('%{move}', moveText);
    } else if (guessResult == 'correct') {
      comment = window.TRANSLATIONS.evaluation.equal.replace('%{move}', moveText);
    } else {
      comment = window.TRANSLATIONS.evaluation.not_as_good;
    }
    if (comment.includes('()')) {
      comment = comment.replace(/\(\)/, '');
    }

    if (evalDiff < -10) {
      if (evalDiff > -50 && guessEval > 50) {
        comment += " " + window.TRANSLATIONS.evaluation.still_good;
      } else if (guessEval > 50) {
        comment += " " + window.TRANSLATIONS.evaluation.reasonable;
      }
    }
    return comment;
  }
}
