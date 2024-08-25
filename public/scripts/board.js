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

  updateButtonStates() {
    const buttons = ['forwardBtn', 'backwardBtn', 'guessBtn'];
    buttons.forEach(btnId => {
      const btn = document.getElementById(btnId);
      btn.disabled = !this.pgnLoaded;
    });
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
          this.board.position(data.fen);
          this.updateButtonStates();
        } else {
          console.error('PGN upload failed:', data.error);
        }
      });
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
      return;
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
}
