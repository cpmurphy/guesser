module ChessGuesser
  module SecureHeadersConfiguration
    SecureHeaders::Configuration.default do |config|
      # rubocop:disable Lint/PercentStringArray
      config.csp = {
        default_src: %w['self'],
        script_src: %w['self' 'unsafe-inline' 'unsafe-eval'],
        style_src: %w['self' 'unsafe-inline'],
        img_src: %w['self' data:],
        connect_src: %w['self'],
        font_src: %w['self'],
        object_src: %w['none'],
        frame_src: %w['none'],
        frame_ancestors: %w['none'],
        form_action: %w['self'],
        base_uri: %w['self'],
        upgrade_insecure_requests: true
      }
      # rubocop:enable Lint/PercentStringArray
      config.x_frame_options = 'DENY'
      config.x_content_type_options = 'nosniff'
      config.x_xss_protection = '1; mode=block'
      config.x_download_options = 'noopen'
      config.x_permitted_cross_domain_policies = 'none'
      config.referrer_policy = %w[strict-origin-when-cross-origin]
    end
  end
end
