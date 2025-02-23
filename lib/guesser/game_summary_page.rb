# frozen_string_literal: true

module ChessGuesser
  module GameSummaryPage
    def build_table(summary)
      summary.games.map.with_index do |game, index|
        {
          id: index,
          white: game['White'],
          black: game['Black'],
          date: game['Date'],
          event: game['Event'],
          result: game['Result'],
          critical_moment: game[:analysis] ? notation_for_move(game[:analysis]['last_critical_moment']) : {},
          serious_mistake: game[:analysis] ? notation_for_move(game[:analysis]['first_serious_mistake']) : {}
        }
      end
    end

    def notation_for_move(critical_moment)
      if critical_moment && critical_moment['move_number']
        losing_side = critical_moment['side']
        winning_side = losing_side == 'white' ? 'black' : 'white'
        critical_move_number = critical_moment['move_number']
        move_before_win = winning_side == 'black' ? critical_move_number : critical_move_number + 1
        localized_move = @move_localizer.localize_move(critical_moment['move'])
        {
          move_number: move_before_win,
          side: winning_side,
          text: "#{critical_move_number}. #{losing_side == 'white' ? '' : '...'} #{localized_move[:text]}"
        }
      else
        {}
      end
    end
  end
end 
