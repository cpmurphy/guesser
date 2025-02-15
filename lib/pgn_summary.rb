class PgnSummary
  def initialize(file)
    @file = file
    @games = []
  end

  attr_reader :games

  def load
    state = :start
    @games = []
    pos = 0
    @file.rewind
    while line = @file.gets
      line = line.encode('ISO-8859-1', 'cp1252', invalid: :replace, undef: :replace, replace: '')
      if state == :start
        if line =~ /^\s*\[/
          headers = {}
          headers['pos'] = pos
          headers.merge!(parse_header(line))
          state = :headers
        elsif line =~ /^\s*\d+\./
          state = :game
        end
      elsif state == :headers
        if line =~ /^\s*\[/
          headers.merge!(parse_header(line))
        elsif line =~ /^\s*$/
          @games.push(headers)
          state = :start
        end
      elsif state == :game
        if line =~ /^\s*$/
          state = :start
          pos = @file.pos
        end
      end
    end
    @games
  end

  def game_at(index)
    @file.pos = @games[index]['pos']
    if index < @games.length - 1
      end_pos = @games[index + 1]['pos']
    else
      end_pos = @file.size
    end
    read_len = end_pos - @file.pos
    game = @file.read(read_len)
    game = game.encode('ISO-8859-1', 'cp1252', invalid: :replace, undef: :replace, replace: '')
    game
  end

  def parse_header(line)
    line.scan(/\[(.*?)\s*("(.*?)")\s*\]/).map do |key, value|
      [key.strip, value.gsub(/"/, '')]
    end.to_h
  end

  def add_analysis(analysis)
    if analysis.size != @games.size
      raise "Analysis size #{analysis.size} does not match game size #{@games.size}"
    end
    @games.each_with_index do |game, index|
      game[:analysis] = analysis[index]['analysis']
    end
  end

  def translate_player_name(name, locale)
    return name unless locale.to_s == 'ru'
    I18n.t("players.#{name}", default: name, locale: locale)
  end

  def translated_game_at(index, locale)
    game = game_at(index)
    return game unless locale.to_s == 'ru'

    # Translate player names in game headers
    @games[index].each do |key, value|
      if ['White', 'Black'].include?(key)
        game = game.gsub(/\[#{key} "#{value}"\]/, "[#{key} \"#{translate_player_name(value, locale)}\"]")
      end
    end
    game
  end

  def games_with_translated_names(locale)
    return @games unless locale.to_s == 'ru'

    @games.map do |game|
      game_copy = game.dup
      game_copy['White'] = translate_player_name(game['White'], locale)
      game_copy['Black'] = translate_player_name(game['Black'], locale)
      game_copy
    end
  end
end
