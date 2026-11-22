// The deck: build it from DECKLIST, shuffle it with the seeded random, and draw from it.
// A deck that runs out is reshuffled from its discard pile, so a duel always resolves.

import { DECKLIST, SUITS } from './config.js';

let nextId = 1;

/** One card: its suit, cost, power, a display name and a stable id. */
export function makeCard(suit, cost, power) {
  const def = SUITS[suit];
  return { id: nextId, suit, cost, power, name: `${def.label} ${def.verb}` };
}

/** A fresh 24-card deck in DECKLIST order (shuffling is the caller's job). */
export function buildDeck() {
  const deck = [];
  for (const entry of DECKLIST) {
    for (let count = 0; count < entry.count; count += 1) {
      deck.push(makeCard(entry.suit, entry.cost, entry.power));
    }
  }
  return deck;
}

/** Fisher-Yates shuffle, driven by the game's seeded random. */
export function shuffle(deck, random) {
  for (let index = deck.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    const held = deck[index];
    deck[index] = deck[other];
    deck[other] = held;
  }
  return deck;
}

/**
 * Draw one card into `hand`. When the deck is empty it is refilled from the discard pile
 * (shuffled); when both are empty there is nothing to draw. Returns the card or null.
 */
export function drawCard(side, random) {
  if (side.deck.length === 0) {
    if (side.discard.length === 0) return null;
    side.deck = shuffle(side.discard, random);
    side.discard = [];
  }
  const card = side.deck.pop();
  side.hand.push(card);
  return card;
}
