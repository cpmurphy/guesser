export const loadModules = async (version) => {
  const versionSuffix = version ? `?v=${version}` : '';

  // Use dynamic imports to include version
  const [ChessRules, { COLOR, PIECE }, GameState, MoveLocalizer, Fen] = await Promise.all([
    import(`./chess_rules.js${versionSuffix}`).then(m => m.default),
    import(`./board_definitions.js${versionSuffix}`),
    import(`./game_state.js${versionSuffix}`).then(m => m.default),
    import(`./move_localizer.js${versionSuffix}`).then(m => m.default),
    import(`./fen.js${versionSuffix}`).then(m => m.default)
  ]);

  return { ChessRules, COLOR, PIECE, GameState, MoveLocalizer, Fen };
}; 
