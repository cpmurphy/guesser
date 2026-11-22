# frozen_string_literal: true

source 'https://rubygems.org'

gem 'haml'
gem 'i18n'
gem 'pgn2'
gem 'puma', '>= 8.0.3'
gem 'racc'
gem 'rack'
gem 'rackup'
gem 'secure_headers'
gem 'sinatra'
gem 'stockfish'
# Keep this tag equal to POOL_REF (bin/check-pool-ref enforces it). For local
# client work, point Bundler at the repository root (not client/); a tag pin
# also needs the branch check turned off:
#   bundle config set local.stockfish_pool_client /path/to/stockfish-pool
#   bundle config set disable_local_branch_check true
# Undo with `bundle config unset` on both settings.
gem 'stockfish_pool_client',
    git: 'https://github.com/cpmurphy/stockfish-pool.git',
    glob: 'client/*.gemspec',
    tag: 'v0.1.0'

group :development, :test do
  gem 'debug', '>= 1.0.0'
  gem 'minitest'
  gem 'minitest-mock'
  gem 'rack-test'
  gem 'rake'
  gem 'rubocop', require: false
  gem 'rubocop-minitest', require: false
  gem 'simplecov', require: false
end
