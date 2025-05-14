// Static imports for testing
import ChessRules from "./chess_rules.js";
import { COLOR, PIECE } from "./board_definitions.js";
import GameState from "./game_state.js";
import MoveLocalizer from "./move_localizer.js";
import Fen from "./fen.js";
import EvaluationExplainer from "./evaluation_explainer.js";
import ResultDisplay from "./result_display.js";
import ButtonUi from "./button_ui.js";
import BoardUi from "./board_ui.js";

export default class Guesser {
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
      this.BoardUi = BoardUi;
      this.initializeSync(data, chessboard);
    }
  }

  async initialize(data, chessboard) {
    const { loadModules } = await import(
      `./module_loader.js?v=${data.version}`
    );
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
    this.BoardUi = modules.BoardUi;
    this.initializeSync(data, chessboard);
  }

  initializeSync(data, chessboard) {
    this.locale = data.locale;
    this.moveLocalizer = new this.MoveLocalizer(this.locale);
    this.evaluationExplainer = new this.EvaluationExplainer(this.moveLocalizer);
    this.gameResult = data.gameResult;
    this.lastMoveElement = document.getElementById("last-move");
    this.moveInput = document.getElementById("move-input");
    this.boardUi = new this.BoardUi(chessboard, this.COLOR, this.PIECE);
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
      this.resultDisplay.hideGuessResult.bind(this.resultDisplay),
    );
    this.setupMoveInputListener();
    this.buttonUi.setupFlipBoardButton(
      this.boardUi.flipBoard.bind(this.boardUi),
    );
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
      },
    };
  }

  initializeGameState(fen) {
    this.boardUi.setPosition(fen);
    this.gameState = new this.GameState(fen, this.ChessRules, this.Fen);
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
    document.getElementById("white").textContent = data.white;
    document.getElementById("black").textContent = data.black;
    this.currentMoveIndex = 0;
    this.startingMoveIndex = 0;
    if (
      data.currentWholeMove &&
      data.currentWholeMove > this.startingWholeMove
    ) {
      const moveIncrement = this.sideToMove === "white" ? 0 : 1;
      const moveIndex =
        (data.currentWholeMove - this.startingWholeMove) * 2 + moveIncrement;
      if (!this.gameState.isWhiteToMove(moveIndex)) {
        this.boardUi.flipBoard();
      }
      this.goToMoveIndex(moveIndex);
    }
    this.updateLastMoveDisplay();
    this.updateGuessMode();
  }

  onMoveStart(square) {
    const piece = this.boardUi.getPiece(square);

    if (!piece) {
      return false;
    }

    const isWhitePiece = piece.charAt(0) === "w";
    const isWhiteToMove = this.gameState.isWhiteToMove(this.currentMoveIndex);

    // Only allow moving pieces if:
    // 1. It's the correct color's turn
    // 2. We're in the right guess mode
    // 3. We're not at game end
    if (
      this.isGameTerminated() ||
      isWhiteToMove !== isWhitePiece ||
      !this.isCorrectGuessMode(isWhitePiece)
    ) {
      return false;
    }

    return true;
  }

  isCorrectGuessMode(isWhitePiece) {
    return (
      this.guessMode() === "both" ||
      (this.guessMode() === "white" && isWhitePiece) ||
      (this.guessMode() === "black" && !isWhitePiece)
    );
  }

  onMoveCompleted(from, to) {
    const piece = this.boardUi.getPiece(from);
    const fen = this.boardUi.getPosition();

    if (!piece) {
      return false;
    }

    if (!this.gameState.isLegalMove(fen, from, to, piece)) {
      return false;
    }

    if (this.gameState.isPawnPromotion(to, piece)) {
      this.showPromotionDialog(from, to, piece, this.generateCompleteFen());
      return false; // Don't complete the move yet
    }

    if (piece === this.PIECE.wk || piece === this.PIECE.bk) {
      if (this.gameState.isCastling(piece, from, to)) {
        this.boardUi.performCastling(piece, to);
      }
    }

    this.submitGuess(from, to, piece, null, this.generateCompleteFen());
    this.boardUi.saveLastPosition(fen);
    return true;
  }

  setupMoveInputListener() {
    this.moveInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        const wholeMoveNumber = parseInt(this.moveInput.value, 10);
        if (
          isNaN(wholeMoveNumber) ||
          wholeMoveNumber < this.startingWholeMove ||
          wholeMoveNumber >
            Math.ceil(this.moves.length / 2) + (this.startingWholeMove - 1)
        ) {
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
    while (
      this.currentMoveIndex < targetMoveIndex &&
      this.currentMoveIndex < this.moves.length
    ) {
      this.moveForward();
    }

    this.updateLastMoveDisplay();
    this.updateButtonStates();
    this.moveInput.value = ""; // Clear the input after moving
  }

  guessMode() {
    const selectedRadio = document.querySelector(
      'input[name="guess_mode"]:checked',
    );
    return selectedRadio ? selectedRadio.value : "neither";
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
        this.updateGameState(uiMove, uiMove.piece);
        this.boardUi.executeMove(
          uiMove,
          this.gameState.isWhiteToMove(this.currentMoveIndex),
        );
      }
      this.currentMoveIndex++;
    }
    this.updateButtonStates();
    if (this.gameOver()) {
      this.resultDisplay.displayGameResult(this.gameResult);
    }
    this.updateLastMoveDisplay();
  }

  updateGameState(uiMove) {
    if (uiMove.moves.length === 0) {
      this.gameState.updateForPassingMove();
    } else {
      const [from, to] = uiMove.moves[0].split("-");
      if (uiMove.remove) {
        const capturedPiece = uiMove.remove[0];
        this.gameState.update(uiMove.piece, from, to, capturedPiece);
      } else {
        this.gameState.update(uiMove.piece, from, to);
      }
    }
  }

  moveBackward() {
    this.currentMoveIndex--;
    this.gameState.rewind();
    this.boardUi.reverseMove(
      this.uiMoves[this.currentMoveIndex],
      this.gameState.isWhiteToMove(this.currentMoveIndex),
    );
    this.updateButtonStates();
    this.updateLastMoveDisplay();
  }

  handleGuessResponse(data) {
    data.forEach((move) => {
      if (move.result == "auto_move") {
        if (this.guessMode() != "both") {
          this.moveForward();
        }
      } else {
        const explanation =
          this.currentMoveIndex < this.recordedGameLength
            ? this.evaluationExplainer.explainEvaluation(
                move,
                this.moves[this.currentMoveIndex],
              )
            : this.evaluationExplainer.explainEvaluationWithoutGameMove(move);
        this.resultDisplay.update(
          explanation.rating,
          explanation.headline,
          explanation.comment,
        );
        if (explanation.action == "use_game_move") {
          this.boardUi.restoreLastPosition();
          this.moveForward();
        } else if (explanation.action == "keep_guess") {
          this.addExtraMove(move.move);
        } else if (explanation.action == "pass_move") {
          this.gameState.updateForPassingMove();
        } else if (explanation.action == "add_extra_move") {
          this.addExtraMove(move.move);
        } else if (explanation.action == "restore_position") {
          this.boardUi.restoreLastPosition();
        } else if (move.result === "auto_move") {
          if (this.guessMode() != "both") {
            this.moveForward();
          }
        }
      }
    });
  }

  gameOver() {
    return this.currentMoveIndex >= this.moves.length;
  }

  isPastRecordedMoves() {
    return this.currentMoveIndex >= this.recordedGameLength;
  }

  submitGuess(source, target, piece, promotedPiece, oldPosition) {
    const currentMove = this.uiMoves[this.currentMoveIndex];
    if (
      currentMove &&
      this.isExactMatch(source, target, promotedPiece, currentMove)
    ) {
      this.updateGameState(currentMove, piece);
      this.handleCorrectGuess(currentMove);
      return;
    }

    const guessData = {
      path: window.location.pathname,
      old_pos: "" + oldPosition,
      current_move: this.currentMoveIndex + 1,
      game_move: this.uiMoves[this.currentMoveIndex],
      guessed_move: {
        source,
        target,
        piece: piece,
        promotion: promotedPiece ? promotedPiece.charAt(1) : undefined,
      },
    };

    fetch("/guess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(guessData),
    })
      .then((response) => response.json())
      .then(this.handleGuessResponse.bind(this));
  }

  isExactMatch(source, target, promotedPiece, currentMove) {
    // For a promotion move, we need to match both the move and the promotion piece
    if (currentMove.add) {
      const movePromotedPiece = currentMove.add[0].toLowerCase();
      return (
        currentMove.moves.some((move) => move === `${source}-${target}`) &&
        currentMove.add[0].toLowerCase() === promotedPiece[1]
      );
    }
    // For non-promotion moves, just match the move
    return currentMove.moves.some((move) => move === `${source}-${target}`);
  }

  showPromotionDialog(source, target, piece, oldPos) {
    const color = piece.charAt(0);
    const fen = this.boardUi.getPosition();
    this.boardUi.showPromotionDialog(target, color, (result) => {
      if (result && result.piece) {
        this.boardUi.setPiece(result.square, result.piece, true);
        this.boardUi.setPiece(source, null);
        this.submitGuess(source, target, piece, result.piece, oldPos);
      } else {
        this.boardUi.setPosition(fen);
      }
    });
  }

  updateButtonStates() {
    this.buttonUi.updateButtonStates(
      this.currentMoveIndex,
      this.moves.length,
      this.isPastRecordedMoves(),
      this.isGameTerminated(),
    );
  }

  fastForward() {
    const numMoves = this.moves.length + 1 - this.currentMoveIndex;
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
      this.lastMoveElement.textContent = "";
    } else {
      const lastMoveIndex = this.currentMoveIndex - 1;
      const moveNotation = this.moves[lastMoveIndex];

      this.setLastMoveDisplay(lastMoveIndex, moveNotation);
    }
  }

  setLastMoveDisplay(moveIndex, moveNotation) {
    const moveOffset = this.gameState.isWhiteToMove(moveIndex)
      ? moveIndex + 1
      : moveIndex;
    const wholeMoveNumber = Math.floor(moveOffset / 2) + this.startingWholeMove;
    const localizedMove = this.moveLocalizer.localize(moveNotation);
    this.lastMoveElement.textContent = `${wholeMoveNumber}${this.gameState.isWhiteToMove(moveIndex) ? "." : "..."} ${localizedMove}`;
  }

  requestEngineBestMove() {
    fetch("/engine_move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fen: this.generateCompleteFen(),
        path: window.location.pathname,
      }),
    })
      .then((response) => response.json())
      .then((data) => {
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
    if (this.moveMade(move)) {
      this.currentMoveIndex++;
      this.updateButtonStates();
      this.updateLastMoveDisplay();
    } else {
      this.moveForward();
    }

    // Add checkmate symbol if the position is checkmate
    if (!move.notation.endsWith("#")) {
      if (
        this.gameState.isCheckmate(
          this.boardUi.getPosition(),
          this.currentMoveIndex,
        )
      ) {
        move.notation += "#";
        this.moves[this.currentMoveIndex - 1] = move.notation;
        this.updateLastMoveDisplay();
      } else if (!move.notation.endsWith("+")) {
        if (
          this.gameState.isCheck(
            this.boardUi.getPosition(),
            this.currentMoveIndex,
          )
        ) {
          move.notation += "+";
          this.moves[this.currentMoveIndex - 1] = move.notation;
          this.updateLastMoveDisplay();
        }
      }
    }
  }

  moveMade(move) {
    const originSquare = move.moves[0].split("-")[0];
    return this.boardUi.getPiece(originSquare) == null;
  }

  generateCompleteFen() {
    const partialFen = this.boardUi.getPosition();
    return this.gameState.generateCompleteFen(
      partialFen,
      this.currentMoveIndex,
    );
  }

  handleCorrectGuess(move) {
    if (move.remove) {
      this.boardUi.setPiece(move.remove[1], null);
    }
    if (!this.isPastRecordedMoves()) {
      this.resultDisplay.update(
        "good",
        window.TRANSLATIONS.guess.correct.correct_exclamation,
        window.TRANSLATIONS.guess.correct.same_as_game,
      );
    }
    this.currentMoveIndex++;
    // autoplay the opponent's move unless guess mode is both
    if (this.guessMode() !== "both") {
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
      const guessMode = sideToMove === "white" ? "white" : "black";
      const radioButton = document.querySelector(
        `input[name="guess_mode"][value="${guessMode}"]`,
      );
      if (radioButton) {
        radioButton.checked = true;
      }
    }
  }

  isGameTerminated() {
    return this.gameState.isGameTerminated(
      this.boardUi.getPosition(),
      this.currentMoveIndex,
    );
  }
}
