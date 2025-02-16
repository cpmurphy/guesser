# frozen_string_literal: true

require 'minitest/autorun'
require 'rack/test'
require_relative '../chess_guesser'

class SmokeTest < Minitest::Test
  include Rack::Test::Methods

  def app
    # Configure for testing
    ChessGuesser.set :environment, :test
    ChessGuesser.set :public_folder, File.expand_path('../public', __dir__)

    # Mock session data that would normally be set by SecureHeaders
    ChessGuesser.class_eval do
      before do
        session['secure_headers_request_config'] = nil
      end
    end

    ChessGuesser
  end

  def test_home_page_loads
    get '/'

    assert_predicate last_response, :ok?, "Home page failed to load: #{last_response.status}\n#{last_response.body}"
    assert_includes last_response.body, I18n.t('choose_from_built_in_games', locale: :en)
  end
end
