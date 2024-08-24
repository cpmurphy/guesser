function updateBoard(endpoint) {
  // Make a POST request to the Sinatra endpoint
  fetch(endpoint, { method: 'GET', })
    .then(response => response.json())
    .then(data => {
      // Update the board position
      board.position(data.fen);
    });
}

function onDrop (source, target, piece, newPos, oldPos, orientation) {
  console.log('Source: ' + source)
  console.log('Target: ' + target)
  console.log('Piece: ' + piece)
  console.log('New position: ' + Chessboard.objToFen(newPos))
  console.log('Old position: ' + Chessboard.objToFen(oldPos))
  console.log('Orientation: ' + orientation)
  console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
  fetch('/guess', { method: 'POST',
    body: JSON.stringify({ move:
      { source, target, piece,
        newPos: Chessboard.objToFen(newPos),
        oldPos: Chessboard.objToFen(oldPos),
        orientation
      } })
    })
    .then(response => response.json())
    .then(data => {
      if (data.result === 'correct') {
        $('#guess_result').text('Correct!');
        $('#guess_result').css('color', 'green');
      } else {
        $('#guess_result').text('Incorrect!');
        $('#guess_result').css('color', 'red');
      }
    });
}

// Define the chessboard and chess game
var board = Chessboard('board', {
  draggable: true,
  position: 'start',
  onDrop: onDrop
});