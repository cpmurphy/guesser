# frozen_string_literal: true

module ChessGuesser
  module LocaleHandling
    def self.discover_supported_locales
      I18n.load_path << Dir[File.expand_path('i18n/*.yml')]
      i18n_path = File.expand_path('i18n/*.yml')
      Dir.glob(i18n_path).map do |file|
        basename = File.basename(file, '.yml')

        if basename.include?('-')
          language, region = basename.split('-', 2)
          :"#{language}-#{region.upcase}"
        else
          basename.to_sym
        end
      end.freeze
    end

    def choose_locale
      # First try cookie
      if request.cookies['locale']
        request.cookies['locale'].to_sym
      else
        # Fall back to browser Accept-Language header
        extract_locale_from_accept_language_header
      end
    end

    private

    def extract_locale_from_accept_language_header
      I18n.default_locale = :en
      return I18n.default_locale unless request.env['HTTP_ACCEPT_LANGUAGE']

      accepted_languages = request.env['HTTP_ACCEPT_LANGUAGE'].split(',')
                                  .map { |l| l.split(';q=') }
                                  .map { |l| [l[0].split('-')[0], (l[1] || '1').to_f] }
                                  .sort_by { |_, q| -q }
                                  .map { |locale, _| locale.to_sym }

      preferred_locale = accepted_languages.find { |locale| SUPPORTED_LOCALES.include?(locale) }

      preferred_locale || I18n.default_locale
    end
  end
end 
