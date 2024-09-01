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
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        switch(btnId) {
          case 'forwardBtn':
            this.updateBoard('/forward');
            break;
          case 'backwardBtn':
            this.updateBoard('/backward');
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

  updateBoard(endpoint) {
    fetch(endpoint, { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        this.board.position(data.fen);
        this.currentMove = data.move_number;
        document.getElementById('forwardBtn').disabled = data.move_number >= data.total_moves;
        document.getElementById('backwardBtn').disabled = data.move_number <= 1;
        this.currentMove = data.move_number;
      });
  }

  handleGuessResult(data) {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');
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
          // revert to previous position, then update with new position from game
          setTimeout(() => {
            this.board.position(this.lastPosition);
            setTimeout(() => {
              this.board.position(move.fen);
            }, 500);
          }, 500);
        }
      } else if (move.result === 'incorrect') {
        guessResult.textContent = 'Incorrect!';
        guessResult.style.color = 'red';
        guessComment.textContent = '';
        guessSubcomment.textContent = '';
        this.board.position(this.lastPosition);
      } else if (move.result === 'auto_move') {
        this.board.position(move.fen);
      } else {
        alert('should never get here:' + move)
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
          this.updateButtonStates(data);
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

  updateButtonStates(data) {
    document.getElementById('forwardBtn').disabled = data.move_number >= data.total_moves;
    document.getElementById('backwardBtn').disabled = data.move_number <= 1;
  }
}