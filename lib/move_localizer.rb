require 'i18n'

class MoveLocalizer
    CAPTURE = 'x'
    PROMOTION = '='
    CHECK = '+'
    CHECKMATE = '#'

    def initialize(locale)
        @locale = locale
    end

    def localize_move(algebraic)
      # Convert English algebraic notation to move_info
      move_info = move_info_from_algebraic(algebraic)

      # Convert move_info to localized notation
      piece = move_info[:piece]
      piece_letter = if piece && piece.upcase != 'P'
        I18n.t("chess.pieces.#{piece.upcase}", locale: @locale)
      else
        ''
      end

      if move_info[:castling]
        text = algebraic
      else
        # For regular moves, maintain algebraic notation format
        file_hint = localize_disambiguation(move_info[:file_hint])  # Use the original disambiguation if any
        capture = move_info[:capture] ? CAPTURE : ''
        to = localize_to(move_info[:to])
        promotion = move_info[:promotion] ? "#{PROMOTION}#{I18n.t("chess.pieces.#{move_info[:promotion].upcase}", locale: @locale)}" : ''
        check = move_info[:check] ? CHECK : ''
        checkmate = move_info[:checkmate] ? CHECKMATE : ''

        text = "#{piece_letter}#{file_hint}#{capture}#{to}#{promotion}#{check}#{checkmate}"
      end

      { text: text }
    end

    private

    def localize_disambiguation(disambiguation)
        if @locale.to_s != 'ru'
            return disambiguation
        end

        if disambiguation && disambiguation.match(/^([a-h])([1-8])?$/)
            return I18n.t("chess.files.#{disambiguation[0]}", locale: @locale) + (disambiguation[1] || '')
        else
            return disambiguation
        end
    end

    def localize_to(to)
        if to.length > 1 && @locale.to_s == 'ru'
            return "#{I18n.t("chess.files.#{to[0]}", locale: @locale)}#{to[1]}"
        else
            return to
        end
    end

    STANDARD_MOVE_REGEX = /^([KQRBN])?([a-h])?([1-8])?(x)?([a-h][1-8])(=[QRBN])?([\+#])?$/
    CASTLING_REGEX = /^O-O(-O)?([\+#])?$/

    def move_info_from_algebraic(algebraic)
      # Handle castling first
      match = CASTLING_REGEX.match(algebraic)
      if match
        castling = match[1] ? 'queenside' : 'kingside'
        check = match[2] == '+'
        checkmate = match[2] == '#'
        return {
          castling: castling,
          check: check,
          checkmate: checkmate
        }
      end

      # Parse the move components
      match = STANDARD_MOVE_REGEX.match(algebraic)
      if match
        piece = match[1] || 'P'
        file_hint = match[2]
        rank_hint = match[3]
        capture = match[4] == 'x'
        to = match[5]
        promotion = match[6]&.sub('=', '')
        check = match[7] == '+'
        checkmate = match[7] == '#'

        # Keep original disambiguation (if any)
        disambiguation = ''
        disambiguation += file_hint if file_hint
        disambiguation += rank_hint if rank_hint

        {
          piece: piece,
          file_hint: disambiguation,
          to: to,
          capture: capture,
          promotion: promotion,
          check: check,
          checkmate: checkmate
        }
      else
        raise "Invalid algebraic notation: #{algebraic}"
      end
    end

end