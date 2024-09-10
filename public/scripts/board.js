class Board {
  constructor() {
    this.board = null;
    this.setupPGNUploadListener();
  }

  setupPGNUploadListener() {
    const pgnUploadForm = document.getElementById('pgn_upload_form');
    pgnUploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(pgnUploadForm);
      fetch('/upload_pgn', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.table) {
          if (data.table.length == 1) {
            this.loadGame(0); // automatically load the single game
          } else {
            this.displayGameSelection(data.table);
          }
        } else {
          console.error('PGN upload failed:', data.error);
        }
      });
    });
  }

  displayGameSelection(games) {
    const tableBody = document.querySelector('#game_selection_table tbody');
    tableBody.innerHTML = '';
    games.forEach(game => {
      const row = tableBody.insertRow();
      row.insertCell().textContent = game.white;
      row.insertCell().textContent = game.black;
      row.insertCell().textContent = game.date;
      row.insertCell().textContent = game.event;
      const actionCell = row.insertCell();
      const loadButton = document.createElement('button');
      loadButton.textContent = 'Load';
      loadButton.addEventListener('click', () => this.loadGame(game.id));
      actionCell.appendChild(loadButton);
    });
    document.getElementById('game_selection_container').style.display = 'block';
    document.getElementById('board_container').style.display = 'none';
  }

  loadGame(gameId) {
    const formData = new FormData(document.getElementById('pgn_upload_form'));
    formData.append('game_id', gameId);
    fetch('/load_game', {
      method: 'POST',
      body: formData
    })
    .then(response => response.json())
    .then(data => {
      if (data.moves) {
        this.moves = data.moves;
      }
      if (data.ui_moves) {
        this.uiMoves = data.ui_moves;
      }
      if (data.fen) {
        this.initializeBoard(data.fen);
        this.initializeButtonStates(true);
        document.getElementById('white').textContent = data.white;
        document.getElementById('black').textContent = data.black;
        document.getElementById('game_selection_container').style.display = 'none';
        document.getElementById('board_container').style.display = 'block';
      } else {
        console.error('Game load failed:', data.error);
      }
    });
  }

  initializeBoard(fen) {
    this.board = Chessboard('board', {
      position: fen,
      draggable: true,
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this)
    });
    this.lastPosition = this.board.position();
    this.currentMove = 1;

    this.setupPGNUploadListener();
    this.setupMoveButtons();
    this.hideGuessResult();
    this.initializeButtonStates(false);
    this.setupGuessModeRadios();
  }

  position(fen) {
    this.board.position(fen);
  }

  setupMoveButtons() {
    const buttons = ['forwardBtn', 'backwardBtn'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);

      // Remove any existing event listeners
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideGuessResult();
        switch(btnId) {
          case 'forwardBtn':
            this.moveForward();
            break;
          case 'backwardBtn':
            this.moveBackward();
            break;
        }
      });
    });
  }

  guessMode() {
    const selectedRadio = document.querySelector('input[name="guess_mode"]:checked');
    return selectedRadio ? selectedRadio.value : 'neither';
  }

  setupGuessModeRadios() {
    const radios = document.querySelectorAll('input[name="guess_mode"]');
    radios.forEach(radio => {
      radio.checked = false;
      radio.addEventListener('change', (e) => {
        const formData = new FormData();
        formData.append('mode', e.target.value);
        fetch('/set_guess_mode', {
          method: 'POST',
          body: formData
        });
      });
    });
  }

  initializeButtonStates(pgnLoaded) {
    const backBtn = document.getElementById('backwardBtn');
    backBtn.disabled = true;
    const forwardBtn = document.getElementById('forwardBtn');
    forwardBtn.disabled = !pgnLoaded;
  }

  moveForward() {
    const uiMove = this.uiMoves[this.currentMove - 1];
    if (uiMove.moves) {
      const newPosition = this.board.position();
      uiMove.moves.forEach(m => {
        const [from, to] = m.split('-');
        newPosition[to] = newPosition[from];
        delete newPosition[from];
      });
      if (uiMove.remove || uiMove.add) {
        if (uiMove.remove && uiMove.remove[1] != uiMove.moves[0].substring(3, 5)) {
          delete newPosition[uiMove.remove[1]];
        }
        if (uiMove.add) {
          newPosition[uiMove.add[1]] = this.translatePiece(uiMove.add[0]);
        }
      }
      this.board.position(newPosition, true);
    }
    this.currentMove++;
    this.updateButtonStates();
  }

  moveBackward() {
    this.currentMove--;
    this.reverseMove(this.uiMoves[this.currentMove - 1]);
    this.updateButtonStates();
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
  }

  translatePiece(piece) {
    if (piece.match(/^[rnbqkp]$/)) {
      return "b" + piece.toUpperCase();
    }
    return "w" + piece;
  }

  pawnForCurrentMove() {
    if ((this.currentMove - 1) % 2 == 0) {
      return "wP";
    } else {
      return "bP";
    }
  }

  handleGuessResult(data) {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');
    const moveQueue = [];

    data.forEach((move) => {
      this.currentMove = move.move_number;
      if (move.result === 'correct') {
        guessResult.style.color = 'green';
        if (move.same_as_game) {
          guessResult.textContent = 'Correct!';
          guessComment.textContent = 'This is what was played.';
          guessSubcomment.textContent = '';
        } else {
          guessResult.textContent = 'Good!';
          guessComment.textContent = 'Your move is engine approved!';
          guessSubcomment.textContent = 'In the game ' + move.game_move + ' was played.';
          moveQueue.push({ fen: this.lastPosition }, { fen: move.fen });
        }
      } else if (move.result === 'incorrect') {
        guessResult.textContent = 'Incorrect!';
        guessResult.style.color = 'red';
        guessComment.textContent = '';
        guessSubcomment.textContent = '';
        moveQueue.push({ fen: this.lastPosition });
      } else if (move.result === 'auto_move') {
        moveQueue.push({ fen: move.fen });
      } else {
        console.error('Unexpected move result:', move);
      }
    });

    this.replayMoves(moveQueue);
  }

  replayMoves(moveQueue) {
    if (moveQueue.length === 0) return;

    const move = moveQueue.shift();
    this.board.position(move.fen);

    setTimeout(() => {
      this.replayMoves(moveQueue);
    }, 500);
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
    const currentGuessMode = this.guessMode();
    return currentGuessMode === 'both' ||
       (currentGuessMode === 'white' && piece.charAt(0) === 'w') ||
       (currentGuessMode === 'black' && piece.charAt(0) === 'b');
  }

  onDrop(source, target, piece, newPos, oldPos, orientation) {
    if (source === target) {
      return 'snapback';
    }

    // Store the old position before making any changes
    this.lastPosition = oldPos;

    // Check for castling
    if (piece === 'wK' || piece === 'bK') {
      if (this.isCastling(piece, source, target)) {
        this.performCastling(target, newPos);
      }
    }

    fetch('/guess', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        current_move: this.currentMove,
        move: {
          source,
          target,
          piece,
          newPos: Chessboard.objToFen(newPos),
          oldPos: Chessboard.objToFen(oldPos),
          orientation
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

  isCastling(piece, source, target) {
    const kingside = (piece === 'wK' && source === 'e1' && target === 'g1') ||
      (piece === 'bK' && source === 'e8' && target === 'g8');
    const queenside = (piece === 'wK' && source === 'e1' && target === 'c1') ||
      (piece === 'bK' && source === 'e8' && target === 'c8');
    return kingside || queenside;
  }

  performCastling(target, newPos) {
    let rookSource, rookTarget;

    if (target === 'g1') {
      rookSource = 'h1';
      rookTarget = 'f1';
    } else if (target === 'c1') {
      rookSource = 'a1';
      rookTarget = 'd1';
    } else if (target === 'g8') {
      rookSource = 'h8';
      rookTarget = 'f8';
    } else if (target === 'c8') {
      rookSource = 'a8';
      rookTarget = 'd8';
    }

    // Move the rook
    newPos[rookTarget] = newPos[rookSource];
    delete newPos[rookSource];

    // Update the board with the new position including the moved rook
    this.board.position(newPos, false);
  }

  updateButtonStates() {
    document.getElementById('forwardBtn').disabled = this.currentMove > this.moves.length;
    document.getElementById('backwardBtn').disabled = this.currentMove <= 1;
  }
}