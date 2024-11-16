# Chess Guesser

This Ruby program runs as a Rack application. It provides a web interface that allows you to load a PGN file and play through a game. You can choose to guess the next move, and if your move is at least as good as the move played in the game, you win.

## How to Use

1. **Select a Game**: On the home page, you can either:
   - Choose from a list of built-in PGN files
   - Upload your own PGN file
   - Paste PGN text directly

2. **Choose a Game**: If the PGN contains multiple games, select the specific game you want to play through.
   - You can start at the beginning of the game
   - You can also start at a critical moment (following the link)

3. **Guess Mode**: Choose whether you want to guess moves for White, Black, or both sides.
   - If you choose to start at a critical moment the winning side will be chosen for you

4. **Play Through the Game**:
   - You can use the navigation buttons to move forward and backward through the game.
   - When it's your turn to guess (based on the currently chosen guess mode), make a move on the board.
   - If your move is as good as or better than the move played in the actual game (as judged by the chess engine), you'll see a "Correct!" message.
   - If your move isn't good enough, you'll see an "Incorrect" message, and you can try again.
   - If you are only guessing one side, the moves for other side will be played automatically.

5. **Navigate Moves**: You can jump to specific moves using the move input box or use the fast forward/rewind buttons to quickly navigate through the game.

Enjoy playing through games and guessing the moves.  See how you do in famous chess games or any other PGN files you have.

## Installation

### Prerequisites

- Ruby (version 3.2.3 or higher recommended)
- Bundler gem
- Rake (the ruby build tool)
- npm (the Node package manager)
- Docker (optional, for containerized deployment)

### Local Setup

1. Clone the repository:
   ```
   git clone https://github.com/cpmurphy/guesser.git
   cd guesser
   ```

2. Install dependencies:
   ```
   bundle install
   ```

3. Ensure you have Stockfish installed and update the `engine_path` in `bin/engine.rb` if necessary.

### Docker Setup

1. Build the Docker image:
   ```
   rake docker_build
   ```

2. Run the Docker container:
   ```
   rake docker_run
   ```

## Running the Application

### Local Development

To start the Rack application locally:

1. Navigate to the project directory:
   ```
   cd guesser
   ```

2. Start the server:
   ```
   bundle exec rackup
   ```

3. Open your web browser and visit `http://localhost:9292` (or the port specified by the Rack server).

### Docker Deployment

If you've built and run the Docker container as described above, the application will be available at `http://localhost` (port 80).

## Deployment to Production

To deploy Chess Guesser to a production environment, follow these steps:

1. **Prepare the Production Server**:
   - Ensure Docker is installed on your production server.
   - Set up appropriate firewall rules to allow incoming traffic on ports 80 and 443.

2. **Configure Deployment Environment**:
   - Create a `deploy_env.sh` file in the project root with the following content:
     ```bash
     export DEPLOY_USER=your_ssh_user
     export DEPLOY_HOST=your_server_ip_or_domain
     export DEPLOY_DIR=/path/to/deployment/directory
     ```
   - Replace the placeholders with your actual deployment details.

3. **Build and Deploy**:
   - From your local development machine, run:
     ```bash
     ./bin/deploy.sh
     ```
   - This script will:
     - Build the Docker image locally
     - Save and compress the image
     - Upload the compressed image to your production server
     - Load the image on the server
     - Stop any existing Chess Guesser container
     - Start a new container with the updated image

4. **SSL Configuration (Optional)**:
   - If you want to use HTTPS, you'll need to set up a reverse proxy (like Nginx) and configure SSL certificates.

5. **Monitoring and Logs**:
   - You can view the application logs using:
     ```bash
     docker logs chess_guesser
     ```
   - Consider setting up log rotation and monitoring for the Docker container.

6. **Updating the Application**:
   - To update the application, make your changes locally, commit them, and then run the `./bin/deploy.sh` script again.

# Licenses

- code: [MIT](LICENSE)
- chessboard implementation (cm-chessboard): also [MIT](doc/cm-chessboard-LICENSE)
License for the Staunty SVG-pieces ( chessboard-sprite-staunty.svg): [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/)
License for the Wikimedia SVG-pieces ( chessboard-sprite.svg): [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/)
