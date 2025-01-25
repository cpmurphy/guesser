#! /usr/bin/env ruby
require 'pgn'
require_relative '../lib/analyzer'
require_relative '../lib/move_translator'
require_relative '../lib/pgn_summary'
require 'json'

class CriticalMomentFinder
  SERIOUS_MISTAKE_DROP = 71

  def initialize(game)
    @game = game
    @analyzer = Analyzer.new()
    @positions = generate_positions
  end

  def analyze_game
    winner = deduce_winner
    return { result: "The ending position was about equal. No critical moment found." } if winner == :draw

    scores, last_critical_moment = find_last_critical_moment(winner)
    first_serious_mistake = find_first_serious_mistake(scores, winner)

    {
      scores: scores.inspect,
      last_critical_moment: last_critical_moment,
      first_serious_mistake: first_serious_mistake,
      winner: winner,
      total_moves: @game.moves.length
    }
  end

  private

  def find_last_critical_moment(winner)
    max_score_drop = 0
    last_score = nil
    scores = []
    move_index = (@positions.length - 1)
    loser_moves = winner == :black ? :even : :odd
    critical_index = move_index

    if move_index % 2 == 1 && loser_moves == :even || move_index % 2 == 0 && loser_moves == :odd
      move_index -= 1
    end

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

    [scores, {
      move_number: move_number,
      side: is_black_move ? 'black' : 'white',
      move: @game.moves[critical_index].notation
    }]
  end

  def find_first_serious_mistake(scores, winner)
    first_mistake = nil
    reverse_scores = scores.reverse
    reverse_scores.each_with_index do |score, index|
      next if index == 0 # Skip the first score as we need a previous score to compare

      score_diff = score - reverse_scores[index - 1]
      if score_diff >= SERIOUS_MISTAKE_DROP
        move_index = @game.moves.length - (2 * (scores.length - index))
        loser_moves = winner == :black ? :even : :odd
        if move_index % 2 == 1 && loser_moves == :even || move_index % 2 == 0 && loser_moves == :odd
          move_index += 1
        end
        move_number = (move_index / 2) + 1
        first_mistake = {
          score_after: score,
          score_before: reverse_scores[index - 1],
          move_number: move_number,
          move: @game.moves[move_index].notation,
          side: (winner == :white) ? 'black' : 'white'
        }
        break
      end
    end
    first_mistake
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
    analysis: finder.analyze_game
  }.to_json)
  puts ',' if index < summary.games.length - 1
end
puts "\n]"
