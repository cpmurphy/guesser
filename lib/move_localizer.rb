# frozen_string_literal: true

require 'i18n'

class MoveLocalizer
  CAPTURE = 'x'
  PROMOTION = '='
  CHECK = '+'
  CHECKMATE = '#'

  STANDARD_MOVE_REGEX = /^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=[QRBN])?([+#])?$/
  CASTLING_REGEX = /^O-O(-O)?([+#])?$/

  def initialize(locale)
    @locale = locale
  end

  def localize_move(algebraic)
    move_info = move_info_from_algebraic(algebraic)
    text = move_info[:castling] ? algebraic : build_localized_move(move_info)
    { text: text }
  end

  private

  def localize_disambiguation(disambiguation)
    return disambiguation if @locale.to_s != 'ru'

    if disambiguation&.match(/^([a-h])([1-8])?$/)
      return I18n.t("chess.files.#{disambiguation[0]}", locale: @locale) + (disambiguation[1] || '')
    end

    disambiguation
  end

  def localize_to(to)
    return "#{I18n.t("chess.files.#{to[0]}", locale: @locale)}#{to[1]}" if to.length > 1 && @locale.to_s == 'ru'

    to
  end

  def move_info_from_algebraic(algebraic)
    return parse_castling_move(algebraic) if CASTLING_REGEX.match?(algebraic)

    parse_standard_move(algebraic)
  end

  def parse_castling_move(algebraic)
    match = CASTLING_REGEX.match(algebraic)
    {
      castling: match[1] ? 'queenside' : 'kingside',
      check: match[2] == '+',
      checkmate: match[2] == '#'
    }
  end

  def parse_standard_move(algebraic)
    match = STANDARD_MOVE_REGEX.match(algebraic)
    raise "Invalid algebraic notation: #{algebraic}" unless match

    move_components = extract_move_components(match)
    move_components[:file_hint] = build_disambiguation(move_components)
    move_components
  end

  def extract_move_components(match)
    {
      piece: match[1] || 'P',
      to: match[5],
      capture: match[4] == 'x',
      promotion: extract_promotion(match[6]),
      check: match[7] == '+',
      checkmate: match[7] == '#',
      file_hint: match[2],
      rank_hint: match[3]
    }
  end

  def extract_promotion(promotion_string)
    promotion_string&.sub('=', '')
  end

  def build_disambiguation(components)
    disambiguation = ''
    disambiguation += components[:file_hint] if components[:file_hint]
    disambiguation += components[:rank_hint] if components[:rank_hint]
    disambiguation
  end

  def build_localized_move(move_info)
    [
      get_piece_letter(move_info[:piece]),
      localize_disambiguation(move_info[:file_hint]),
      get_capture_symbol(move_info[:capture]),
      localize_to(move_info[:to]),
      build_promotion(move_info[:promotion]),
      build_check_symbols(move_info)
    ].join
  end

  def get_piece_letter(piece)
    return '' unless piece && piece.upcase != 'P'

    I18n.t("chess.pieces.#{piece.upcase}", locale: @locale)
  end

  def get_capture_symbol(capture)
    capture ? CAPTURE : ''
  end

  def build_promotion(promotion)
    return '' unless promotion

    "#{PROMOTION}#{I18n.t("chess.pieces.#{promotion.upcase}", locale: @locale)}"
  end

  def build_check_symbols(move_info)
    return CHECKMATE if move_info[:checkmate]
    return CHECK if move_info[:check]

    ''
  end
end
