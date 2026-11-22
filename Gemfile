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
# Keep this tag equal to POOL_REF. For local client work:
#   bundle config local.stockfish_pool_client /path/to/stockfish-pool/client
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
