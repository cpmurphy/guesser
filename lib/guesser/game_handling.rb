# frozen_string_literal: true

module ChessGuesser
  module GameHandling
    def build_builtin_allowlist
      Dir.glob('data/builtins/*-games.pgn').map do |file|
        File.basename(file, '-games.pgn')
      end.freeze
    end

    def gather_builtins
      file_map = Dir.glob('data/builtins/*-games.pgn').each_with_object({}) do |file, map|
        basename = File.basename(file, '-games.pgn')
        translation_key = basename.gsub('-', '_')
        description = t("builtins.#{translation_key}")
        game_count = PgnSummary.new(File.open(file, encoding: Encoding::ISO_8859_1)).load.size
        map[basename] = [basename, file, description, game_count]
      end

      file_map.values.sort_by { |item| item[2] }
    end

    def build_game_state(game, locale)
      moves = game.moves.map(&:notation)
      move_translator = MoveTranslator.new
      side_with_first_move = game.starting_position ? game.starting_position.player : 'white'
      starting_move = 1
      white_player = game.tags['White']
      white_player = if !white_player || white_player.empty?
                      t('game.white')
                  else
                      translate_player_name(white_player, locale)
                  end
      black_player = game.tags['Black']
      black_player = if !black_player || black_player.empty?
                      t('game.black')
                  else
                      translate_player_name(black_player, locale)
                  end
      if game.starting_position
      move_translator.load_game_from_fen(game.starting_position.to_fen.to_s)
      starting_move = game.starting_position.fullmove
      end
      {
        locale: locale,
        fen: game.positions.first.to_fen,
        moves: moves,
        ui_moves: moves.map { |move| move_translator.translate_move(move) },
        starting_whole_move: starting_move,
        current_whole_move: starting_move,
        side_to_move: side_with_first_move,
        white: white_player,
        black: black_player,
        date: game.tags['Date'],
        event: game.tags['Event'],
        result: game.result
      }
    end

    def translate_player_name(name, locale)
      return name unless name == 'NN' || locale.to_s == 'ru'

      I18n.t("players.#{name}", default: name, locale: locale)
    end

    def builtin_game_state(valid_pgn_basenames, basename, game_index, locale)
      File.join('data/builtins', "#{basename}-games.pgn")
      game = builtin_game(valid_pgn_basenames, basename, game_index)
      build_game_state(game, locale)
    end

    def uploaded_game_state(game_index, locale)
      game = uploaded_game(game_index)
      build_game_state(game, locale)
    end

    def uploaded_game(game_index)
      pgn = session['summary'].game_at(game_index)
      PGN.parse(pgn).first
    end

    def builtin_game(valid_pgn_basenames, basename, game_index)
      halt 404 unless valid_pgn_basenames.include?(basename)

      file_path = File.join('data/builtins', "#{basename}-games.pgn")
      summary = PgnSummary.new(File.open(file_path, encoding: Encoding::ISO_8859_1))
      summary.load
      games = PGN.parse(summary.game_at(game_index))
      games.first
    end

    def game_for_path(valid_pgn_basenames, path)
      if path.include?('builtin')
        game_for_builtin_path(valid_pgn_basenames, path)
      elsif path.include?('uploaded')
        game_for_uploaded_path(path)
      else
        halt 404
      end
    end

    def game_for_builtin_path(valid_pgn_basenames, path)
      parts = path.split('/')
      basename = parts[-2]
      game_index = parts[-1].to_i
      halt 404 unless valid_pgn_basenames.include?(basename)
      builtin_game(valid_pgn_basenames, basename, game_index)
    end

    def game_for_uploaded_path(path)
      uploaded_index = path.split('/').last.to_i
      uploaded_game(uploaded_index)
    end
 
    def summary_from_upload(params)
      if params[:upload_method] == 'file'
        if params[:pgn_file] && (tempfile = params[:pgn_file][:tempfile])
          pgn_file = Tempfile.new('pgn', encoding: Encoding::ISO_8859_1)
          FileUtils.copy_file(tempfile.path, pgn_file.path)
          pgn_file.rewind
          summary = PgnSummary.new(pgn_file)
        end
      else
        pgn_file = Tempfile.new('pgn', encoding: Encoding::ISO_8859_1)
        pgn_file.write(params[:pgn_text])
        pgn_file.rewind
        summary = PgnSummary.new(pgn_file)
      end
      summary
    end
  end
end
