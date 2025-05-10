import { describe, it, expect, beforeEach, vi } from "vitest";
import EvaluationExplainer from "../../public/scripts/evaluation_explainer.js";

// Mock the window.TRANSLATIONS object
const mockTranslations = {
  guess: {
    correct: {
      good_move: "Good Move!",
      good_guess: "Good Guess!",
    },
    blunder: "Blunder!",
    poor_move: "Poor move",
    okay_move: "Okay move",
    incorrect: "Incorrect",
    dubious_move: "Dubious move",
  },
  evaluation: {
    much_better:
      "¡Tu movimiento es incluso mejor que el de la partida (%{game_move})!",
    slightly_better:
      "Tu movimiento es ligeramente mejor que el de la partida (%{game_move}).",
    much_worse: "El movimiento de la partida (%{move}) era mucho mejor.",
    worse:
      "El movimiento de la partida (%{move}) era significativamente mejor.",
    slightly_worse:
      "El movimiento de la partida (%{move}) era ligeramente mejor.",
    equal: "Tu movimiento es tan bueno como el de la partida (%{move}).",
    not_as_good: "Tu movimiento no fue tan bueno como el de la partida.",
    still_good: "Tu movimiento seguía siendo bueno.",
    reasonable: "Tu movimiento aún te deja en una posición razonable.",
  },
};

// Mock the MoveLocalizer class
class MockMoveLocalizer {
  localize(move) {
    if (move && move.match(/[KQRBN]/)) {
      // Simply replace the piece letter with its Spanish equivalent
      move = move.replace("R", "T");
      move = move.replace("K", "R");
      move = move.replace("Q", "D");
      move = move.replace("B", "A");
      move = move.replace("N", "C");
    }
    return move;
  }
}

describe("EvaluationExplainer", () => {
  let explainer;
  let moveLocalizer;

  beforeEach(() => {
    // Setup window.TRANSLATIONS mock
    global.window = { TRANSLATIONS: mockTranslations };

    // Create a mock MoveLocalizer
    moveLocalizer = new MockMoveLocalizer();

    // Create the EvaluationExplainer instance
    explainer = new EvaluationExplainer(moveLocalizer);
  });

  describe("explainEvaluation comment", () => {
    it("returns appropriate comment for much better evaluation", () => {
      const move = {
        guess_eval: { score: 200 },
        game_eval: { score: 100 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "Ke2");
      expect(explanation.comment).toBe(
        "¡Tu movimiento es incluso mejor que el de la partida (Re2)!",
      );
    });

    it("returns appropriate comment for slightly better evaluation", () => {
      const move = {
        guess_eval: { score: 120 },
        game_eval: { score: 100 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "Qf3");
      expect(explanation.comment).toBe(
        "Tu movimiento es ligeramente mejor que el de la partida (Df3).",
      );
    });

    it("returns appropriate comment for much worse evaluation", () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 200 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "Bc4");
      expect(explanation.comment).toBe(
        "El movimiento de la partida (Ac4) era mucho mejor. Tu movimiento aún te deja en una posición razonable.",
      );
    });

    it("returns appropriate comment for worse evaluation", () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 150 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "Nf6");
      expect(explanation.comment).toBe(
        "El movimiento de la partida (Cf6) era significativamente mejor. Tu movimiento aún te deja en una posición razonable.",
      );
    });

    it("returns appropriate comment for slightly worse evaluation with high score", () => {
      const move = {
        guess_eval: { score: 90 },
        game_eval: { score: 100 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "Rd7");
      expect(explanation.comment).toBe(
        "Tu movimiento es tan bueno como el de la partida (Td7).",
      );
    });

    it("returns appropriate comment for slightly worse evaluation with low score", () => {
      const move = {
        guess_eval: { score: 40 },
        game_eval: { score: 50 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "e4");
      expect(explanation.comment).toBe(
        "Tu movimiento es tan bueno como el de la partida (e4).",
      );
    });

    it("returns appropriate comment for equal evaluation", () => {
      const move = {
        guess_eval: { score: 100 },
        game_eval: { score: 100 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "e4");
      expect(explanation.comment).toBe(
        "Tu movimiento es tan bueno como el de la partida (e4).",
      );
    });

    it("returns appropriate comment for incorrect guess", () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 200 },
        result: "incorrect",
      };

      const explanation = explainer.explainEvaluation(move, "e4");
      expect(explanation.comment).toBe(
        "El movimiento de la partida  era mucho mejor. Tu movimiento aún te deja en una posición razonable.",
      );
    });

    it("handles null or undefined evaluations", () => {
      const move = {
        guess_eval: { score: null },
        game_eval: { score: 100 },
        result: "correct",
      };

      const explanation = explainer.explainEvaluation(move, "e4");
      expect(explanation.comment).toBe(
        "Tu movimiento es tan bueno como el de la partida (e4).",
      );
    });
  });

  describe("explainEvaluation headline", () => {
    it('returns "Good Move!" for high score with small difference', () => {
      const move = {
        result: "correct",
        guess_eval: { score: 150 },
        game_eval: { score: 130 },
      };

      const explanation = explainer.explainEvaluation(move);
      expect(explanation.headline).toBe("Good Move!");
    });

    it('returns "Good Move!" for high score with large difference', () => {
      const move = {
        result: "correct",
        guess_eval: { score: 150 },
        game_eval: { score: 50 },
      };

      const explanation = explainer.explainEvaluation(move);
      expect(explanation.headline).toBe("Good Move!");
    });

    it('returns "Good Guess!" for low score', () => {
      const move = {
        result: "correct",
        guess_eval: { score: 50 },
        game_eval: { score: 100 },
      };

      const explanation = explainer.explainEvaluation(move);
      expect(explanation.headline).toBe("Good Guess!");
    });
  });

  describe("compareEvaluations", () => {
    it("returns the difference between evaluations", () => {
      expect(explainer.compareEvaluations(100, 50)).toBe(50);
      expect(explainer.compareEvaluations(50, 100)).toBe(-50);
      expect(explainer.compareEvaluations(100, 100)).toBe(0);
    });

    it("returns 0 for null or undefined evaluations", () => {
      expect(explainer.compareEvaluations(null, 100)).toBe(0);
      expect(explainer.compareEvaluations(100, null)).toBe(0);
      expect(explainer.compareEvaluations(null, null)).toBe(0);
    });
  });

  describe("chooseEvaluationComment", () => {
    it("returns appropriate comment for much better evaluation", () => {
      const comment = explainer.chooseEvaluationComment(
        "correct",
        "e4",
        200,
        100,
      );
      expect(comment).toBe(
        "¡Tu movimiento es incluso mejor que el de la partida (e4)!",
      );
    });

    it("returns appropriate comment for slightly better evaluation", () => {
      const comment = explainer.chooseEvaluationComment(
        "correct",
        "Bc5",
        120,
        20,
      );
      expect(comment).toBe(
        "Tu movimiento es ligeramente mejor que el de la partida (Ac5).",
      );
    });

    it("returns appropriate comment for much worse evaluation", () => {
      const comment = explainer.chooseEvaluationComment(
        "correct",
        "Bc5",
        60,
        -150,
      );
      expect(comment).toBe(
        "El movimiento de la partida (Ac5) era mucho mejor. Tu movimiento aún te deja en una posición razonable.",
      );
    });

    it("returns appropriate comment for worse evaluation", () => {
      const comment = explainer.chooseEvaluationComment(
        "correct",
        "Bc5",
        60,
        -75,
      );
      expect(comment).toBe(
        "El movimiento de la partida (Ac5) era significativamente mejor. Tu movimiento aún te deja en una posición razonable.",
      );
    });

    it("returns appropriate comment for slightly worse evaluation with high score", () => {
      const comment = explainer.chooseEvaluationComment(
        "correct",
        "Bc5",
        90,
        -20,
      );
      expect(comment).toBe(
        "El movimiento de la partida (Ac5) era ligeramente mejor. Tu movimiento seguía siendo bueno.",
      );
    });

    it("returns appropriate comment for slightly worse evaluation with low score", () => {
      const comment = explainer.chooseEvaluationComment(
        "correct",
        "Bc5",
        40,
        -20,
      );
      expect(comment).toBe(
        "El movimiento de la partida (Ac5) era ligeramente mejor.",
      );
    });

    it("returns appropriate comment for equal evaluation", () => {
      const comment = explainer.chooseEvaluationComment(
        "correct",
        "Bc5",
        100,
        0,
      );
      expect(comment).toBe(
        "Tu movimiento es tan bueno como el de la partida (Ac5).",
      );
    });

    it("returns appropriate comment for incorrect guess", () => {
      const comment = explainer.chooseEvaluationComment(
        "incorrect",
        "Bc5",
        60,
        -50,
      );
      expect(comment).toBe(
        "El movimiento de la partida  era ligeramente mejor. Tu movimiento aún te deja en una posición razonable.",
      );
    });

    it("handles empty parentheses in translations", () => {
      // Modify the mock translations to include empty parentheses
      global.window.TRANSLATIONS.evaluation.much_better =
        "Tu movimiento es mucho mejor que %{game_move}()";

      const comment = explainer.chooseEvaluationComment(
        "correct",
        "Qe2",
        200,
        100,
      );
      expect(comment).toBe("Tu movimiento es mucho mejor que De2");
    });
  });

  describe("explainEvaluationWithoutGameMove", () => {
    it('returns "Good Move!" for correct result', () => {
      const move = {
        result: "correct",
        guess_eval: { score: 100 }, // best_eval not needed for 'correct'
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("good");
      expect(explanation.headline).toBe(
        mockTranslations.guess.correct.good_move,
      );
      expect(explanation.action).toBe("keep_guess");
    });

    it('returns "Blunder!" when drop is >= 300 and guess_eval < 300', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 400 },
        guess_eval: { score: 50 }, // drop 350, guess_eval 50
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("bad");
      expect(explanation.headline).toBe(mockTranslations.guess.blunder);
      expect(explanation.action).toBe("restore_position");
    });

    it('returns "Poor move" when drop is >= 150 and guess_eval < 150 (not a blunder)', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 200 },
        guess_eval: { score: 40 }, // drop 160, guess_eval 40
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("bad");
      expect(explanation.headline).toBe(mockTranslations.guess.poor_move);
      expect(explanation.action).toBe("restore_position");
    });

    it('returns "Poor move" for a winning to losing flip (best_eval > 50, guess_eval < -50, drop > 100)', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 100 }, // Winning
        guess_eval: { score: -100 }, // Losing, drop 200
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("bad");
      expect(explanation.headline).toBe(mockTranslations.guess.poor_move);
      expect(explanation.action).toBe("restore_position");
    });

    it("does not mark as Poor move (flip) if drop is not > 100", () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 60 },
        guess_eval: { score: -30 },
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("neutral");
      expect(explanation.headline).toBe(mockTranslations.guess.dubious_move);
    });

    it('returns "Dubious move" when drop is < 150 (and not Blunder/Poor)', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 100 },
        guess_eval: { score: 0 }, // drop 100
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("neutral");
      expect(explanation.headline).toBe(mockTranslations.guess.dubious_move);
      expect(explanation.action).toBe("restore_position");
    });

    it('returns "Okay move" when drop is minor and position is still very good', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 500 },
        guess_eval: { score: 400 },
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("neutral");
      expect(explanation.headline).toBe(mockTranslations.guess.okay_move);
      expect(explanation.action).toBe("keep_guess");
    });

    it('returns "Dubious move" as fallback for incorrect when conditions for Blunder, Poor, Okay are not met', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 400 },
        guess_eval: { score: 200 }, // drop 200, guess_eval 200
      };
      // Blunder: No (drop 200 not >= 300)
      // Poor (standard): No (guess_eval 200 not < 150)
      // Poor (flip): No (guess_eval 200 not < -50)
      // Okay: No (drop 200 not < 150)
      // Dubious: Yes
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("neutral"); // As per current code
      expect(explanation.headline).toBe(mockTranslations.guess.dubious_move);
      expect(explanation.action).toBe("restore_position");
    });

    it('returns "Incorrect" when best_eval score is missing', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: undefined },
        guess_eval: { score: 100 },
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("bad");
      expect(explanation.headline).toBe(mockTranslations.guess.incorrect);
      expect(explanation.action).toBe("restore_position");
    });

    it('returns "Incorrect" when best_eval object is null', () => {
      const move = {
        result: "incorrect",
        best_eval: null,
        guess_eval: { score: 100 },
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("bad");
      expect(explanation.headline).toBe(mockTranslations.guess.incorrect);
      expect(explanation.action).toBe("restore_position");
    });

    it('returns "Incorrect" when guess_eval score is missing', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 100 },
        guess_eval: { score: undefined },
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("bad");
      expect(explanation.headline).toBe(mockTranslations.guess.incorrect);
      expect(explanation.action).toBe("restore_position");
    });

    it('returns "Incorrect" when guess_eval object is null', () => {
      const move = {
        result: "incorrect",
        best_eval: { score: 100 },
        guess_eval: null,
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation.rating).toBe("bad");
      expect(explanation.headline).toBe(mockTranslations.guess.incorrect);
    });

    it('handles move.result not "correct" or "incorrect" by returning empty explanation', () => {
      const move = {
        result: "some_other_result",
        best_eval: { score: 100 },
        guess_eval: { score: 50 },
      };
      const explanation = explainer.explainEvaluationWithoutGameMove(move);
      expect(explanation).toEqual({});
    });
  });
});
