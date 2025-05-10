export default class EvaluationExplainer {
  constructor(moveLocalizer) {
    this.moveLocalizer = moveLocalizer;
  }

  explainEvaluation(move, gameMove) {
    const explanation = {};
    if (move.result == 'correct') {
      if (move.same_as_game) {
        explanation.rating = 'good';
        explanation.headline = window.TRANSLATIONS.guess.correct.correct_exclamation;
        explanation.comment = window.TRANSLATIONS.guess.correct.same_as_game;
          explanation.action = 'keep_guess';
      } else {
        explanation.rating = this.getRating(move.result, gameMove);
        const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
        explanation.headline = this.getEvaluationHeadline(move, evalDiff);
        explanation.comment = this.getEvaluationComment(move, gameMove, evalDiff);
        explanation.action = 'use_game_move';
      }
    } else if (move.result == 'incorrect') {
      if (gameMove == '--') {
        explanation.rating = 'neutral';
        explanation.headline = '';
        explanation.comment = window.TRANSLATIONS.guess.move_was_passed;
        explanation.action = 'pass_move';
      } else {
        explanation.rating = 'bad';
        explanation.headline = window.TRANSLATIONS.guess.incorrect;
        const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
        explanation.comment = this.getEvaluationComment(move, gameMove, evalDiff);
        explanation.action = 'restore_position';
      }
    } else if (move.result == 'game_over') {
      explanation.rating = 'neutral';
      explanation.headline = '';
      explanation.comment = window.TRANSLATIONS.guess.beyond_game;
      explanation.action = 'add_extra_move';
    }
    return explanation;
  }

  explainEvaluationWithoutGameMove(move) {
    const explanation = {};
    if (move.result == 'correct') {
      explanation.rating = 'good';
      explanation.headline = window.TRANSLATIONS.guess.correct.good_move;
      explanation.action = 'keep_guess';
    } else if (move.result == 'incorrect') {
      const bestScoreForThisTurn = move.best_eval && typeof move.best_eval.score === 'number' ? move.best_eval.score : undefined;
      const guessScore = move.guess_eval && typeof move.guess_eval.score === 'number' ? move.guess_eval.score : undefined;

      explanation.action = 'restore_position'; // Common action for incorrect moves

      if (bestScoreForThisTurn !== undefined && guessScore !== undefined) {
        const drop = bestScoreForThisTurn - guessScore;

        // Blunder: drop is >= 300 centipawns AND the resulting position is less than a 300 centipawn advantage.
        if (drop >= 300 && guessScore < 300) {
          explanation.rating = 'bad';
          explanation.headline = window.TRANSLATIONS.guess.blunder;
        }
        // Poor move:
        // - drop is >= 150 centipawns AND the resulting position is less than a 150 centipawn advantage.
        // - OR the move flips from winning (>50cp for bestScore) to losing (<-50cp for guessScore) AND the drop is > 100cp.
        // This implicitly does not overlap with Blunder due to the else-if structure.
        else if ((drop >= 150 && guessScore < 150) ||
                 (bestScoreForThisTurn > 50 && guessScore < -50 && drop > 100)) {
          explanation.rating = 'bad';
          explanation.headline = window.TRANSLATIONS.guess.poor_move;
        }
        // Okay move: drop is < 150 centipawns.
        // This category is reached if the move is not a Blunder or a Poor Move, and the drop is relatively small.
        else if (drop < 150) {
          explanation.rating = 'neutral';
          explanation.headline = window.TRANSLATIONS.guess.okay_move;
        }
        // Fallback to "Incorrect" for other cases where move.result is 'incorrect'
        // e.g., if drop >= 150 but guessScore remains high (>=150) and it's not a win-to-loss flip.
        else {
          explanation.rating = 'neutral';
          explanation.headline = window.TRANSLATIONS.guess.dubious_move;
        }
      } else {
        // Fallback if evaluation scores are not available for some reason
        explanation.rating = 'bad';
        explanation.headline = window.TRANSLATIONS.guess.incorrect;
      }
    }
    // Note: This method does not currently handle move.result == 'game_over' like explainEvaluation does.
    // If moves "after the end of the game" can have this result, you might want to add a case for it here as well.
    return explanation;
  }

  getEvaluationComment(move, gameMove, evalDiff) {
    return this.chooseEvaluationComment(move.result, gameMove, move.guess_eval.score, evalDiff);
  }

  getEvaluationHeadline(move, evalDiff) {
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
      comment = window.TRANSLATIONS.evaluation.much_better.replace('%{game_move}', moveText);
    } else if (evalDiff > 10) {
      comment = window.TRANSLATIONS.evaluation.slightly_better.replace('%{game_move}', moveText);
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

  getRating(guessResult, gameMove) {
    if (guessResult == 'correct') {
      return 'good';
    } else if (gameMove == '--') {
      return 'neutral';
    } else {
      return 'bad';
    }
  }
}

