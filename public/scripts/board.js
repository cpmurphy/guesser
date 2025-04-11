// Static imports for testing
import ChessRules from './chess_rules.js';
import { COLOR, PIECE } from './board_definitions.js';
import GameState from './game_state.js';
import MoveLocalizer from './move_localizer.js';
import { loadModules } from './module_loader.js';
import Fen from './fen.js';
import EvaluationExplainer from './evaluation_explainer.js';
import ResultDisplay from './result_display.js';
import ButtonUi from './button_ui.js';

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
      this.Fen = Fen;
      this.EvaluationExplainer = EvaluationExplainer;
      this.ResultDisplay = ResultDisplay;
      this.ButtonUi = ButtonUi;
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
    this.Fen = modules.Fen;
    this.EvaluationExplainer = modules.EvaluationExplainer;
    this.ResultDisplay = modules.ResultDisplay;
    this.ButtonUi = modules.ButtonUi;
    this.initializeSync(data, chessboard);
  }

  initializeSync(data, chessboard) {
    this.locale = data.locale;
    this.moveLocalizer = new this.MoveLocalizer(this.locale);
    this.evaluationExplainer = new this.EvaluationExplainer(this.moveLocalizer);
    this.gameResult = data.gameResult;
    this.lastMoveElement = document.getElementById('last-move');
    this.moveInput = document.getElementById('move-input');
    this.board = chessboard;
    this.resultDisplay = new this.ResultDisplay();
    this.buttonUi = new this.ButtonUi();
    this.setupUserInterface();
    this.onGameLoaded(data);
  }

  setupUserInterface() {
    this.buttonUi.setupMoveButtons(
      this.fastRewind.bind(this),
      this.moveBackward.bind(this),
      this.moveForward.bind(this),
      this.fastForward.bind(this),
      this.resultDisplay.hideGuessResult.bind(this.resultDisplay)
    );
    this.setupMoveInputListener();
    this.buttonUi.setupFlipBoardButton(this.flipBoard.bind(this));
    this.setupMoveHandlers();
    this.buttonUi.setupExportFenButton(this.generateCompleteFen.bind(this));
    this.buttonUi.setupEngineMoveButton(this.requestEngineBestMove.bind(this));
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
    this.gameState = new this.GameState(fen, this.ChessRules, this.Fen, this.PIECE);
    this.resultDisplay.hideGuessResult();
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
    const fen = this.board.getPosition();

    if (!piece) {
      return false;
    }

    if (!this.gameState.isLegalMove(fen, from, to, piece)) {
      return false;
    }
    this.lastPosition = fen;

    if (this.gameState.isPawnPromotion(to, piece)) {
      this.showPromotionDialog(from, to, piece, this.generateCompleteFen());
      return false; // Don't complete the move yet
    }

    if (piece === this.PIECE.wk || piece === this.PIECE.bk) {
      if (this.gameState.isCastling(piece, from, to)) {
        this.performCastling(piece, to, fen);
      }
    }

    this.submitGuess(from, to, piece, null, this.generateCompleteFen());
    return true;
  }

  position(fen) {
    this.board.setPosition(fen);
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
    this.buttonUi.initializeButtonStates(pgnLoaded);
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
      this.resultDisplay.displayGameResult(this.gameResult);
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
          this.resultDisplay.goodGuess(
            window.TRANSLATIONS.guess.correct.correct_exclamation,
            window.TRANSLATIONS.guess.correct.same_as_game
          );
          this.moveForward();
        } else {
          const evalComment = this.evaluationExplainer.getEvaluationComment(move);
          const headline = this.evaluationExplainer.getEvaluationHeadline(move);

          this.resultDisplay.goodGuess(
            headline,
            evalComment
          );
          this.board.setPosition(this.lastPosition);
          this.moveForward();
        }
      } else if (move.result === 'incorrect') {
        if (move.game_move === '--') {
          this.resultDisplay.neutralGuess(
            '',
            window.TRANSLATIONS.guess.move_was_passed
          );
        } else {
          const evalComment = this.evaluationExplainer.getEvaluationComment(move);
          this.resultDisplay.badGuess(
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
        this.resultDisplay.neutralGuess(
          '',
          window.TRANSLATIONS.guess.beyond_game
        );
        this.addExtraMove(move);
      }
    });
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
    const fen = this.board.getPosition();
    this.board.showPromotionDialog(target, color, (result) => {
      if (result && result.piece) {
        this.board.setPiece(result.square, result.piece, true)
        this.board.setPiece(source, null)
        this.submitGuess(source, target, piece, result.piece, oldPos);
      } else {
        this.board.setPosition(fen)
      }
    });
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
    this.buttonUi.updateButtonStates(
      this.currentMoveIndex,
      this.moves.length,
      this.isPastRecordedMoves(),
      this.isGameTerminated()
    );
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
      if (this.gameState.isCheckmate(this.board.getPosition(), this.currentMoveIndex)) {
        move.notation += '#';
        this.moves[this.currentMoveIndex-1] = move.notation;
        this.updateLastMoveDisplay();
      }
    }
  }

  generateCompleteFen() {
    const partialFen = this.board.getPosition();
    return this.gameState.generateCompleteFen(partialFen, this.currentMoveIndex);
  }

  handleCorrectGuess(move) {
    if (move.remove) {
      this.board.setPiece(move.remove[1], null);
    }
    if (!this.isPastRecordedMoves()) {
      this.resultDisplay.goodGuess(window.TRANSLATIONS.guess.correct.correct_exclamation, window.TRANSLATIONS.guess.correct.same_as_game);
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
      this.resultDisplay.displayGameResult(this.gameResult);
    }
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
