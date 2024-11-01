class Board {
  constructor(data) {
    this.board = null;
    this.gameResult = data.gameResult;
    this.lastMoveElement = document.getElementById('last-move');
    this.moveInput = document.getElementById('move-input');
    this.setupMoveButtons();
    this.setupMoveInputListener();
    this.setupFlipBoardButton();
    this.onGameLoaded(data);
    this.setupTouchEvents();
    this.setupExportFenButton();
    this.castlingRightsHistory = [];
    this.castlingRights = '-';
    this.enPassant = '-';
    this.halfmoveClock = '0';
  }

  initializeBoard(fen) {
    this.board = Chessboard('board', {
      pieceTheme: '/img/chesspieces/wikipedia/{piece}.png',
      position: fen,
      draggable: true,
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this)
    });
    this.lastPosition = this.board.position();
    this.castlingRights = fen.split(' ')[2];
    this.enPassant = fen.split(' ')[3];
    this.halfmoveClock = fen.split(' ')[4];
    this.hideGuessResult();
    this.initializeButtonStates(false);
  }

  onGameLoaded(data) {
    this.moves = data.moves;
    this.result = data.result;
    this.uiMoves = data.uiMoves;
    this.startingWholeMove = data.startingWholeMove;
    this.currentWholeMove = data.currentWholeMove;
    this.sideToMove = data.sideToMove;
    this.fen = data.fen;
    this.gameResult = data.gameResult;
    this.initializeBoard(this.fen);
    this.initializeButtonStates(true);
    document.getElementById('white').textContent = data.white;
    document.getElementById('black').textContent = data.black;
    this.currentMoveIndex = 0;
    if (data.currentWholeMove && data.currentWholeMove > this.startingWholeMove) {
      const moveIncrement = this.sideToMove === 'white' ? 0 : 1;
      this.goToMoveIndex((data.currentWholeMove - this.startingWholeMove) * 2 + moveIncrement);
    }
    this.resetTouchState();
    this.updateLastMoveDisplay();
    this.updateGuessMode(this.sideToMove);
    if (this.sideToMove === 'black') {
      this.flipBoard();
    }
  }

  resetTouchState() {
    this.touchedSquare = null;
  }

  position(fen) {
    this.board.position(fen);
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
      if (!uiMove.remove && !uiMove.add) {
        uiMove.moves.forEach(m => this.board.move(m));
      } else {
        const newPosition = this.board.position();
        uiMove.moves.forEach(m => {
          const [from, to] = m.split('-');
          newPosition[to] = newPosition[from];
          delete newPosition[from];
        });
        if (uiMove.remove && uiMove.remove[1] != uiMove.moves[0].substring(3, 5)) {
          delete newPosition[uiMove.remove[1]];
        }
        if (uiMove.add) {
          newPosition[uiMove.add[1]] = this.translatePiece(uiMove.add[0]);
        }
        this.board.position(newPosition, true);
      }
      this.currentMoveIndex++;
    }
    this.updateButtonStates();
    if (this.gameOver()) {
      this.displayGameResult();
    }
    this.updateLastMoveDisplay();
    this.resetTouchState();
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

    // Set the content and style of the result span
    resultSpan.textContent = this.gameResult || 'Game Over';
    resultSpan.style.color = 'blue';
  }

  moveBackward() {
    this.currentMoveIndex--;
    this.restoreCastlingRightsFromHistory();
    this.reverseMove(this.uiMoves[this.currentMoveIndex]);
    this.updateButtonStates();
    this.updateLastMoveDisplay();
    this.resetTouchState();
  }

  restoreCastlingRightsFromHistory() {
    if (this.castlingRightsHistory[this.currentMoveIndex]) {
      this.castlingRights = this.castlingRightsHistory[this.currentMoveIndex];
    }
  }

  reverseMove(uiMove) {
    if (uiMove.moves && Array.isArray(uiMove.moves)) {
      if (uiMove.add) {
        // reverse the addition of the piece
        const position = this.board.position();
        position[uiMove.add[1]] = this.pawnForCurrentMove();
        this.board.position(position);
      }
      uiMove.moves.forEach(m => this.board.move(m.split('-').reverse().join('-')));
      if (uiMove.remove || uiMove.add) {
        const position = this.board.position();
        if (uiMove.remove) {
          // reverse the removal of the piece
          position[uiMove.remove[1]] = this.translatePiece(uiMove.remove[0]);
        }
        this.board.position(position);
      }
    }
    this.resetTouchState();
  }

  translatePiece(piece) {
    if (piece.match(/^[rnbqkp]$/)) {
      return "b" + piece.toUpperCase();
    }
    return "w" + piece;
  }

  pawnForCurrentMove() {
    if (this.currentMoveIndex % 2 == 0) {
      return "wP";
    } else {
      return "bP";
    }
  }

  handleGuessResult(data) {
    const moveQueue = [];

    data.forEach((move) => {
      this.currentMoveIndex = move.move_number - 1;
      if (move.result === 'correct') {
        if (move.same_as_game) {
          this.updateGuessStatus(
            'green',
            'Correct!',
            'This is what was played.'
          );
        } else {
          const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
          const evalComment = this.getEvaluationComment(move.game_move, move.guess_eval.score, evalDiff);

          this.updateGuessStatus(
            'green',
            'Good move!',
            evalComment
          );
          moveQueue.push({ fen: this.lastPosition }, { fen: move.fen });
        }
      } else if (move.result === 'incorrect') {
        const evalDiff = this.compareEvaluations(move.guess_eval.score, move.game_eval.score);
        const evalComment = this.getEvaluationComment(move.game_move, move.guess_eval.score, evalDiff);
        this.updateGuessStatus(
          'red',
          'Incorrect!',
          evalComment
        );
        moveQueue.push({ fen: this.lastPosition });
      } else if (move.result === 'auto_move') {
        moveQueue.push({ fen: move.fen });
        this.setLastMoveDisplay(this.currentMoveIndex, this.sideToMove === 'black', move.move);
        this.updateButtonStates();
      }
    });

    this.replayMoves(moveQueue);
    this.resetTouchState();
  }

  replayMoves(moveQueue) {
    if (moveQueue.length === 0) return;

    const move = moveQueue.shift();
    this.board.position(move.fen);

    setTimeout(() => {
      this.replayMoves(moveQueue);
    }, 500);
    if (this.gameOver()) {
      this.displayGameResult();
    }
  }

  hideGuessResult() {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');
    if (guessResult) guessResult.textContent = '';
    if (guessComment) guessComment.textContent = '';
    if (guessSubcomment) guessSubcomment.textContent = '';
  }

  onDragStart(source, piece, position, orientation) {
    return this.isPieceAvailableToMove(piece);
  }

  isPieceAvailableToMove(piece) {
    const currentGuessMode = this.guessMode();
    const pieceColor = piece.charAt(0);
    if (pieceColor === 'w' && this.currentMoveIndex % 2 == 1) {
      return false;
    }
    if (pieceColor === 'b' && this.currentMoveIndex % 2 == 0) {
      return false;
    }
    return currentGuessMode === 'both' ||
       (currentGuessMode === 'white' && pieceColor === 'w') ||
       (currentGuessMode === 'black' && pieceColor === 'b');
  }

  gameOver() {
    return this.currentMoveIndex >= this.moves.length;
  }

  onDrop(source, target, piece, newPos, oldPos) {
    if (source === target || this.gameOver()) {
      return 'snapback';
    }

    // Store the old position before making any changes
    this.lastPosition = oldPos;

    // Check for castling
    if (piece === 'wK' || piece === 'bK') {
      if (this.isCastling(piece, source, target)) {
        this.updateCastlingRightsHistory();
        this.performCastling(piece, target, newPos);
      }
    }

    // Check if the move matches the current move exactly
    const currentMove = this.uiMoves[this.currentMoveIndex];
    if (currentMove && this.isExactMatch(source, target, currentMove)) {
      // Handle as correct guess without making a POST request
      this.handleCorrectGuess(currentMove);
      return;
    }

    // If not an exact match, proceed with the POST request
    fetch('/guess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        path: window.location.pathname,
        current_move: this.currentMoveIndex + 1,
        game_move: this.uiMoves[this.currentMoveIndex],
        number_of_moves: this.moves.length,
        guessed_move: {
          source,
          target,
          piece,
          newPos: Chessboard.objToFen(newPos),
          oldPos: Chessboard.objToFen(oldPos)
        }
      })
    })
      .then(response => response.json())
      .then(data => {
        if (data.result === 'auto_move') {
          this.board.position(data.fen);
          this.updateButtonStates();
        } else {
          this.handleGuessResult(data);
        }
      });
  }

  updateCastlingRightsHistory() {
    this.castlingRightsHistory[this.currentMoveIndex] = this.castlingRights;
  }

  isExactMatch(source, target, currentMove) {
    return currentMove.moves.some(move => move === `${source}-${target}`);
  }

  updateGuessStatus(headlineColor, headlineText, commentText) {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');

    guessResult.style.color = headlineColor;
    guessResult.textContent = headlineText;
    guessComment.textContent = commentText;
  }

  handleCorrectGuess(move) {
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
    this.resetTouchState();
    if (this.gameOver()) {
      this.displayGameResult();
    }
  }

  isCastling(piece, source, target) {
    const kingside = (piece === 'wK' && source === 'e1' && target === 'g1') ||
      (piece === 'bK' && source === 'e8' && target === 'g8');
    const queenside = (piece === 'wK' && source === 'e1' && target === 'c1') ||
      (piece === 'bK' && source === 'e8' && target === 'c8');
    return kingside || queenside;
  }

  performCastling(piece, target, newPos) {
    let rookSource, rookTarget;

    if (piece === 'wK') {
      if (target === 'g1') {
        this.castlingRights = this.castlingRights.replace('K', '');
        rookSource = 'h1';
        rookTarget = 'f1';
      } else if (target === 'c1') {
        this.castlingRights = this.castlingRights.replace('Q', '');
        rookSource = 'a1';
        rookTarget = 'd1';
      }
    } else if (piece === 'bK') {
      if (target === 'g8') {
        this.castlingRights = this.castlingRights.replace('k', '');
        rookSource = 'h8';
        rookTarget = 'f8';
      } else if (target === 'c8') {
        this.castlingRights = this.castlingRights.replace('q', '');
        rookSource = 'a8';
        rookTarget = 'd8';
      }
    }

    // Move the rook
    newPos[rookTarget] = newPos[rookSource];
    delete newPos[rookSource];

    // Update the board with the new position including the moved rook
    this.board.position(newPos, false);
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
    this.board.flip();
  }

  fastForward() {
    const numMoves = (this.moves.length + 1) - this.currentMoveIndex;
    this.sequentialMove(numMoves, this.moveForward.bind(this));
  }

  fastRewind() {
    const numMoves = this.currentMoveIndex - (this.startingWholeMove - 1) * 2;
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
      const isBlackMove = lastMoveIndex % 2 === 1;
      const moveNotation = this.moves[lastMoveIndex];

      this.setLastMoveDisplay(lastMoveIndex, isBlackMove, moveNotation);
    }
  }

  setLastMoveDisplay(moveIndex, isBlackMove, moveNotation) {
    const wholeMoveNumber = Math.floor(moveIndex / 2) + this.startingWholeMove;
    this.lastMoveElement.textContent = `${wholeMoveNumber}${isBlackMove ? '...' : '.'} ${moveNotation}`;
  }

  setupTouchEvents() {
    const boardEl = document.getElementById('board');
    boardEl.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  onTouchEnd(event) {
    const square = this.getSquareFromTouch(event);
    const touchedPiece = this.board.position()[square];
    if (!touchedPiece) {
      if (!this.touchedSquare) {
        // nothing to do
        return;
      }
    } else if (this.touchedSquare && this.isPieceAvailableToMove(touchedPiece)) {
      // attempt to capture own piece
      this.touchedSquare = null;
      return;
    } else if (!this.touchedSquare && !this.isPieceAvailableToMove(touchedPiece)) {
      // attempt to move opponent's piece
      this.touchedSquare = null;
      return;
    }
    if (!this.touchedSquare) {
      this.touchedSquare = square;
    } else if (this.touchedSquare && square && this.touchedSquare !== square) {
      const source = this.touchedSquare;
      const movedPiece = this.board.position()[source];
      const target = square;
      const oldPos = this.board.position();
      const newPos = this.updatedPosition(oldPos, source, target);
      const status = this.onDrop(source, target, movedPiece, newPos, oldPos);
      if (status === 'snapback') {
        this.touchedSquare = null;
      } else {
        this.board.move(source + '-' + target);
      }
    }
  }

  updatedPosition(oldPos, from, to) {
    const newPos = {...oldPos};
    newPos[to] = newPos[from];
    delete newPos[from];
    return newPos;
  }

  getSquareFromTouch(event) {
    const boardEl = document.getElementById('board');
    const rect = boardEl.getBoundingClientRect();
    const touch = event.changedTouches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    const squareSize = rect.width / 8;

    // Determine if the board is flipped
    const isFlipped = this.board.orientation() === 'black';

    let file, rank;

    if (isFlipped) {
      file = String.fromCharCode('h'.charCodeAt(0) - Math.floor(x / squareSize));
      rank = 1 + Math.floor(y / squareSize);
    } else {
      file = String.fromCharCode('a'.charCodeAt(0) + Math.floor(x / squareSize));
      rank = 8 - Math.floor(y / squareSize);
    }

    return `${file}${rank}`;
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
    const piecePlacement = this.board.fen();
    const activeColor = this.currentMoveIndex % 2 === 0 ? 'w' : 'b';
    // Calculate the full move number
    const fullmoveNumber = Math.floor(this.currentMoveIndex / 2) + this.startingWholeMove;

    return `${piecePlacement} ${activeColor} ${this.castlingRights} ${this.enPassant} ${this.halfmoveClock} ${fullmoveNumber}`;
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

  getEvaluationComment(gameMove, guessEval, evalDiff) {
    var comment = '';
    if (evalDiff > 50) {
        comment = `Your move is even better than the game move (${gameMove})!`;
    } else if (evalDiff > 10) {
        comment = `Your move is slightly better than the game move (${gameMove}).`;
    } else if (evalDiff < -100) {
        comment = `The game move was much better.`;
    } else if (evalDiff < -50) {
        comment = `The game move was significantly better.`;
    } else if (evalDiff < -10) {
        comment = `The game move was slightly better.`;
    } else {
        comment = `Your move is about as good as the game move (${gameMove}).`;
    }
    if (evalDiff < -10) {
      if (evalDiff > -50 && guessEval > 50) {
        comment += " Your move was still good.";
      } else if (guessEval > 50) {
        comment += " Your move was still okay.";
      }
    }
    return comment;
  }

}
