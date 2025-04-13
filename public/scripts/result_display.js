export default class ResultDisplay {

  update(rating, headlineText, commentText) {
    let headlineColor;
    switch (rating) {
      case 'good':
        headlineColor = 'green';
        break;
      case 'bad':
        headlineColor = 'red';
        break;
      case 'neutral':
        headlineColor = 'black';
        break;
      default:
        headlineColor = 'black';
    }
    this.updateGuessStatus(headlineColor, headlineText, commentText);
  }

  badGuess(headlineText, commentText) {
    this.updateGuessStatus('red', headlineText, commentText);
  }

  neutralGuess(headlineText, commentText) {
    this.updateGuessStatus('black', headlineText, commentText);
  }

  updateGuessStatus(headlineColor, headlineText, commentText) {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');

    guessResult.style.color = headlineColor;
    guessResult.textContent = headlineText;
    guessComment.textContent = commentText;
  }

  displayGameResult(gameResult) {
    const guessResult = document.getElementById('guess_result');

    // Check if the result span already exists
    let resultSpan = guessResult.querySelector('.game-result');

    if (!resultSpan) {
      // If it doesn't exist, create a new span
      resultSpan = document.createElement('span');
      resultSpan.className = 'game-result';
      resultSpan.style.marginLeft = '10px';  // Add some space between existing content and result
      guessResult.appendChild(resultSpan);
    }

    resultSpan.textContent = gameResult || 'Game Over';
    resultSpan.style.color = 'blue';
  }

  hideGuessResult() {
    const guessResult = document.getElementById('guess_result');
    const guessComment = document.getElementById('guess_comment');
    const guessSubcomment = document.getElementById('guess_subcomment');
    if (guessResult) guessResult.textContent = '';
    if (guessComment) guessComment.textContent = '';
    if (guessSubcomment) guessSubcomment.textContent = '';
  }
}
