// Define the chessboard and chess game
var board = Chessboard('board', {
  draggable: true,
  position: 'start'
});

function updateBoard(endpoint) {
  // Make a POST request to the Sinatra endpoint
  fetch(endpoint, { method: 'GET', })
    .then(response => response.json())
    .then(data => {
      // Update the board position
      board.position(data.fen);
    });
}
