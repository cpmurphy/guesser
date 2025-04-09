export const loadModules = async (version) => {
  const versionSuffix = version ? `?v=${version}` : '';

  // Use dynamic imports to include version
  const [
    ChessRules,
    { COLOR, PIECE },
    GameState,
    MoveLocalizer,
    EvaluationExplainer,
    Fen,
    ResultDisplay,
    ButtonUi
  ] = await Promise.all([
    import(`./chess_rules.js${versionSuffix}`).then(m => m.default),
    import(`./board_definitions.js${versionSuffix}`),
    import(`./game_state.js${versionSuffix}`).then(m => m.default),
    import(`./move_localizer.js${versionSuffix}`).then(m => m.default),
    import(`./evaluation_explainer.js${versionSuffix}`).then(m => m.default),
    import(`./fen.js${versionSuffix}`).then(m => m.default),
    import(`./result_display.js${versionSuffix}`).then(m => m.default),
    import(`./button_ui.js${versionSuffix}`).then(m => m.default)
  ]);

  return {
    ChessRules, COLOR, PIECE, GameState, MoveLocalizer, EvaluationExplainer, Fen, ResultDisplay, ButtonUi
  };
}; 
