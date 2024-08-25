This ruby program runs as a Rack application. It provies a web interface that allows you to load a PGN file and play through
a game. You can choose to guess the next move, and if your move is at least as good as the move played in the game, you win.

# Installation
## Prerequisites

- Ruby (version 2.7 or higher recommended)
- Bundler gem

## Setup

1. Clone the repository:
   ```
   git clone <repository-url>
   cd <repository-name>
   ```

2. Install dependencies:
   ```
   bundle install
   ```

3. Ensure you have Stockfish installed and update the `engine_path` in `bin/engine.rb` if necessary.

## Running the Application

To start the Rack application:

1. Navigate to the project directory:
   ```
   cd <repository-name>
   ```

2. Start the server:
   ```
   rackup config.ru
   ```

3. Open your web browser and visit `http://localhost:9292` (or the port specified by the Rack server).

Now you can use the web interface to load PGN files and play through games.
