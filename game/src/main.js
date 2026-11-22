// Boot and the one loop: the game moves between four screens — title, play, victory and
// defeat. Clicks and keys 1-7 play cards, Space or Enter ends the turn, R restarts after
// a duel. The rival's turn is stepped out on a timer so each of its plays can be seen.
//
// ?seed=N fixes the shuffle. ?shot=start|play|end (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { WINS_KEY } from './config.js';
import { createRandom } from './random.js';
import { createGame } from './engine.js';
import { ACTION_CONFIRM, ACTION_RESTART, createInput } from './input.js';
import { createRenderer, SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const AI_STEP_MS = 750;
const AI_FIRST_MS = 600;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const status = document.getElementById('status');
const game = createGame(createRandom(seed));

function readWins() {
  try {
    return Number.parseInt(window.localStorage.getItem(WINS_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveWins(value) {
  try {
    window.localStorage.setItem(WINS_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the win count then lasts this visit only.
  }
}

let wins = readWins();
let screen = SCREEN_TITLE;
let aiBusy = false;

function stats() {
  return { turns: game.state.turn, damageDealt: game.state.damageDealt, damageTaken: game.state.damageTaken };
}

const renderer = createRenderer({
  onStart: () => startGame(),
  onRestart: () => startGame(),
  onEndTurn: () => endTurnPressed(),
  onPlayCard: (index) => playCardPressed(index),
});

// Screen readers (and anyone watching the page's text) hear the screen changes.
function announce(message) {
  status.textContent = message;
}

function startGame() {
  game.reset();
  aiBusy = false;
  screen = SCREEN_PLAY;
  renderer.show(SCREEN_PLAY, game.state, wins);
  renderer.announce('Your turn');
  announce('Duel started. Your turn.');
}

function endGame() {
  screen = game.state.winner === 'player' ? SCREEN_WIN : SCREEN_LOSE;
  if (game.state.winner === 'player') {
    wins += 1;
    saveWins(wins);
  }
  renderer.show(screen, game.state, wins, stats());
  renderer.announce(game.state.winner === 'player' ? 'Victory!' : 'Defeat');
  announce(game.state.winner === 'player'
    ? `Victory in ${game.state.turn} turns.`
    : `Defeat in ${game.state.turn} turns.`);
}

function showEvent(event) {
  if (!event) return;
  if (event.damage > 0 || event.blocked > 0) {
    const target = event.actor === 'player' ? 'rival' : 'player';
    renderer.floatText(target, `-${event.damage}`, 'damage');
    if (event.blocked > 0) renderer.floatText(target, `🛡️ ${event.blocked}`, 'blocked');
  }
  if (event.healed > 0) renderer.floatText(event.actor, `+${event.healed}`, 'heal');
  if (event.shield > 0) renderer.floatText(event.actor, `🛡️ +${event.shield}`, 'shield');
}

function playCardPressed(index) {
  if (screen !== SCREEN_PLAY || game.state.phase !== 'player' || aiBusy) return;
  const event = game.playCard('player', index);
  if (!event) return;
  showEvent(event);
  renderer.update(game.state, true);
  if (game.state.phase === 'over') endGame();
}

function endTurnPressed() {
  if (screen !== SCREEN_PLAY || game.state.phase !== 'player' || aiBusy) return;
  game.endPlayerTurn();
  renderer.update(game.state, true);
  runAiTurn();
}

/** Step the rival's turn out one play at a time so each card can be seen. */
function runAiTurn() {
  aiBusy = true;
  function tick() {
    if (screen !== SCREEN_PLAY) {
      aiBusy = false;
      return;
    }
    const result = game.aiStep();
    if (result === 'done') {
      game.beginPlayerTurn();
      aiBusy = false;
      renderer.update(game.state, true);
      renderer.announce('Your turn');
      announce(`Turn ${game.state.turn}. Your turn.`);
      return;
    }
    showEvent(result);
    renderer.announce(`Cinder plays ${result.card.name}`);
    renderer.update(game.state, true);
    if (game.state.phase === 'over') {
      aiBusy = false;
      endGame();
      return;
    }
    window.setTimeout(tick, AI_STEP_MS);
  }
  window.setTimeout(tick, AI_FIRST_MS);
}

function runShot(name) {
  const scene = stageShot(name, seed);
  renderer.show(scene.screen, scene.game.state, wins, {
    turns: scene.game.state.turn,
    damageDealt: scene.game.state.damageDealt,
    damageTaken: scene.game.state.damageTaken,
  });
  let painted = 0;
  function paint() {
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput();
  renderer.show(SCREEN_TITLE, game.state, wins);
  announce('Ember Duel. Press Space or click to start.');

  function frame() {
    requestAnimationFrame(frame);
    const actions = input.takeActions();
    const cardIndex = input.takeCard();
    if (cardIndex >= 0) playCardPressed(cardIndex);
    if (actions & ACTION_RESTART && (screen === SCREEN_WIN || screen === SCREEN_LOSE)) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_PLAY) endTurnPressed();
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
