import ChessRules from "./chess_rules.js";
import { COLOR, PIECE } from "./board_definitions.js";
import GameState from "./game_state.js";

export default class Board {
  constructor(data, chessboard) {
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
    this.lastPosition = this.board.getPosition();
    this.gameState = new GameState(fen);
    this.hideGuessResult();
    this.initializeButtonStates(false);
  }

  onGameLoaded(data) {
    this.initializeGameState(data.fen);
    this.initializeButtonStates(data.moves.length > 0);
    this.initializeGuessMode(data.currentWholeMove, data.sideToMove);
    this.moves = data.moves;
    this.result = data.result;
    this.uiMoves = data.uiMoves;
    this.startingWholeMove = data.startingWholeMove;
    this.currentWholeMove = data.currentWholeMove;
    this.sideWithFirstMove = this.extractSideFromFen(data.fen);
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
      if (!this.isWhiteToMove(moveIndex)) {
        this.flipBoard();
      }
      this.goToMoveIndex(moveIndex);
    }
    this.updateLastMoveDisplay();
    this.updateGuessMode();

  }


  // Replace old onDragStart with new onMoveStart
  onMoveStart(square) {
    const piece = this.board.getPiece(square);

    if (!piece) {
      return false;
    }

    const isWhitePiece = piece.charAt(0) === 'w';
    const isWhiteToMove = this.isWhiteToMove(this.currentMoveIndex);

    // Only allow moving pieces if:
    // 1. It's the correct color's turn
    // 2. We're in the right guess mode
    // 3. We're not at game end
    if (this.gameOver() ||
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

    const chessRules = new ChessRules(position, this.gameState.enPassant, this.gameState.castlingRights);
    if (!chessRules.isLegalMove(from, to, piece)) {
      return false;
    }
    this.lastPosition = position;

    if (this.isPawnPromotion(from, to, piece)) {
      this.showPromotionDialog(from, to, piece);
      return false; // Don't complete the move yet
    }

    if (piece === PIECE.wk || piece === PIECE.bk) {
      if (this.isCastling(piece, from, to)) {
        this.performCastling(piece, to, position);
      }
    }

    this.submitGuess(from, to, piece, null, position);
    return true;
  }

  extractSideFromFen(fen) {
    if (fen) {
      return fen.split(' ')[1].toLowerCase() == 'w' ? 'white' : 'black';
    }
    return 'white';
  }

  isWhiteToMove(moveIndex) {
    const isFirstMoveWhite = this.sideWithFirstMove === 'white';
    return (moveIndex % 2 === 0) === isFirstMoveWhite;
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
          alert('Please enter a valid move number.');
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
      this.updateGameState(uiMove);
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
      this.currentMoveIndex++;
    }
    this.updateButtonStates();
    if (this.gameOver()) {
      this.displayGameResult();
    }
    this.updateLastMoveDisplay();
  }

  updateGameState(uiMove) {
    const move = uiMove.moves[0];
    const [from, to] = move.split('-');
    const piece = this.board.getPiece(from);
    this.gameState.update(piece, from, to);
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
    }
    return "w" + piece.toLowerCase();
  }

  pawnForCurrentMove() {
    if (this.currentMoveIndex % 2 == 0) {
      return PIECE.wp;
    } else {
      return PIECE.bp;
    }
  }

  handleGuessResult(data) {
    data.forEach((move) => {
      if (move.result === 'correct') {
        if (move.same_as_game) {
          this.updateGuessStatus(
            'green',
            'Correct!',
            'This is what was played.'
          );
          this.moveForward(move.move);
        } else {
          const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
          const evalComment = this.getEvaluationComment(move.result, move.game_move, move.guess_eval.score, evalDiff);
          var headline;
          if (move.guess_eval.score > 100 && evalDiff > -30) {
            headline = 'Good move!';
          } else {
            headline = 'Good guess!';
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
        const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
        const evalComment = this.getEvaluationComment(move.result, move.game_move, move.guess_eval.score, evalDiff);
        this.updateGuessStatus(
          'red',
          'Incorrect!',
          evalComment
        );
        this.board.setPosition(this.lastPosition);
      } else if (move.result === 'auto_move') {
        if (this.guessMode() != 'both') {
          this.moveForward();
        }
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
    if (pieceColor === 'w' && !this.isWhiteToMove(this.currentMoveIndex)) {
      return false;
    }
    if (pieceColor === 'b' && this.isWhiteToMove(this.currentMoveIndex)) {
      return false;
    }
    return currentGuessMode === 'both' ||
       (currentGuessMode === 'white' && pieceColor === 'w') ||
       (currentGuessMode === 'black' && pieceColor === 'b');
  }

  gameOver() {
    return this.currentMoveIndex >= this.moves.length;
  }

  submitGuess(source, target, piece, promotedPiece, oldPosition) {
    const currentMove = this.uiMoves[this.currentMoveIndex];
    if (currentMove && this.isExactMatch(source, target, promotedPiece, currentMove)) {
      this.updateGameState(currentMove);
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
        newPos: "" + this.board.getPosition(),
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

  handleGuessResponse(data) {
    if (data.result === 'needs_promotion') {
      return; // Dialog is already showing
    }
    if (data.result === 'auto_move') {
      this.board.setPosition(data.fen);
      this.updateButtonStates();
    } else {
      this.handleGuessResult(data);
    }
  }

  showPromotionDialog(source, target, piece, newPos, oldPos) {
    const dialog = this.createPromotionDialog();
    const color = piece.charAt(0);

    ['Q', 'R', 'B', 'N'].forEach(pieceType => {
      const button = this.createPromotionButton(pieceType, () => {
        const promotedPiece = color + pieceType.toLowerCase();
        this.board.setPiece(target, promotedPiece);
        this.board.setPiece(source, null);

        this.submitGuess(source, target, piece, promotedPiece, newPos, oldPos);
        document.body.removeChild(dialog);
      });
      dialog.appendChild(button);
    });

    this.positionPromotionDialog(dialog, target);
    document.body.appendChild(dialog);
  }

  isPawnPromotion(from, to, piece) {
    if (!piece.endsWith('p')) return false;
    const targetRank = to[1];
    return (piece.startsWith('w') && targetRank === '8') ||
           (piece.startsWith('b') && targetRank === '1');
  }

  isCastling(piece, source, target) {
    const kingside = (piece === PIECE.wk && source === 'e1' && target === 'g1') ||
      (piece === PIECE.bk && source === 'e8' && target === 'g8');
    const queenside = (piece === PIECE.wk && source === 'e1' && target === 'c1') ||
      (piece === PIECE.bk && source === 'e8' && target === 'c8');
    return kingside || queenside;
  }

  performCastling(piece, target, newPos) {
    let rookSource, rookTarget;

    if (piece === PIECE.wk) {
      if (target === 'g1') {
        rookSource = 'h1';
        rookTarget = 'f1';
      } else if (target === 'c1') {
        rookSource = 'a1';
        rookTarget = 'd1';
      }
    } else if (piece === PIECE.bk) {
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
      { id: 'fastForwardBtn', disabled: this.currentMoveIndex >= this.moves.length }
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
    if (this.board.getOrientation() === COLOR.white) {
      this.board.setOrientation(COLOR.black);
    } else {
      this.board.setOrientation(COLOR.white);
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
    const moveOffset = this.sideWithFirstMove == 'black' ? moveIndex + 1 : moveIndex;
    const wholeMoveNumber = Math.floor(moveOffset / 2) + this.startingWholeMove;
    this.lastMoveElement.textContent = `${wholeMoveNumber}${this.isWhiteToMove(moveIndex) ? '.' : '...'} ${moveNotation}`;
  }

  updatedPosition(oldPos, from, to) {
    const newPos = {...oldPos};
    newPos[to] = newPos[from];
    delete newPos[from];
    return newPos;
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

        // Remove any existing fade-out class and display the element
        messageDiv.classList.remove('fade-out');
        messageDiv.style.display = 'block';

        // Position the message
        const btnRect = exportBtn.getBoundingClientRect();
        messageDiv.style.top = `${btnRect.bottom + 5}px`;
        messageDiv.style.left = `${btnRect.left}px`;

        // Show the message
        messageDiv.textContent = 'FEN copied!';

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

  generateCompleteFen() {
    const piecePlacement = this.board.getPosition();
    const activeColor = this.currentMoveIndex % 2 === 0 ? 'w' : 'b';
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
    if (evalDiff > 50) {
        comment = `Your move is even better than the game move (${gameMove})!`;
    } else if (evalDiff > 10) {
        comment = `Your move is slightly better than the game move (${gameMove}).`;
    } else if (evalDiff < -100) {
        comment = `The game move ${guessCorrect ? `(${gameMove})` : ''} was much better.`;
    } else if (evalDiff < -50) {
        comment = `The game move ${guessCorrect ? `(${gameMove})` : ''} was significantly better.`;
    } else if (evalDiff < -10) {
        comment = `The game move ${guessCorrect ? `(${gameMove})` : ''} was slightly better.`;
    } else if (guessResult == 'correct') {
        comment = `Your move is about as good as the game move ${guessCorrect ? `(${gameMove})` : ''}.`;
    } else {
      comment = `Your move was not as good as the game move.`;
    }
    if (evalDiff < -10) {
      if (evalDiff > -50 && guessEval > 50) {
        comment += " Your move was still good.";
      } else if (guessEval > 50) {
        comment += " Your move still leaves you with a reasonable position.";
      }
    }
    return comment;
  }

  // Helper methods for promotion dialog
  createPromotionDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'promotion-dialog';
    dialog.style.position = 'fixed';
    dialog.style.backgroundColor = 'white';
    dialog.style.border = '1px solid black';
    dialog.style.padding = '10px';
    dialog.style.zIndex = 1000;
    return dialog;
  }

  createPromotionButton(pieceType, onClick) {
    const button = document.createElement('button');
    button.className = 'promotion-choice';
    button.textContent = pieceType;
    button.onclick = onClick;
    return button;
  }

  positionPromotionDialog(dialog, target) {
    const boardEl = document.getElementById('board');
    const boardRect = boardEl.getBoundingClientRect();
    const squareSize = boardRect.width / 8;

    const isFlipped = this.board.getOrientation() === COLOR.black;
    const file = target.charCodeAt(0) - 'a'.charCodeAt(0);
    const rank = target.charCodeAt(1) - '1'.charCodeAt(0);

    const x = isFlipped ? (7 - file) : file;
    const y = isFlipped ? rank : (7 - rank);

    dialog.style.left = `${boardRect.left + x * squareSize}px`;
    dialog.style.top = `${boardRect.top + y * squareSize}px`;
  }

  handleCorrectGuess(move) {
    if (move.remove) {
      this.board.setPiece(move.remove[1], null);
    }
    this.updateGuessStatus('green', 'Correct!', 'This is what was played.');
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

}
