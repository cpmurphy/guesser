// Static imports for testing
import ChessRules from './chess_rules.js';
import { COLOR, PIECE } from './board_definitions.js';
import GameState from './game_state.js';
import MoveLocalizer from './move_localizer.js';
import { loadModules } from './module_loader.js';

export default class Board {
  constructor(data, chessboard) {
    if (data.version) {
      // Production mode - use dynamic loading
      this.initialize(data, chessboard);
    } else {
      // Test mode - use static imports
      this.ChessRules = ChessRules;
      this.COLOR = COLOR;
      this.PIECE = PIECE;
      this.GameState = GameState;
      this.MoveLocalizer = MoveLocalizer;

      this.initializeSync(data, chessboard);
    }
  }

  async initialize(data, chessboard) {
    const modules = await loadModules(data.version);
    this.ChessRules = modules.ChessRules;
    this.COLOR = modules.COLOR;
    this.PIECE = modules.PIECE;
    this.GameState = modules.GameState;
    this.MoveLocalizer = modules.MoveLocalizer;

    this.initializeSync(data, chessboard);
  }

  initializeSync(data, chessboard) {
    this.locale = data.locale;
    this.moveLocalizer = new this.MoveLocalizer(this.locale);
    this.gameResult = data.gameResult;
    this.lastMoveElement = document.getElementById('last-move');
    this.moveInput = document.getElementById('move-input');
    this.board = chessboard;
    this.setupUserInterface();
    this.onGameLoaded(data);
  }

  setupUserInterface() {
    this.setupMoveButtons();
    this.setupMoveInputListener();
    this.setupFlipBoardButton();
    this.setupMoveHandlers();
    this.setupExportFenButton();
    this.setupEngineMoveButton();
  }

  setupMoveHandlers() {
    return {
      onMoveStart: (square) => {
        return this.onMoveStart(square);
      },
      onMoveCompleted: (from, to) => {
        return this.onMoveCompleted(from, to);
      }
    }
  }

  initializeGameState(fen) {
    this.board.setPosition(fen);
    this.lastPosition = this.board.getPosition();
    this.gameState = new this.GameState(fen, this.ChessRules);
    this.hideGuessResult();
    this.initializeButtonStates(false);
  }

  onGameLoaded(data) {
    this.initializeGameState(data.fen);
    this.initializeButtonStates(data.moves.length > 0);
    this.initializeGuessMode(data.currentWholeMove, data.sideToMove);
    this.moves = data.moves;
    this.recordedGameLength = data.moves.length;
    this.result = data.result;
    this.uiMoves = data.uiMoves;
    this.startingWholeMove = data.startingWholeMove;
    this.currentWholeMove = data.currentWholeMove;
    this.sideToMove = data.sideToMove;
    this.fen = data.fen;
    this.gameResult = data.gameResult;
    document.getElementById('white').textContent = data.white;
    document.getElementById('black').textContent = data.black;
    this.currentMoveIndex = 0;
    this.startingMoveIndex = 0;
    if (data.currentWholeMove && data.currentWholeMove > this.startingWholeMove) {
      const moveIncrement = this.sideToMove === 'white' ? 0 : 1;
      const moveIndex = (data.currentWholeMove - this.startingWholeMove) * 2 + moveIncrement;
      if (!this.gameState.isWhiteToMove(moveIndex)) {
        this.flipBoard();
      }
      this.goToMoveIndex(moveIndex);
    }
    this.updateLastMoveDisplay();
    this.updateGuessMode();

  }

  onMoveStart(square) {
    const piece = this.board.getPiece(square);

    if (!piece) {
      return false;
    }

    const isWhitePiece = piece.charAt(0) === 'w';
    const isWhiteToMove = this.gameState.isWhiteToMove(this.currentMoveIndex);

    // Only allow moving pieces if:
    // 1. It's the correct color's turn
    // 2. We're in the right guess mode
    // 3. We're not at game end
    if (this.isGameTerminated() ||
      isWhiteToMove !== isWhitePiece ||
      !this.isCorrectGuessMode(isWhitePiece)) {
      return false;
    }

    return true;
  }

  isCorrectGuessMode(isWhitePiece) {
    return this.guessMode() === 'both' ||
      (this.guessMode() === 'white' && isWhitePiece) ||
      (this.guessMode() === 'black' && !isWhitePiece);
  }

  onMoveCompleted(from, to) {
    const piece = this.board.getPiece(from);
    const position = this.board.getPosition();

    if (!piece) {
      return false;
    }

    if (!this.isLegalMove(from, to, piece)) {
      return false;
    }
    this.lastPosition = position;

    if (this.isPawnPromotion(from, to, piece)) {
      this.showPromotionDialog(from, to, piece, this.generateCompleteFen());
      return false; // Don't complete the move yet
    }

    if (piece === this.PIECE.wk || piece === this.PIECE.bk) {
      if (this.isCastling(piece, from, to)) {
        this.performCastling(piece, to, position);
      }
    }

    this.submitGuess(from, to, piece, null, this.generateCompleteFen());
    return true;
  }

  isLegalMove(from, to, piece) {
    return this.gameState.isLegalMove(this.board.getPosition(), from, to, piece);
  }

  isWhiteToMove(moveIndex) {
    return this.gameState.isWhiteToMove(moveIndex);
  }

  position(fen) {
    this.board.setPosition(fen);
  }

  setupMoveButtons() {
    const buttons = [
      { id: 'fastRewindBtn', action: this.fastRewind.bind(this) },
      { id: 'backwardBtn', action: this.moveBackward.bind(this) },
      { id: 'forwardBtn', action: this.moveForward.bind(this) },
      { id: 'fastForwardBtn', action: this.fastForward.bind(this) }
    ];

    buttons.forEach(({ id, action }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.hideGuessResult();
          action();
        });
      }
    });
  }

  setupMoveInputListener() {
    this.moveInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const wholeMoveNumber = parseInt(this.moveInput.value, 10);
        if (isNaN(wholeMoveNumber) || wholeMoveNumber < this.startingWholeMove || wholeMoveNumber > Math.ceil(this.moves.length / 2) + (this.startingWholeMove - 1)) {
          alert(window.TRANSLATIONS.moves.invalid_number);
          return;
        }
        this.goToMoveIndex((wholeMoveNumber - this.startingWholeMove) * 2 + 1);
      }
    });
  }

  goToMoveIndex(targetMoveIndex) {
    while (this.currentMoveIndex > targetMoveIndex) {
      this.moveBackward();
    }
    while (this.currentMoveIndex < targetMoveIndex && this.currentMoveIndex < this.moves.length) {
      this.moveForward();
    }

    this.updateLastMoveDisplay();
    this.updateButtonStates();
    this.moveInput.value = ''; // Clear the input after moving
  }

  guessMode() {
    const selectedRadio = document.querySelector('input[name="guess_mode"]:checked');
    return selectedRadio ? selectedRadio.value : 'neither';
  }

  updateGuessMode(sideToMove) {
    if (sideToMove) {
      document.querySelector(`input[value="${sideToMove}"]`).checked = true;
    }
  }

  initializeButtonStates(pgnLoaded) {
    const backBtn = document.getElementById('backwardBtn');
    backBtn.disabled = true;
    const forwardBtn = document.getElementById('forwardBtn');
    forwardBtn.disabled = !pgnLoaded;
  }

  moveForward() {
    if (!this.gameOver()) {
      const uiMove = this.uiMoves[this.currentMoveIndex];
      if (uiMove.moves.length > 0) {
          const piece = this.translatePiece(uiMove.piece);
          this.updateGameState(uiMove, piece);
        if (!uiMove.remove && !uiMove.add) {
          uiMove.moves.forEach(m => {
            const [from, to] = m.split('-');
            this.board.movePiece(from, to, true);
          });
        } else {
          uiMove.moves.forEach(m => {
            const [from, to] = m.split('-');
            this.board.movePiece(from, to, true);
          });
          if (uiMove.remove && uiMove.remove[1] != uiMove.moves[0].substring(3, 5)) {
            this.board.setPiece(uiMove.remove[1], null);
          }
          if (uiMove.add) {
            this.board.setPiece(uiMove.add[1], this.translatePiece(uiMove.add[0]));
          }
        }
      }
      this.currentMoveIndex++;
    }
    this.updateButtonStates();
    if (this.gameOver()) {
      this.displayGameResult();
    }
    this.updateLastMoveDisplay();
  }

  updateGameState(uiMove, piece) {
    if (uiMove.moves.length === 0) {
      this.gameState.updateForPassingMove();
    } else {
      const [from, to] = uiMove.moves[0].split('-');
      if (uiMove.remove) {
        const capturedPiece = uiMove.remove[0];
        this.gameState.update(piece, from, to, capturedPiece);
      } else {
        this.gameState.update(piece, from, to);
      }
    }
  }

  displayGameResult() {
    const guessResult = document.getElementById('guess_result');

    // Check if the result span already exists
    let resultSpan = guessResult.querySelector('.game-result');

    if (!resultSpan) {
      // If it doesn't exist, create a new span
      resultSpan = document.createElement('span');
      resultSpan.className = 'game-result';
      resultSpan.style.marginLeft = '10px';  // Add some space between existing content and result
      guessResult.appendChild(resultSpan);
    }

    resultSpan.textContent = this.gameResult || 'Game Over';
    resultSpan.style.color = 'blue';
  }

  moveBackward() {
    this.currentMoveIndex--;
    this.gameState.rewind();
    this.reverseMove(this.uiMoves[this.currentMoveIndex]);
    this.updateButtonStates();
    this.updateLastMoveDisplay();
  }

  reverseMove(uiMove) {
    if (uiMove.moves && Array.isArray(uiMove.moves)) {
      if (uiMove.add) {
        // reverse the addition of the piece
        this.board.setPiece(uiMove.add[1], this.pawnForCurrentMove());
      }
      uiMove.moves.forEach(m => this.board.movePiece(...m.split('-').reverse(), true));
      if (uiMove.remove || uiMove.add) {
        if (uiMove.remove) {
          // reverse the removal of the piece
          this.board.setPiece(uiMove.remove[1], this.translatePiece(uiMove.remove[0]));
        }
      }
    }
  }

  translatePiece(piece) {
    if (piece.match(/^[rnbqkp]$/)) {
      return "b" + piece.toLowerCase();
    } else {
      return "w" + piece.toLowerCase();
    }
  }

  pawnForCurrentMove() {
    if (this.gameState.isWhiteToMove(this.currentMoveIndex)) {
      return this.PIECE.wp;
    } else {
      return this.PIECE.bp;
    }
  }

  handleGuessResponse(data) {
    data.forEach((move) => {
      if (move.result === 'correct') {
        if (move.same_as_game) {
          this.updateGuessStatus(
            'green',
            window.TRANSLATIONS.guess.correct.correct_exclamation,
            window.TRANSLATIONS.guess.correct.same_as_game
          );
          this.moveForward();
        } else {
          const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
          const evalComment = this.getEvaluationComment(move.result, move.game_move, move.guess_eval.score, evalDiff);
          var headline;
          if (move.guess_eval.score > 100 && evalDiff > -30) {
            headline = window.TRANSLATIONS.guess.correct.good_move;
          } else {
            headline = window.TRANSLATIONS.guess.correct.good_guess;
          }

          this.updateGuessStatus(
            'green',
            headline,
            evalComment
          );
          this.board.setPosition(this.lastPosition);
          this.moveForward();
        }
      } else if (move.result === 'incorrect') {
        if (move.game_move === '--') {
          this.updateGuessStatus(
            'black',
            '',
            window.TRANSLATIONS.guess.move_was_passed
          );
        } else {
          const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
          const evalComment = this.getEvaluationComment(move.result, move.game_move, move.guess_eval.score, evalDiff);
          this.updateGuessStatus(
            'red',
            window.TRANSLATIONS.guess.incorrect,
            evalComment
          );
        }
        this.board.setPosition(this.lastPosition);
      } else if (move.result === 'auto_move') {
        if (this.guessMode() != 'both') {
          this.moveForward();
        }
      } else if (move.result === 'game_over') {
        this.updateGuessStatus(
          'green',
          '',
          window.TRANSLATIONS.guess.beyond_game
        );
        this.addExtraMove(move);
      }
    });
  }

  hideGuessResult() {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');
    if (guessResult) guessResult.textContent = '';
    if (guessComment) guessComment.textContent = '';
    if (guessSubcomment) guessSubcomment.textContent = '';
  }

  isPieceAvailableToMove(piece) {
    const currentGuessMode = this.guessMode();
    const pieceColor = piece.charAt(0);
    if (pieceColor === 'w' && !this.gameState.isWhiteToMove(this.currentMoveIndex)) {
      return false;
    }
    if (pieceColor === 'b' && this.gameState.isWhiteToMove(this.currentMoveIndex)) {
      return false;
    }
    return currentGuessMode === 'both' ||
       (currentGuessMode === 'white' && pieceColor === 'w') ||
       (currentGuessMode === 'black' && pieceColor === 'b');
  }

  gameOver() {
    return this.currentMoveIndex >= this.moves.length;
  }

  isPastRecordedMoves() {
    return this.currentMoveIndex >= this.recordedGameLength;
  }

  submitGuess(source, target, piece, promotedPiece, oldPosition) {
    const currentMove = this.uiMoves[this.currentMoveIndex];
    if (currentMove && this.isExactMatch(source, target, promotedPiece, currentMove)) {
      this.updateGameState(currentMove, piece);
      this.handleCorrectGuess(currentMove);
      return;
    }

    const guessData = {
      path: window.location.pathname,
      current_move: this.currentMoveIndex + 1,
      game_move: this.uiMoves[this.currentMoveIndex],
      number_of_moves: this.moves.length,
      guessed_move: {
        source,
        target,
        piece: piece,
        promotion: promotedPiece ? promotedPiece.charAt(1) : undefined,
        oldPos: "" + oldPosition
      }
    };

    fetch('/guess', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guessData)
    })
    .then(response => response.json())
    .then(this.handleGuessResponse.bind(this));
  }

  isExactMatch(source, target, promotedPiece, currentMove) {
    // For a promotion move, we need to match both the move and the promotion piece
    if (currentMove.add) {
      const movePromotedPiece = currentMove.add[0].toLowerCase();
      return currentMove.moves.some(move => move === `${source}-${target}`) &&
             currentMove.add[0].toLowerCase() === promotedPiece[1];
    }
    // For non-promotion moves, just match the move
    return currentMove.moves.some(move => move === `${source}-${target}`);
  }

  showPromotionDialog(source, target, piece, oldPos) {
    const color = piece.charAt(0);
    const position = this.board.getPosition();
    this.board.showPromotionDialog(target, color, (result) => {
      if (result && result.piece) {
        this.board.setPiece(result.square, result.piece, true)
        this.board.setPiece(source, null)
        this.submitGuess(source, target, piece, result.piece, oldPos);
      } else {
        this.board.setPosition(position)
      }
    });
  }

  isPawnPromotion(from, to, piece) {
    if (!piece.endsWith('p')) return false;
    const targetRank = to[1];
    return (piece.startsWith('w') && targetRank === '8') ||
           (piece.startsWith('b') && targetRank === '1');
  }

  isCastling(piece, source, target) {
    const kingside = (piece === this.PIECE.wk && source === 'e1' && target === 'g1') ||
      (piece === this.PIECE.bk && source === 'e8' && target === 'g8');
    const queenside = (piece === this.PIECE.wk && source === 'e1' && target === 'c1') ||
      (piece === this.PIECE.bk && source === 'e8' && target === 'c8');
    return kingside || queenside;
  }

  performCastling(piece, target) {
    let rookSource, rookTarget;

    if (piece === this.PIECE.wk) {
      if (target === 'g1') {
        rookSource = 'h1';
        rookTarget = 'f1';
      } else if (target === 'c1') {
        rookSource = 'a1';
        rookTarget = 'd1';
      }
    } else if (piece === this.PIECE.bk) {
      if (target === 'g8') {
        rookSource = 'h8';
        rookTarget = 'f8';
      } else if (target === 'c8') {
        rookSource = 'a8';
        rookTarget = 'd8';
      }
    }

    this.board.movePiece(rookSource, rookTarget, true);
  }

  updateButtonStates() {
    const buttons = [
      { id: 'fastRewindBtn', disabled: this.currentMoveIndex <= 0 },
      { id: 'backwardBtn', disabled: this.currentMoveIndex <= 0 },
      { id: 'forwardBtn', disabled: this.currentMoveIndex >= this.moves.length },
      { id: 'fastForwardBtn', disabled: this.currentMoveIndex >= this.moves.length },
      { id: 'engineMoveBtn', disabled: !this.isPastRecordedMoves() || this.isGameTerminated() }
    ];

    buttons.forEach(({ id, disabled }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = disabled;
      }
    });
  }

  setupFlipBoardButton() {
    const flipBtn = document.getElementById('flipBoardBtn');
    flipBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.flipBoard();
    });
  }

  flipBoard() {
    if (this.board.getOrientation() === this.COLOR.white) {
      this.board.setOrientation(this.COLOR.black);
    } else {
      this.board.setOrientation(this.COLOR.white);
    }
  }

  fastForward() {
    const numMoves = (this.moves.length + 1) - this.currentMoveIndex;
    this.sequentialMove(numMoves, this.moveForward.bind(this));
  }

  fastRewind() {
    const numMoves = this.currentMoveIndex;
    this.sequentialMove(numMoves, this.moveBackward.bind(this));
  }

  sequentialMove(numMoves, moveFunction) {
    const move = () => {
      if (numMoves > 0) {
        moveFunction();
        numMoves--;
        setTimeout(move, 10);
      }
    };

    move();
  }

  updateLastMoveDisplay() {
    if (this.currentMoveIndex <= 0) {
      this.lastMoveElement.textContent = '';
    } else {
      const lastMoveIndex = this.currentMoveIndex - 1;
      const moveNotation = this.moves[lastMoveIndex];

      this.setLastMoveDisplay(lastMoveIndex, moveNotation);
    }
  }

  setLastMoveDisplay(moveIndex, moveNotation) {
    const moveOffset = this.gameState.isWhiteToMove(moveIndex) ? moveIndex + 1 : moveIndex;
    const wholeMoveNumber = Math.floor(moveOffset / 2) + this.startingWholeMove;
    const localizedMove = this.moveLocalizer.localize(moveNotation);
    this.lastMoveElement.textContent = `${wholeMoveNumber}${this.gameState.isWhiteToMove(moveIndex) ? '.' : '...'} ${localizedMove}`;
  }

  setupExportFenButton() {
    const exportBtn = document.getElementById('exportFenBtn');
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const fen = this.generateCompleteFen();
      navigator.clipboard.writeText(fen).then(() => {
        let messageDiv = document.getElementById('copy-message');
        if (!messageDiv) {
          messageDiv = document.createElement('div');
          messageDiv.id = 'copy-message';
          messageDiv.style.position = 'fixed';
          messageDiv.style.padding = '10px';
          messageDiv.style.backgroundColor = '#4CAF50';
          messageDiv.style.color = 'white';
          messageDiv.style.borderRadius = '5px';
          messageDiv.style.zIndex = '1000';
          document.body.appendChild(messageDiv);
        }

        messageDiv.classList.remove('fade-out');
        messageDiv.style.display = 'block';

        const btnRect = exportBtn.getBoundingClientRect();
        messageDiv.style.top = `${btnRect.bottom + 5}px`;
        messageDiv.style.left = `${btnRect.left}px`;

        messageDiv.textContent = window.TRANSLATIONS.fen.copied;

        // Start fade out after 1.5 seconds
        setTimeout(() => {
          messageDiv.classList.add('fade-out');
          // Hide the element after the animation completes
          setTimeout(() => {
            messageDiv.style.display = 'none';
          }, 300); // matches animation duration
        }, 1500);
      });
    });
  }

  setupEngineMoveButton() {
    const engineMoveBtn = document.getElementById('engineMoveBtn');
    engineMoveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      this.requestEngineBestMove();
    });
    engineMoveBtn.disabled = true;
  }

  requestEngineBestMove() {
    fetch('/engine_move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fen: this.generateCompleteFen(),
        path: window.location.pathname
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.move) {
        this.addExtraMove(data.move);
      }
    });
  }

  addExtraMove(move) {
    if (this.currentMoveIndex <= this.moves.length - 1) {
      // truncate the uiMoves and moves arrays
      this.uiMoves = this.uiMoves.slice(0, this.currentMoveIndex);
      this.moves = this.moves.slice(0, this.currentMoveIndex);
    }

    this.uiMoves.push(move);
    this.moves.push(move.notation);
    this.moveForward();

    // Add checkmate symbol if the position is checkmate
    if (!move.notation.endsWith('#')) {
      if (this.isCheckmate()) {
        move.notation += '#';
        this.moves[this.currentMoveIndex-1] = move.notation;
        this.updateLastMoveDisplay();
      }
    }
  }

  isCheckmate() {
    return this.gameState.isCheckmate(this.board.getPosition(), this.currentMoveIndex);
  }

  generateCompleteFen() {
    const piecePlacement = this.board.getPosition();
    const activeColor = this.gameState.isWhiteToMove(this.currentMoveIndex) ? 'w' : 'b';
    // Calculate the full move number
    const fullmoveNumber = Math.floor(this.currentMoveIndex / 2) + this.startingWholeMove;

    return `${piecePlacement} ${activeColor} ${this.gameState.stringForFen()} ${fullmoveNumber}`;
  }

  formatEvaluation(evaluation) {
    if (!evaluation) return '';

    const formatScore = (score) => {
        if (typeof score === 'number') {
            return score > 0 ? `+${(score/100).toFixed(2)}` : `${(score/100).toFixed(2)}`;
        }
        return score;
    };

    const e = formatScore(evaluation);

    return `Evaluation: ${e}`;
  }

  compareEvaluations(guessEval, gameEval) {
    if (!guessEval || !gameEval) return 0;
    return guessEval - gameEval;
  }

  getEvaluationComment(guessResult, gameMove, guessEval, evalDiff) {
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

  handleCorrectGuess(move) {
    if (move.remove) {
      this.board.setPiece(move.remove[1], null);
    }
    if (!this.isPastRecordedMoves()) {
      this.updateGuessStatus('green', window.TRANSLATIONS.guess.correct.correct_exclamation, window.TRANSLATIONS.guess.correct.same_as_game);
    }
    this.currentMoveIndex++;
    // autoplay the opponent's move unless guess mode is both
    if (this.guessMode() !== 'both') {
      setTimeout(() => {
        this.moveForward();
      }, 200);
    }
    this.updateButtonStates();
    this.updateLastMoveDisplay();
    if (this.gameOver()) {
      this.displayGameResult();
    }
  }

  updateGuessStatus(headlineColor, headlineText, commentText) {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');

    guessResult.style.color = headlineColor;
    guessResult.textContent = headlineText;
    guessComment.textContent = commentText;
  }

  initializeGuessMode(currentWholeMove, sideToMove) {
    if (currentWholeMove !== 1) {
      const guessMode = sideToMove === 'white' ? 'white' : 'black';
      const radioButton = document.querySelector(`input[name="guess_mode"][value="${guessMode}"]`);
      if (radioButton) {
        radioButton.checked = true;
      }
    }
  }

  isGameTerminated() {
    return this.gameState.isGameTerminated(this.board.getPosition(), this.currentMoveIndex);
  }

}
