# frozen_string_literal: true

module ChessGuesser
  module LocaleHandling
    def self.discover_supported_locales
      I18n.load_path = Dir[File.expand_path('i18n/*.yml')]
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
      set_default_locale
      return I18n.default_locale unless accept_language_header

      accepted_languages = parse_accept_language_header
      find_preferred_locale(accepted_languages)
    end

    def set_default_locale
      I18n.default_locale = :en
    end

    def accept_language_header
      request.env['HTTP_ACCEPT_LANGUAGE']
    end

    def parse_accept_language_header
      accept_language_header
        .split(',')
        .map { |lang| parse_language_entry(lang) }
        .sort_by { |_, quality| -quality }
        .map { |locale, _| locale.to_sym }
    end

    def parse_language_entry(entry)
      language, quality = entry.split(';q=')
      base_language = language.split('-')[0]
      quality_value = (quality || '1').to_f
      [base_language, quality_value]
    end

    def find_preferred_locale(accepted_languages)
      preferred_locale = accepted_languages.find { |locale| SUPPORTED_LOCALES.include?(locale) }
      preferred_locale || I18n.default_locale
    end
  end
end
