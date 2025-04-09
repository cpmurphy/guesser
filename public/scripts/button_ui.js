export default class ButtonUi {
  constructor() {
    this.buttons = {
      fastRewind: document.getElementById('fastRewindBtn'),
      backward: document.getElementById('backwardBtn'),
      forward: document.getElementById('forwardBtn'),
      fastForward: document.getElementById('fastForwardBtn'),
      flipBoard: document.getElementById('flipBoardBtn'),
      exportFen: document.getElementById('exportFenBtn'),
      engineMove: document.getElementById('engineMoveBtn')
    };
  }

  setupMoveButtons(onFastRewind, onBackward, onForward, onFastForward, onHideGuessResult) {
    const moveButtons = [
      { id: 'fastRewindBtn', action: onFastRewind },
      { id: 'backwardBtn', action: onBackward },
      { id: 'forwardBtn', action: onForward },
      { id: 'fastForwardBtn', action: onFastForward }
    ];

    moveButtons.forEach(({ id, action }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          onHideGuessResult();
          action();
        });
      }
    });
  }

  setupFlipBoardButton(onFlipBoard) {
    const flipBtn = this.buttons.flipBoard;
    if (flipBtn) {
      flipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        onFlipBoard();
      });
    }
  }

  setupExportFenButton(onExportFen) {
    const exportBtn = this.buttons.exportFen;
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const fen = onExportFen();
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

          messageDiv.classList.remove('fade-out');
          messageDiv.style.display = 'block';

          const btnRect = exportBtn.getBoundingClientRect();
          messageDiv.style.top = `${btnRect.bottom + 5}px`;
          messageDiv.style.left = `${btnRect.left}px`;

          messageDiv.textContent = window.TRANSLATIONS.fen.copied;

          setTimeout(() => {
            messageDiv.classList.add('fade-out');
            setTimeout(() => {
              messageDiv.style.display = 'none';
            }, 300);
          }, 1500);
        });
      });
    }
  }

  setupEngineMoveButton(onRequestEngineMove) {
    const engineMoveBtn = this.buttons.engineMove;
    if (engineMoveBtn) {
      engineMoveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        onRequestEngineMove();
      });
      engineMoveBtn.disabled = true;
    }
  }

  updateButtonStates(currentMoveIndex, movesLength, isPastRecordedMoves, isGameTerminated) {
    const buttons = [
      { id: 'fastRewindBtn', disabled: currentMoveIndex <= 0 },
      { id: 'backwardBtn', disabled: currentMoveIndex <= 0 },
      { id: 'forwardBtn', disabled: currentMoveIndex >= movesLength },
      { id: 'fastForwardBtn', disabled: currentMoveIndex >= movesLength },
      { id: 'engineMoveBtn', disabled: !isPastRecordedMoves || isGameTerminated }
    ];

    buttons.forEach(({ id, disabled }) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = disabled;
      }
    });
  }

  initializeButtonStates(pgnLoaded) {
    const backBtn = this.buttons.backward;
    if (backBtn) backBtn.disabled = true;
    
    const forwardBtn = this.buttons.forward;
    if (forwardBtn) forwardBtn.disabled = !pgnLoaded;
  }
} 
