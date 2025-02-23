# frozen_string_literal: true

class PgnSummary
  def initialize(file)
    @file = file
    @games = []
  end

  attr_reader :games

  private

  def process_line(line, state, pos)
    case state
    when :start
      handle_start_state(line, pos)
    when :headers
      handle_headers_state(line)
    when :game
      handle_game_state(line, pos)
    else
      [state, pos]
    end
  end

  def handle_start_state(line, pos)
    if line =~ /^\s*\[/
      @current_headers = { 'pos' => pos }
      @current_headers.merge!(parse_header(line))
      [:headers, pos]
    elsif line =~ /^\s*\d+\./
      [:game, pos]
    else
      [:start, pos]
    end
  end

  def handle_headers_state(line)
    if line =~ /^\s*\[/
      @current_headers.merge!(parse_header(line))
      [:headers, @current_headers['pos']]
    elsif line =~ /^\s*$/
      @games.push(@current_headers)
      [:start, @current_headers['pos']]
    else
      [:headers, @current_headers['pos']]
    end
  end

  def handle_game_state(line, pos)
    if line =~ /^\s*$/
      [:start, @file.pos]
    else
      [:game, pos]
    end
  end

  public

  def load
    state = :start
    @games = []
    pos = 0
    @file.rewind

    while (line = @file.gets)
      line = line.encode('ISO-8859-1', 'cp1252', invalid: :replace, undef: :replace, replace: '')
      state, pos = process_line(line, state, pos)
    end
    @games
  end

  def game_at(index)
    @file.pos = @games[index]['pos']
    end_pos = if index < @games.length - 1
                @games[index + 1]['pos']
              else
                @file.size
              end
    read_len = end_pos - @file.pos
    game = @file.read(read_len)
    game.encode('ISO-8859-1', 'cp1252', invalid: :replace, undef: :replace, replace: '')
  end

  def parse_header(line)
    line.scan(/\[(.*?)\s*("(.*?)")\s*\]/).to_h do |key, value|
      [key.strip, value.gsub('"', '')]
    end
  end

  def add_analysis(analysis)
    raise "Analysis size #{analysis.size} does not match game size #{@games.size}" if analysis.size != @games.size

    @games.each_with_index do |game, index|
      game[:analysis] = analysis[index]['analysis']
    end
  end

  def translate_player_name(name, locale)
    return name unless translated_name_available?(name, locale)

    I18n.t("players.#{name}", default: name, locale: locale)
  end

  def translated_game_at(index, locale)
    game = game_at(index)
    return game unless locale.to_s == 'ru' || either_player_nn?(game)

    # Translate player names in game headers
    @games[index].each do |key, value|
      if %w[White Black].include?(key)
        game = game.gsub(/\[#{key} "#{value}"\]/, "[#{key} \"#{translate_player_name(value, locale)}\"]")
      end
    end
    game
  end

  def games_with_translated_names(locale)
    return @games unless locale.to_s == 'ru' || any_game_with_anonymous_player?(@games)

    @games.map do |game|
      game_copy = game.dup
      game_copy['White'] = translate_player_name(game['White'], locale)
      game_copy['Black'] = translate_player_name(game['Black'], locale)
      game_copy
    end
  end

  def translated_name_available?(name, locale)
    name == 'NN' || locale.to_s == 'ru'
  end

  def either_player_nn?(game)
    game['White'] == 'NN' || game['Black'] == 'NN'
  end

  def any_game_with_anonymous_player?(games)
    games.any? do |game|
      either_player_nn?(game)
    end
  end
end
