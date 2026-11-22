// Ember Duel: every tuning number, suit and card in one place. The table is a fixed
// 1280x800 logical area; the layout scales with the window, so no rule below depends on
// the screen size.

export const LIFE_START = 24;
export const ENERGY_PER_TURN = 3;
export const HAND_START = 5;
export const HAND_MAX = 7;
export const PLAYER_NAME = 'You';
export const RIVAL_NAME = 'Cinder';

/** Suits are told apart by colour AND symbol AND effect, never by text alone. */
export const SUITS = {
  ember: { label: 'Ember', symbol: '🔥', color: '#e5534b', dark: '#8f2b25', verb: 'Strike', effect: 'Deal damage' },
  oak: { label: 'Oak', symbol: '🛡️', color: '#58b368', dark: '#2c5c36', verb: 'Guard', effect: 'Gain shield' },
  tide: { label: 'Tide', symbol: '💧', color: '#4f9fd8', dark: '#27567e', verb: 'Mend', effect: 'Restore life' },
  spark: { label: 'Spark', symbol: '⚡', color: '#f2c94c', dark: '#8a6d1d', verb: 'Bolt', effect: 'Damage + draw 1' },
};

/**
 * The deck both duelists share: 24 cards. `power` is the damage, shield or healing the
 * card is worth; `cost` is the energy it takes to play.
 */
export const DECKLIST = [
  { suit: 'ember', cost: 1, power: 2, count: 3 },
  { suit: 'ember', cost: 2, power: 4, count: 3 },
  { suit: 'ember', cost: 3, power: 6, count: 2 },
  { suit: 'oak', cost: 1, power: 3, count: 3 },
  { suit: 'oak', cost: 2, power: 5, count: 2 },
  { suit: 'tide', cost: 1, power: 2, count: 2 },
  { suit: 'tide', cost: 2, power: 4, count: 2 },
  { suit: 'spark', cost: 1, power: 2, count: 2 },
  { suit: 'spark', cost: 2, power: 3, count: 3 },
  { suit: 'spark', cost: 3, power: 5, count: 2 },
];

export const PALETTE = {
  felt: '#14532d',
  feltDark: '#0b3d20',
  feltEdge: '#0a2e18',
  gold: '#f2c94c',
  panel: '#1c2430',
  panelEdge: '#39445a',
  text: '#f4f1e6',
  muted: '#aab3c0',
  life: '#e5534b',
  shield: '#7fb3e8',
  energy: '#f2c94c',
  back: '#7a2e2e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the win count is kept between visits (this browser only). */
export const WINS_KEY = 'ember-duel.wins';
