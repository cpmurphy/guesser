#!/usr/bin/env ruby
# frozen_string_literal: true

require_relative '../lib/pgn_summary'

def sort_by_date!(games)
  games.sort_by! do |game|
    # Convert date string like "2024.03.15" to a comparable format
    # Handle missing dates by putting them at the start
    date = game['Date'] || '0000.00.00'
    date.split('.').map(&:to_i)
  end
end

if ARGV.empty?
  puts 'Usage: ruby sort_pgn.rb input.pgn output.pgn'
  exit 1
end

input_file = File.open(ARGV[0], 'r')
output_file = File.open(ARGV[1], 'w')

pgn = PgnSummary.new(input_file)
pgn.load
games = pgn.games
games.each_with_index do |game, i|
  game[:pgn] = pgn.game_at(i)
end
sort_by_date!(games)
games.each do |game|
  output_file.puts game[:pgn]
  output_file.puts
end

input_file.close
output_file.close
