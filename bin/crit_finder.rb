#! /usr/bin/ruby
require 'pgn'
require_relative '../lib/analyzer'
require_relative '../lib/move_translator'

class CriticalMomentFinder
  def initialize(game)
    @game = game
    @analyzer = Analyzer.new()
    @positions = generate_positions
  end

  def find_last_critical_moment
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
        puts "#{move_index}: #{notation_for(move_index)} #{current_score}"
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

    puts "scores: #{scores.inspect}"
    "Critical moment: Move #{move_number}#{is_black_move ? '...' : '.'} #{move}"
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
    @game.moves.each do |move|
      translator.translate_move(move.notation)
      positions << translator.board_as_fen
    end
    positions
  end
end

# Command line interface
if ARGV.empty?
  puts "Please provide a PGN file as an argument."
  exit
end

pgn_file = ARGV[0]
pgn = File.read(pgn_file)
game = PGN.parse(pgn).first  # Parse the first game in the file
puts "game: #{game.tags['White']} vs #{game.tags['Black']}"
finder = CriticalMomentFinder.new(game)
puts finder.find_last_critical_moment
puts finder.deduce_winner
