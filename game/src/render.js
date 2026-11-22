// Drawing only: the game's state in, DOM out. Cards are real elements — a cost gem, a
// suit symbol in its colour, a big power number and one effect line — so every value is
// readable at thumbnail size. The renderer never owns rules; it paints what the engine
// says and floats damage numbers over the life bar it hit.

import { ENERGY_PER_TURN, LIFE_START, PLAYER_NAME, RIVAL_NAME, SUITS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** One face-up card: cost gem, suit symbol, name, big power, effect line, key hint. */
function cardFace(card, index, onPlay, playable) {
  const suit = SUITS[card.suit];
  const node = el('button', `card suit-${card.suit}${playable ? ' playable' : ' spent'}`);
  node.style.setProperty('--suit', suit.color);
  node.style.setProperty('--suit-dark', suit.dark);
  node.setAttribute('aria-label', `${card.name}, cost ${card.cost}, power ${card.power}. ${suit.effect}.`);
  node.append(el('span', 'cost', String(card.cost)));
  node.append(el('span', 'symbol', suit.symbol));
  node.append(el('span', 'card-name', card.name));
  node.append(el('span', 'power', String(card.power)));
  node.append(el('span', 'effect', suit.effect));
  node.append(el('span', 'key-hint', String(index + 1)));
  node.addEventListener('click', () => onPlay(index));
  return node;
}

/** One face-down card back, as the rival's hand shows it. */
function cardBack() {
  const node = el('div', 'card back');
  node.append(el('span', 'back-mark', '🔥'));
  return node;
}

export function createRenderer(callbacks) {
  const root = document.getElementById('table');
  const turnLabel = document.getElementById('turnLabel');
  const winsLabel = document.getElementById('winsLabel');
  const rivalHand = document.getElementById('rivalHand');
  const playerHand = document.getElementById('playerHand');
  const logBox = document.getElementById('log');
  const energyBox = document.getElementById('energyBox');
  const endTurn = document.getElementById('endTurn');
  const banner = document.getElementById('banner');
  const floatLayer = document.getElementById('floatLayer');
  const overlays = {
    [SCREEN_TITLE]: document.getElementById('titleScreen'),
    [SCREEN_WIN]: document.getElementById('winScreen'),
    [SCREEN_LOSE]: document.getElementById('loseScreen'),
  };

  document.getElementById('startButton').addEventListener('click', callbacks.onStart);
  document.getElementById('againWin').addEventListener('click', callbacks.onRestart);
  document.getElementById('againLose').addEventListener('click', callbacks.onRestart);
  endTurn.addEventListener('click', callbacks.onEndTurn);

  function setLife(prefix, side) {
    const fill = document.getElementById(`${prefix}LifeFill`);
    const text = document.getElementById(`${prefix}LifeText`);
    const shield = document.getElementById(`${prefix}Shield`);
    fill.style.width = `${Math.max(0, (side.life / LIFE_START) * 100)}%`;
    text.textContent = `${side.life} / ${LIFE_START}`;
    shield.textContent = side.shield > 0 ? `🛡️ ${side.shield}` : '';
    shield.classList.toggle('on', side.shield > 0);
  }

  function setDeck(prefix, side) {
    document.getElementById(`${prefix}DeckCount`).textContent = String(side.deck.length);
  }

  /** Paint the table from the engine state; `animate` adds the play flourish. */
  function update(state, animate) {
    turnLabel.textContent = `Turn ${state.turn}`;
    setLife('rival', state.rival);
    setLife('player', state.player);
    setDeck('rival', state.rival);
    setDeck('player', state.player);

    rivalHand.replaceChildren();
    for (let index = 0; index < state.rival.hand.length; index += 1) {
      const back = cardBack();
      back.style.setProperty('--tilt', `${(index - (state.rival.hand.length - 1) / 2) * 4}deg`);
      rivalHand.append(back);
    }

    playerHand.replaceChildren();
    state.player.hand.forEach((card, index) => {
      const face = cardFace(card, index, callbacks.onPlayCard, card.cost <= state.player.energy && state.phase === 'player');
      face.style.setProperty('--tilt', `${(index - (state.player.hand.length - 1) / 2) * 3}deg`);
      playerHand.append(face);
    });

    energyBox.replaceChildren();
    for (let pip = 0; pip < ENERGY_PER_TURN; pip += 1) {
      energyBox.append(el('span', `pip${pip < state.player.energy ? ' on' : ''}`, '●'));
    }
    energyBox.append(el('span', 'energy-text', `Energy ${state.player.energy}/${ENERGY_PER_TURN}`));

    logBox.replaceChildren();
    for (const line of state.log) logBox.append(el('div', 'log-line', line));

    endTurn.disabled = state.phase !== 'player';
    endTurn.classList.toggle('your-turn', state.phase === 'player');
    root.classList.toggle('ai-turn', state.phase === 'ai');
    if (animate) root.classList.remove('deal');
  }

  /** A damage or heal number that floats up over a duelist's life bar, then leaves. */
  function floatText(prefix, text, kind) {
    const anchor = document.getElementById(`${prefix}Vitals`);
    const rect = anchor.getBoundingClientRect();
    const table = root.getBoundingClientRect();
    const node = el('span', `float-text ${kind}`, text);
    node.style.left = `${rect.left - table.left + rect.width / 2}px`;
    node.style.top = `${rect.top - table.top}px`;
    floatLayer.append(node);
    node.addEventListener('animationend', () => node.remove());
  }

  let bannerTimer = 0;
  /** A big centre announcement ("Your turn", "Cinder plays…") that fades on its own. */
  function announce(text) {
    banner.textContent = text;
    banner.classList.add('show');
    window.clearTimeout(bannerTimer);
    bannerTimer = window.setTimeout(() => banner.classList.remove('show'), 1100);
  }

  function show(screen, state, wins, stats) {
    for (const key of Object.keys(overlays)) overlays[key].classList.toggle('hidden', key !== screen);
    if (screen === SCREEN_TITLE) {
      document.getElementById('titleWins').textContent = wins > 0 ? `Duels won: ${wins}` : 'First to bring the other to 0 life wins the duel.';
    } else if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
      const lines = document.getElementById(screen === SCREEN_WIN ? 'winStats' : 'loseStats');
      lines.replaceChildren();
      lines.append(el('div', 'stat-line', `Turns played: ${stats.turns}`));
      lines.append(el('div', 'stat-line', `Damage you dealt: ${stats.damageDealt}`));
      lines.append(el('div', 'stat-line', `Damage you took: ${stats.damageTaken}`));
      lines.append(el('div', 'stat-line', `Duels won: ${wins}`));
    }
    winsLabel.textContent = `🏆 Wins ${wins}`;
    if (state) update(state, false);
  }

  return { update, floatText, announce, show };
}
