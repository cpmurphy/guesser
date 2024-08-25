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
      });
  }

  toggleGuessMode() {
    this.guessMode = !this.guessMode;
    const guessBtn = document.getElementById('guessBtn');
    guessBtn.textContent = this.guessMode ? 'Stop Guessing' : 'Start Guessing';
  }

  handleGuessResult(result) {
    const guessResult = document.getElementById('guess_result');
    if (result === 'correct') {
      guessResult.textContent = 'Correct!';
      guessResult.style.color = 'green';
    } else {
      guessResult.textContent = 'Incorrect!';
      guessResult.style.color = 'red';
    }
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
        this.handleGuessResult(data.result);
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