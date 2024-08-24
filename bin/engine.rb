#! /usr/bin/ruby -w
$LOAD_PATH.unshift(File.expand_path('..', __dir__))
require 'lib/analyzer'

engine_path = '/usr/local/bin/stockfish'

fen = "3qr3/1b1rb2Q/p2pk1p1/1p1np3/4P3/P2BB3/1PP3PP/4R2K w - - 2 24"
analyser = Analyzer.new(engine_path)
best_moves = analyser.best_moves(fen)
puts "Top 3 moves: #{best_moves.inspect}"
