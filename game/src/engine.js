// The duel's rules and state, with no drawing and no browser in it: two 30-life duelists,
// a shared 24-card deck each, 3 energy a turn, four suits with four effects, and an
// opponent that picks its plays by scoring them. Every turn resolves: damage is dealt
// through shield first, decks reshuffle from their discard, and a duel ends the moment
// a life total reaches zero.

import { ENERGY_PER_TURN, HAND_MAX, HAND_START, LIFE_START } from './config.js';
import { buildDeck, drawCard, shuffle } from './deck.js';

function newSide() {
  return { life: LIFE_START, shield: 0, energy: 0, deck: [], hand: [], discard: [] };
}

export function createGame(random) {
  const state = {
    turn: 0,
    phase: 'idle',
    winner: null,
    player: newSide(),
    rival: newSide(),
    log: [],
    damageDealt: 0,
    damageTaken: 0,
  };

  function say(text) {
    state.log.push(text);
    if (state.log.length > 6) state.log.shift();
  }

  function reset() {
    for (const side of [state.player, state.rival]) {
      side.life = LIFE_START;
      side.shield = 0;
      side.energy = 0;
      side.deck = shuffle(buildDeck(), random);
      side.hand = [];
      side.discard = [];
      for (let dealt = 0; dealt < HAND_START; dealt += 1) drawCard(side, random);
    }
    state.turn = 1;
    state.phase = 'player';
    state.winner = null;
    state.log = [];
    state.damageDealt = 0;
    state.damageTaken = 0;
    state.player.energy = ENERGY_PER_TURN;
    say('Duel begins. Your turn — play a card or end the turn.');
  }

  /** Damage goes through shield first, then life; returns what was blocked and dealt. */
  function dealDamage(defender, amount) {
    const blocked = Math.min(defender.shield, amount);
    defender.shield -= blocked;
    const dealt = amount - blocked;
    defender.life = Math.max(0, defender.life - dealt);
    return { blocked, dealt };
  }

  function checkWinner() {
    if (state.rival.life <= 0) {
      state.winner = 'player';
      state.phase = 'over';
    } else if (state.player.life <= 0) {
      state.winner = 'rival';
      state.phase = 'over';
    }
  }

  /**
   * Play the card at `index` from `sideName`'s hand. Returns the event (null when the
   * play is not legal: wrong phase, no such card, or not enough energy).
   */
  function playCard(sideName, index) {
    const side = state[sideName];
    const foe = state[sideName === 'player' ? 'rival' : 'player'];
    if (state.phase === 'over') return null;
    if (sideName === 'rival' && state.phase !== 'ai') return null;
    if (sideName === 'player' && state.phase !== 'player') return null;
    const card = side.hand[index];
    if (!card || card.cost > side.energy) return null;
    side.hand.splice(index, 1);
    side.energy -= card.cost;
    side.discard.push(card);
    const who = sideName === 'player' ? 'You' : 'Cinder';
    const event = { card, actor: sideName, damage: 0, blocked: 0, healed: 0, shield: 0, drew: null, text: '' };
    if (card.suit === 'ember' || card.suit === 'spark') {
      const hit = dealDamage(foe, card.power);
      event.damage = hit.dealt;
      event.blocked = hit.blocked;
      if (sideName === 'player') state.damageDealt += hit.dealt;
      else state.damageTaken += hit.dealt;
      event.text = `${who} ${card.suit === 'ember' ? 'strike' : 'bolt'} for ${card.power}` +
        (hit.blocked > 0 ? ` (${hit.blocked} blocked)` : '') + '.';
    } else if (card.suit === 'oak') {
      side.shield += card.power;
      event.shield = card.power;
      event.text = `${who} raise ${card.power} shield.`;
    } else {
      const healed = Math.min(card.power, LIFE_START - side.life);
      side.life += healed;
      event.healed = healed;
      event.text = `${who} mend ${healed} life.`;
    }
    if (card.suit === 'spark') {
      event.drew = side.hand.length < HAND_MAX ? drawCard(side, random) : null;
      if (event.drew) event.text += ' Draw a card.';
    }
    say(event.text);
    checkWinner();
    return event;
  }

  /** Score one playable card for `sideName`: lethal first, then value for its cost. */
  function scoreCard(sideName, card) {
    const side = state[sideName];
    const foe = state[sideName === 'player' ? 'rival' : 'player'];
    if (card.cost > side.energy) return -1;
    if (card.suit === 'ember' || card.suit === 'spark') {
      const lethal = card.power >= foe.life + foe.shield;
      let score = Math.min(card.power, foe.life + foe.shield) + (card.power / card.cost) * 0.3;
      if (lethal) score += 100;
      if (card.suit === 'spark') score += 2;
      return score;
    }
    if (card.suit === 'oak') {
      if (side.shield >= 12) return -1;
      return card.power * 0.85 + (side.life <= 10 ? 2 : 0);
    }
    const room = LIFE_START - side.life;
    if (room <= 0) return -1;
    return Math.min(card.power, room) * (side.life <= 12 ? 1.4 : 0.9);
  }

  /** The best card for `sideName` to play now (its hand index), or -1 to hold. */
  function choosePlay(sideName) {
    const side = state[sideName];
    let best = -1;
    let bestScore = 1;
    for (let index = 0; index < side.hand.length; index += 1) {
      const score = scoreCard(sideName, side.hand[index]) + random() * 0.5;
      if (score > bestScore) {
        bestScore = score;
        best = index;
      }
    }
    return best;
  }

  /** One step of the rival's turn: its best play, or 'done' when it holds. */
  function aiStep() {
    if (state.phase !== 'ai') return 'done';
    const index = choosePlay('rival');
    if (index < 0) return 'done';
    return playCard('rival', index);
  }

  /** The whole rival turn at once (for the screenshot scenes): plays until it holds. */
  function aiTakeTurn() {
    let guard = 0;
    while (guard < 20) {
      guard += 1;
      if (aiStep() === 'done') break;
      if (state.phase === 'over') return;
    }
    beginPlayerTurn();
  }

  /** Start the player's next turn: draw, refill energy, count the turn. */
  function beginPlayerTurn() {
    if (state.phase === 'over') return;
    state.turn += 1;
    state.phase = 'player';
    state.player.energy = ENERGY_PER_TURN;
    if (state.player.hand.length < HAND_MAX) drawCard(state.player, random);
    say(`Turn ${state.turn}. You draw a card.`);
  }

  /** The player ends the turn; the rival's turn begins. */
  function endPlayerTurn() {
    if (state.phase !== 'player') return;
    state.phase = 'ai';
    state.rival.energy = ENERGY_PER_TURN;
    if (state.rival.hand.length < HAND_MAX) drawCard(state.rival, random);
    say('Cinder takes a turn.');
  }

  /**
   * Play a whole duel with both sides on autopilot, for the screenshot scenes.
   * Returns the winner ('player' or 'rival').
   */
  function playAutopilot() {
    let guard = 0;
    while (state.phase !== 'over' && guard < 80) {
      guard += 1;
      if (state.phase === 'player') {
        let index = choosePlay('player');
        while (index >= 0 && state.phase === 'player') {
          playCard('player', index);
          if (state.phase === 'over') break;
          index = choosePlay('player');
        }
        if (state.phase === 'player') endPlayerTurn();
      } else if (state.phase === 'ai') {
        aiTakeTurn();
      }
    }
    if (state.phase !== 'over') {
      state.winner = state.player.life >= state.rival.life ? 'player' : 'rival';
      state.phase = 'over';
    }
    return state.winner;
  }

  reset();
  return { state, reset, playCard, choosePlay, aiStep, aiTakeTurn, beginPlayerTurn, endPlayerTurn, playAutopilot };
}
