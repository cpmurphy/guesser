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
    much_better: 'Your move is even better than the game move (%{game_move})!',
    slightly_better: 'Your move is slightly better than the game move (%{game_move}).',
    much_worse: 'The game move (%{move}) was much better.',
    worse: 'The game move (%{move}) was significantly better.',
    slightly_worse: 'The game move (%{move}) was slightly better.',
    equal: 'Your move is about as good as the game move (%{move}).',
    not_as_good: 'Your move was not as good as the game move.',
    still_good: 'Your move was still good.',
    reasonable: 'Your move still leaves you with a reasonable position.'
  }
};

// Mock the MoveLocalizer class
class MockMoveLocalizer {
  localize(move) {
    return move; // Simply return the move as is for testing
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
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Your move is even better than the game move (e4)!');
    });

    it('returns appropriate comment for slightly better evaluation', () => {
      const move = {
        guess_eval: { score: 120 },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Your move is slightly better than the game move (e4).');
    });

    it('returns appropriate comment for much worse evaluation', () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 200 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('The game move (e4) was much better. Your move still leaves you with a reasonable position.');
    });

    it('returns appropriate comment for worse evaluation', () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 150 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('The game move (e4) was significantly better. Your move still leaves you with a reasonable position.');
    });

    it('returns appropriate comment for slightly worse evaluation with high score', () => {
      const move = {
        guess_eval: { score: 90 },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Your move is about as good as the game move (e4).');
    });

    it('returns appropriate comment for slightly worse evaluation with low score', () => {
      const move = {
        guess_eval: { score: 40 },
        game_eval: { score: 50 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Your move is about as good as the game move (e4).');
    });

    it('returns appropriate comment for equal evaluation', () => {
      const move = {
        guess_eval: { score: 100 },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Your move is about as good as the game move (e4).');
    });

    it('returns appropriate comment for incorrect guess', () => {
      const move = {
        guess_eval: { score: 60 },
        game_eval: { score: 200 },
        result: 'incorrect',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('The game move  was much better. Your move still leaves you with a reasonable position.');
    });

    it('handles null or undefined evaluations', () => {
      const move = {
        guess_eval: { score: null },
        game_eval: { score: 100 },
        result: 'correct',
        game_move: 'e4'
      };
      
      const explanation = explainer.explainEvaluation(move);
      expect(explanation.comment).toBe('Your move is about as good as the game move (e4).');
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
      expect(comment).toBe('Your move is even better than the game move (e4)!');
    });

    it('returns appropriate comment for slightly better evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 120, 20);
      expect(comment).toBe('Your move is slightly better than the game move (e4).');
    });

    it('returns appropriate comment for much worse evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 60, -150);
      expect(comment).toBe('The game move (e4) was much better. Your move still leaves you with a reasonable position.');
    });

    it('returns appropriate comment for worse evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 60, -75);
      expect(comment).toBe('The game move (e4) was significantly better. Your move still leaves you with a reasonable position.');
    });

    it('returns appropriate comment for slightly worse evaluation with high score', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 90, -20);
      expect(comment).toBe('The game move (e4) was slightly better. Your move was still good.');
    });

    it('returns appropriate comment for slightly worse evaluation with low score', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 40, -20);
      expect(comment).toBe('The game move (e4) was slightly better.');
    });

    it('returns appropriate comment for equal evaluation', () => {
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 100, 0);
      expect(comment).toBe('Your move is about as good as the game move (e4).');
    });

    it('returns appropriate comment for incorrect guess', () => {
      const comment = explainer.chooseEvaluationComment('incorrect', 'e4', 60, -50);
      expect(comment).toBe('The game move  was slightly better. Your move still leaves you with a reasonable position.');
    });

    it('handles empty parentheses in translations', () => {
      // Modify the mock translations to include empty parentheses
      global.window.TRANSLATIONS.evaluation.much_better = 'Your move is much better than %{game_move}()';
      
      const comment = explainer.chooseEvaluationComment('correct', 'e4', 200, 100);
      expect(comment).toBe('Your move is much better than e4');
    });
  });
}); 
