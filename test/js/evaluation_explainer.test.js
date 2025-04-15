import { describe, it, expect, beforeEach, vi } from 'vitest';
import EvaluationExplainer from '../../public/scripts/evaluation_explainer.js';

// Mock the window.TRANSLATIONS object
const mockTranslations = {
  guess: {
    correct: {
      good_move: 'Good Move!',
      good_guess: 'Good Guess!'
    }
  },
  evaluation: {
    much_better: '¡Tu movimiento es incluso mejor que el de la partida (%{game_move})!',
    slightly_better: 'Tu movimiento es ligeramente mejor que el de la partida (%{game_move}).',
    much_worse: 'El movimiento de la partida (%{move}) era mucho mejor.',
    worse: 'El movimiento de la partida (%{move}) era significativamente mejor.',
    slightly_worse: 'El movimiento de la partida (%{move}) era ligeramente mejor.',
    equal: 'Tu movimiento es tan bueno como el de la partida (%{move}).',
    not_as_good: 'Tu movimiento no fue tan bueno como el de la partida.',
    still_good: 'Tu movimiento seguía siendo bueno.',
    reasonable: 'Tu movimiento aún te deja en una posición razonable.',
  }
};

// Mock the MoveLocalizer class
class MockMoveLocalizer {
  localize(move) {
    if (move && move.match(/[KQRBN]/)) {
      // Simply replace the piece letter with its Spanish equivalent
      move = move.replace('R', 'T');
      move = move.replace('K', 'R');
      move = move.replace('Q', 'D');
      move = move.replace('B', 'A');
      move = move.replace('N', 'C');
    }
    return move;
  }
}

describe('EvaluationExplainer', () => {
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

  describe('explainEvaluation comment', () => {
    it('returns appropriate comment for much better evaluation', () => {
      const move = {
        guess_eval: { score: 200 },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'Ke2'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('¡Tu movimiento es incluso mejor que el de la partida (Re2)!');
    });

    it('returns appropriate comment for slightly better evaluation', () => {
      const move = {
        guess_eval: { score: 120 },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'Qf3'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Tu movimiento es ligeramente mejor que el de la partida (Df3).');
    });

    it('returns appropriate comment for much worse evaluation', () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 200 },
        result: 'correct',
        game_move: 'Bc4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('El movimiento de la partida (Ac4) era mucho mejor. Tu movimiento aún te deja en una posición razonable.');
    });

    it('returns appropriate comment for worse evaluation', () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 150 },
        result: 'correct',
        game_move: 'Nf6'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('El movimiento de la partida (Cf6) era significativamente mejor. Tu movimiento aún te deja en una posición razonable.');
    });

    it('returns appropriate comment for slightly worse evaluation with high score', () => {
      const move = {
        guess_eval: { score: 90 },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'Rd7'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Tu movimiento es tan bueno como el de la partida (Td7).');
    });

    it('returns appropriate comment for slightly worse evaluation with low score', () => {
      const move = {
        guess_eval: { score: 40 },
        game_eval: { score: 50 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Tu movimiento es tan bueno como el de la partida (e4).');
    });

    it('returns appropriate comment for equal evaluation', () => {
      const move = {
        guess_eval: { score: 100 },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Tu movimiento es tan bueno como el de la partida (e4).');
    });

    it('returns appropriate comment for incorrect guess', () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 200 },
        result: 'incorrect',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('El movimiento de la partida  era mucho mejor. Tu movimiento aún te deja en una posición razonable.');
    });

    it('handles null or undefined evaluations', () => {
      const move = {
        guess_eval: { score: null },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Tu movimiento es tan bueno como el de la partida (e4).');
    });
  });

  describe('explainEvaluation headline', () => {
    it('returns "Good Move!" for high score with small difference', () => {
      const move = {
        result: 'correct',
        guess_eval: { score: 150 },
        game_eval: { score: 130 }
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.headline).toBe('Good Move!');
    });

    it('returns "Good Move!" for high score with large difference', () => {
      const move = {
        result: 'correct',
        guess_eval: { score: 150 },
        game_eval: { score: 50 }
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.headline).toBe('Good Move!');
    });

    it('returns "Good Guess!" for low score', () => {
      const move = {
        result: 'correct',
        guess_eval: { score: 50 },
        game_eval: { score: 100 }
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.headline).toBe('Good Guess!');
    });
  });

  describe('compareEvaluations', () => {
    it('returns the difference between evaluations', () => {
      expect(explainer.compareEvaluations(100, 50)).toBe(50);
      expect(explainer.compareEvaluations(50, 100)).toBe(-50);
      expect(explainer.compareEvaluations(100, 100)).toBe(0);
    });

    it('returns 0 for null or undefined evaluations', () => {
      expect(explainer.compareEvaluations(null, 100)).toBe(0);
      expect(explainer.compareEvaluations(100, null)).toBe(0);
      expect(explainer.compareEvaluations(null, null)).toBe(0);
    });
  });

  describe('chooseEvaluationComment', () => {
    it('returns appropriate comment for much better evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 200, 100);
      expect(comment).toBe('¡Tu movimiento es incluso mejor que el de la partida (e4)!');
    });

    it('returns appropriate comment for slightly better evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'Bc5', 120, 20);
      expect(comment).toBe('Tu movimiento es ligeramente mejor que el de la partida (Ac5).');
    });

    it('returns appropriate comment for much worse evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'Bc5', 60, -150);
      expect(comment).toBe('El movimiento de la partida (Ac5) era mucho mejor. Tu movimiento aún te deja en una posición razonable.');
    });

    it('returns appropriate comment for worse evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'Bc5', 60, -75);
      expect(comment).toBe('El movimiento de la partida (Ac5) era significativamente mejor. Tu movimiento aún te deja en una posición razonable.');
    });

    it('returns appropriate comment for slightly worse evaluation with high score', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'Bc5', 90, -20);
      expect(comment).toBe('El movimiento de la partida (Ac5) era ligeramente mejor. Tu movimiento seguía siendo bueno.');
    });

    it('returns appropriate comment for slightly worse evaluation with low score', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'Bc5', 40, -20);
      expect(comment).toBe('El movimiento de la partida (Ac5) era ligeramente mejor.');
    });

    it('returns appropriate comment for equal evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'Bc5', 100, 0);
      expect(comment).toBe('Tu movimiento es tan bueno como el de la partida (Ac5).');
    });

    it('returns appropriate comment for incorrect guess', () => {
      const comment = explainer.chooseEvaluationComment('incorrect', 'Bc5', 60, -50);
      expect(comment).toBe('El movimiento de la partida  era ligeramente mejor. Tu movimiento aún te deja en una posición razonable.');
    });

    it('handles empty parentheses in translations', () => {
      // Modify the mock translations to include empty parentheses
      global.window.TRANSLATIONS.evaluation.much_better = 'Tu movimiento es mucho mejor que %{game_move}()';
      
      const comment = explainer.chooseEvaluationComment('correct', 'Qe2', 200, 100);
      expect(comment).toBe('Tu movimiento es mucho mejor que De2');
    });
  });
}); 
