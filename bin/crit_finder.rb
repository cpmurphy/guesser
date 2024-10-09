#! /usr/bin/ruby
require 'pgn'
require_relative '../lib/analyzer'
require_relative '../lib/move_translator'
require_relative '../lib/pgn_summary'
require 'json'

class CriticalMomentFinder
  def initialize(game)
    @game = game
    @analyzer = Analyzer.new()
    @positions = generate_positions
  end

  def analyze_for_last_critical_moment
    winner = deduce_winner
    return "The ending position was about equal. No critical moment found." if winner == :draw

    max_score_drop = 0
    last_score = nil

    if winner == :black
      loser_moves = :even
    else
      loser_moves = :odd
    end

    scores = []
    move_index = (@positions.length - 1)
    if move_index % 2 == 1 && loser_moves == :even || move_index % 2 == 0 && loser_moves == :odd
      move_index -= 1
    end
    critical_index = move_index

    while move_index >= 0
        analysis = @analyzer.evaluate_best_move(@positions[move_index])
        current_score = analysis[:score]
        scores << current_score
        if last_score
          diff = last_score - current_score
          if diff > max_score_drop
            max_score_drop = diff
            critical_index = move_index + 2
          end
        end 

        break if current_score < 50

      last_score = current_score
      move_index -= 2
    end

    move_number = (critical_index / 2) + 1
    is_black_move = critical_index.odd?
    move = @game.moves[critical_index]

    { scores: scores.inspect,
      last_critical_moment: {
        move_number: move_number,
        side: is_black_move ? 'black' : 'white',
        move: move
      },
      winner: winner
    }
  end

  def deduce_winner
    move_index = @positions.length - 1
    final_position = @positions[move_index]
    analysis = @analyzer.evaluate_best_move(final_position)
    final_score = analysis[:score]

    is_black_to_move = move_index.even?

    if final_score.abs < 50
      :draw
    elsif final_score > 0
      is_black_to_move ? :black : :white
    else
      is_black_to_move ? :white : :black
    end
  end

  private

  def notation_for(move_index)
    move_number = (move_index / 2) + 1
    is_black_move = move_index.odd?
    move = @game.moves[move_index]

    "Move #{move_number}#{is_black_move ? '...' : '.'} #{move}"
  end

  def generate_positions
    positions = []
    translator = MoveTranslator.new
    if @game.starting_position
      translator.load_game_from_fen(@game.starting_position.to_fen.to_s)
    end
    @game.moves.each do |move|
      translator.translate_move(move.notation)
      positions << translator.board_as_fen
    end
    positions
  end
end

# Command line interface
if ARGV.empty?
  puts "Usage: ruby crit_finder.rb <pgn_file>"
  exit
end

pgn_file = ARGV[0]
puts '['
summary = PgnSummary.new(File.open(pgn_file, encoding: Encoding::ISO_8859_1))
summary.load.each_with_index do |game, index|
  games = PGN.parse(summary.game_at(index))
  game = games.first
  finder = CriticalMomentFinder.new(game)
  print({
    game: "#{game.tags['White']} vs #{game.tags['Black']}",
    analysis: finder.analyze_for_last_critical_moment
  }.to_json)
  puts ',' if index < summary.games.length - 1
end
puts "\n]"
