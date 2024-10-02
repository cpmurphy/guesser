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
    game
  end

  def parse_header(line)
    line.scan(/\[(.*?)\s*("(.*?)")\s*\]/).map do |key, value|
      [key.strip, value.gsub(/"/, '')]
    end.to_h
  end
end