function updateBoard(endpoint) {
  // Make a POST request to the Sinatra endpoint
  fetch(endpoint, { method: 'GET', })
    .then(response => response.json())
    .then(data => {
      // Update the board position
      board.position(data.fen);
    });
}

function handleGuessResult(result) {
  const guessResult = $('#guess_result');
  if (result === 'correct') {
    guessResult.text('Correct!').css('color', 'green');
  } else {
    guessResult.text('Incorrect!').css('color', 'red');
  }
}

function onDrop (source, target, piece, newPos, oldPos, orientation) {
  console.log('Source: ' + source)
  console.log('Target: ' + target)
  console.log('Piece: ' + piece)
  console.log('New position: ' + Chessboard.objToFen(newPos))
  console.log('Old position: ' + Chessboard.objToFen(oldPos))
  console.log('Orientation: ' + orientation)
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
  if (source == target) {
    return;
  }
  fetch('/guess', { method: 'POST',
    body: JSON.stringify({ move: {
      source, target, piece,
      newPos: Chessboard.objToFen(newPos),
      oldPos: Chessboard.objToFen(oldPos),
      orientation
    } })
  })
    .then(response => response.json())
    .then(data => {
      handleGuessResult(data.result);
    });
}

// Define the chessboard and chess game
var board = Chessboard('board', {
  draggable: true,
  position: 'start',
  onDrop: onDrop
});