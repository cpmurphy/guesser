class Board {
  constructor() {
    this.guessMode = false;
    this.pgnLoaded = false;
    this.board = Chessboard('board', {
      draggable: true,
      position: 'start',
      onDragStart: this.onDragStart.bind(this),
      onDrop: this.onDrop.bind(this)
    });
    this.lastPosition = this.board.position();

    this.setupEventListeners();
    this.updateButtonStates();
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
          this.pgnLoaded = true;
          this.updateButtonStates();
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

  updateButtonStates() {
    const buttons = ['forwardBtn', 'backwardBtn', 'guessBtn'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      btn.disabled = !this.pgnLoaded;
    });
  }

  updateBoard(endpoint) {
    fetch(endpoint, { method: 'GET' })
      .then(response => response.json())
      .then(data => {
        this.board.position(data.fen);
        // Enable/disable buttons
        document.getElementById('forwardBtn').disabled = data.move_number >= data.total_moves;
        document.getElementById('backwardBtn').disabled = data.move_number <= 1;

      });
  }

  toggleGuessMode() {
    this.guessMode = !this.guessMode;
    const guessBtn = document.getElementById('guessBtn');
    guessBtn.textContent = this.guessMode ? 'Stop Guessing' : 'Start Guessing';
  }

  handleGuessResult(data) {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');
    if (data.result === 'correct') {
      guessResult.style.color = 'green';
      if (data.same_as_game) {
        guessResult.textContent = 'Correct!';
        guessComment.textContent = 'This is what was played.';
        guessSubcomment.textContent = '';
      } else {
        guessResult.textContent = 'Good!';
        guessComment.textContent = 'Your move is engine approved!';
        guessSubcomment.textContent = 'In the game ' + data.game_move + ' was played.';
        // revert to previous position, then update with new position from game
        setTimeout(() => {
          this.board.position(this.lastPosition);
          setTimeout(() => {
            this.board.position(data.fen);
          }, 500);
        }, 500);
      }
    } else {
      guessResult.textContent = 'Incorrect!';
      guessResult.style.color = 'red';
      guessComment.textContent = '';
      guessSubcomment.textContent = '';
      this.board.position(this.lastPosition);
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
    if (!this.guessMode) {
      return false;
    }
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
        this.handleGuessResult(data, newPos);
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
}