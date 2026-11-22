// Keyboard and pointer input. One-shot presses (play a card, end the turn, start or
// restart) are queued as flags and taken once by the loop, so a press between two
// frames is never lost and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_RESTART = 2;

const CONFIRM = new Set(['Space', 'Enter']);
const RESTART = new Set(['KeyR']);
const CARD_KEYS = new Map([
  ['Digit1', 0], ['Digit2', 1], ['Digit3', 2], ['Digit4', 3],
  ['Digit5', 4], ['Digit6', 5], ['Digit7', 6],
  ['Numpad1', 0], ['Numpad2', 1], ['Numpad3', 2], ['Numpad4', 3],
  ['Numpad5', 4], ['Numpad6', 5], ['Numpad7', 6],
]);

export function createInput() {
  let actions = 0;
  let cardIndex = -1;

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else if (CARD_KEYS.has(event.code)) {
      if (!event.repeat) cardIndex = CARD_KEYS.get(event.code);
    } else {
      return;
    }
    event.preventDefault();
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    cardIndex = -1;
  });

  return {
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The card key pressed since the last call (its hand index), or -1. */
    takeCard() {
      const taken = cardIndex;
      cardIndex = -1;
      return taken;
    },
  };
}
