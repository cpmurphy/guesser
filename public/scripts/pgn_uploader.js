class PgnUploader {

  constructor(gameLoadedCallback) {
    this.singleGameLoaded = true;
    this.gameLoadedCallback = gameLoadedCallback;
    this.setupPGNUploadListener();
    this.setupUploadButton();
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
            this.singleGameLoaded = true;
          } else {
            this.singleGameLoaded = false;
            this.displayGameSelection(data.table);
          }
        } else {
          console.error('PGN upload failed:', data.error);
        }
      });
    });
  }

  setupUploadButton() {
    const uploadBtn = document.getElementById('upload_pgn_btn');
    const pgnFileInput = document.getElementById('pgn_file_input');
    const pgnTextArea = document.getElementById('pgn_text_input');

    uploadBtn.addEventListener('click', (e) => {
      if (uploadBtn.textContent === 'Back to Games') {
        e.preventDefault();
        this.swapToGameSelection();
      }
    });

    pgnFileInput.addEventListener('change', () => {
      uploadBtn.textContent = 'Upload PGN';
    });

    pgnTextArea.addEventListener('input', () => {
      uploadBtn.textContent = 'Upload PGN';
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
      this.swapToBoard();
      if (!this.singleGameLoaded) {
        this.changeUploadButtonToBackButton();
      } else {
        console.error('Game load failed:', data.error);
      }

      this.gameLoadedCallback(data);
    });
  }

  swapToBoard() {
    document.getElementById('game_selection_container').style.display = 'none';
    document.getElementById('board_container').style.display = 'block';
  }

  swapToGameSelection() {
    document.getElementById('board_container').style.display = 'none';
    document.getElementById('game_selection_container').style.display = 'block';
  }

  changeUploadButtonToBackButton() {
    const uploadBtn = document.getElementById('upload_pgn_btn');
    uploadBtn.textContent = 'Back to Games';
  }
}