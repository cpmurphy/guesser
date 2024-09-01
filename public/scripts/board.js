class Board {
  constructor() {
    this.guessMode = 'both';
    this.board = Chessboard('board', {
      draggable: true,
      position: 'start',
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this)
    });
    this.lastPosition = this.board.position();
    this.currentMove = 1;

    this.setupEventListeners();
    this.initializeButtonStates(false);
    this.setupGuessModeRadios();
  }

  position(fen) {
    this.board.position(fen);
  }

  setupEventListeners() {
    const buttons = ['forwardBtn', 'backwardBtn', 'guessBtn'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.hideGuessResult();
        switch(btnId) {
          case 'forwardBtn':
            this.updateBoard('/forward');
            break;
          case 'backwardBtn':
            this.updateBoard('/backward');
            break;
          case 'guessBtn':
            this.toggleGuessMode();
            break;
        }
      });
    });

    // Add event listener for PGN upload
    const pgnUploadForm = document.getElementById('pgn_upload_form');
    pgnUploadForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const formData = new FormData(pgnUploadForm);
      this.hideGuessResult();
      fetch('/upload_pgn', {
        method: 'POST',
        body: formData
      })
      .then(response => response.json())
      .then(data => {
        if (data.fen) {
          this.updateButtonStates(data);
          this.position(data.fen);
          if (data.white) {
            document.getElementById('white').textContent = data.white;
          }
          if (data.black) {
            document.getElementById('black').textContent = data.black;
          }
        } else {
          console.error('PGN upload failed:', data.error);
        }
      });
    });
  }

  setupGuessModeRadios() {
    const radios = document.querySelectorAll('input[name="guess_mode"]');
    radios.forEach(radio => {
      radio.addEventListener('change', (e) => {
        this.guessMode = e.target.value;
        const formData = new FormData();
        formData.append('mode', this.guessMode);
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
    const buttons = ['forwardBtn', 'guessBtn'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      btn.disabled = !pgnLoaded;
    });
  }

  updateBoard(endpoint) {
    fetch(endpoint, { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        this.board.position(data.fen);
        this.currentMove = data.move_number;
        document.getElementById('forwardBtn').disabled = data.move_number >= data.total_moves;
        document.getElementById('backwardBtn').disabled = data.move_number <= 1;
      });
  }

  toggleGuessMode() {
    this.guessingEnabled = !this.guessingEnabled;
    const guessBtn = document.getElementById('guessBtn');
    guessBtn.textContent = this.guessingEnabled ? 'Stop Guessing' : 'Start Guessing';
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
    return this.guessingEnabled &&
      (this.guessMode == 'both' || this.guessMode[0] == piece[0]);
  }

  onDrop(source, target, piece, newPos, oldPos, orientation) {
    console.log('Source: ' + source);
    console.log('Target: ' + target);
    console.log('Piece: ' + piece);
    console.log('New position: ' + Chessboard.objToFen(newPos));
    console.log('Old position: ' + Chessboard.objToFen(oldPos));
    console.log('Orientation: ' + orientation);
    console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');

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
    document.getElementById('guessBtn').disabled = false;
    document.getElementById('forwardBtn').disabled = data.move_number >= data.total_moves;
    document.getElementById('backwardBtn').disabled = data.move_number <= 1;
  }
}