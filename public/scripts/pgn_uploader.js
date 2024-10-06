class PgnUploader {

  constructor(gameLoadedCallback) {
    this.singleGameLoaded = true;
    this.gameLoadedCallback = gameLoadedCallback;
    this.setupPGNUploadListener();
    this.setupUploadButton();
    this.setupPgnInputMethod();
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
            this.showGame(data.table[0].id); // automatically load the single game
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

  setupPgnInputMethod() {
    const fileRadio = document.getElementById('upload_method_file');
    const pasteRadio = document.getElementById('upload_method_paste');
    const fileContainer = document.getElementById('file_upload_container');
    const pasteContainer = document.getElementById('pgn_paste_container');
    const pgnFileInput = document.getElementById('pgn_file_input');
    const pgnTextArea = document.getElementById('pgn_text_input');

    fileRadio.addEventListener('change', () => {
      fileContainer.style.display = 'block';
      pasteContainer.style.display = 'none';
      pgnTextArea.value = '';
    });

    pasteRadio.addEventListener('change', () => {
      fileContainer.style.display = 'none';
      pasteContainer.style.display = 'block';
      pgnFileInput.value = '';
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
      row.insertCell().textContent = game.result;
      const actionCell = row.insertCell();
      const loadButton = document.createElement('button');
      loadButton.textContent = 'Play';
      loadButton.addEventListener('click', () => this.showGame(game.id));
      actionCell.appendChild(loadButton);
    });
  }

  showGame(gameId) {
    window.location.href = `/game/${gameId}`;
  }

  changeUploadButtonToBackButton() {
    const uploadBtn = document.getElementById('upload_pgn_btn');
    uploadBtn.textContent = 'Back to Games';
  }
}