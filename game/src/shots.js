// The screenshot scenes behind ?shot=start|play|end. Each one plays the real rules
// forward from a fresh duel, steered by the same autopilot both sides use, so the frame
// is what a real game looks like and the same seed always gives the same frame. The end
// scene replays the duel on nearby seeds until the autopilot wins one, so it shows a
// victory; the defeat screen is the same overlay with the other outcome.

import { createRandom } from './random.js';
import { createGame } from './engine.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

const PLAY_ROUNDS = 3;
const END_ATTEMPTS = 20;
const END_SEED_STEP = 7919;

/** Play `rounds` full rounds of autopilot against autopilot, mid-duel. */
function playRounds(game, rounds) {
  for (let round = 0; round < rounds && game.state.phase !== 'over'; round += 1) {
    let index = game.choosePlay('player');
    while (index >= 0 && game.state.phase === 'player') {
      game.playCard('player', index);
      index = game.choosePlay('player');
    }
    if (game.state.phase === 'player') game.endPlayerTurn();
    if (game.state.phase === 'ai') game.aiTakeTurn();
  }
}

/**
 * Stage the named scene from the seed and return the game and the screen to draw over
 * it (start, play or end; any other name is start).
 */
export function stageShot(name, seed) {
  if (name === 'play') {
    const game = createGame(createRandom(seed));
    playRounds(game, PLAY_ROUNDS);
    if (game.state.phase === 'over') {
      return { game, screen: game.state.winner === 'player' ? SCREEN_WIN : SCREEN_LOSE };
    }
    return { game, screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    for (let attempt = 0; attempt < END_ATTEMPTS; attempt += 1) {
      const game = createGame(createRandom(seed + attempt * END_SEED_STEP));
      if (game.playAutopilot() === 'player') return { game, screen: SCREEN_WIN };
    }
    const game = createGame(createRandom(seed));
    game.playAutopilot();
    return { game, screen: game.state.winner === 'player' ? SCREEN_WIN : SCREEN_LOSE };
  }
  return { game: createGame(createRandom(seed)), screen: SCREEN_TITLE };
}
