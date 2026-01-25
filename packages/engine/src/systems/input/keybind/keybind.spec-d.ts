import { assertType } from 'vitest';
import type { InputState } from '../input.types';
import { createMatchKeybind } from './keybind';
import type { KeyBind, KeyBindGroup, Match, MatchList } from './keybind.types';

declare const state: InputState;
const matchKeybind = createMatchKeybind(state);

// Direct call: single keybind
const directBool = matchKeybind({ code: 'Digit1', modifiers: {} });
assertType<boolean>(directBool);

// Direct call: group keybind
const directGroupBool = matchKeybind({ code: ['Digit1', 'Digit2'], modifiers: {} });
assertType<boolean>(directGroupBool);

// Options: boolean return (default)
const boolFn = matchKeybind({ state: 'down' });
assertType<(bind: KeyBind) => boolean>(boolFn);

// Options: first return
const firstFn = matchKeybind({ return: 'first' });
assertType<(bind: KeyBind) => Match | undefined>(firstFn);

// Options: all return
const allFn = matchKeybind({ return: 'all' });
assertType<(bind: KeyBind) => MatchList>(allFn);

// Options: some/every group with boolean return
const someBoolFn = matchKeybind({ type: 'some' });
assertType<(bind: KeyBindGroup) => boolean>(someBoolFn);

const everyBoolFn = matchKeybind({ type: 'every', state: 'pressed' });
assertType<(bind: KeyBindGroup) => boolean>(everyBoolFn);

// Options: some/every group with first return
const someFirstFn = matchKeybind({ type: 'some', return: 'first' });
assertType<(bind: KeyBindGroup) => Match | undefined>(someFirstFn);

const everyFirstFn = matchKeybind({ type: 'every', return: 'first' });
assertType<(bind: KeyBindGroup) => Match | undefined>(everyFirstFn);

// Options: some/every group with all return
const someAllFn = matchKeybind({ type: 'some', return: 'all' });
assertType<(bind: KeyBindGroup) => MatchList>(someAllFn);

const everyAllFn = matchKeybind({ type: 'every', return: 'all' });
assertType<(bind: KeyBindGroup) => MatchList>(everyAllFn);

// Valid calls with groups
someBoolFn({ code: ['Digit1', 'Digit2'], modifiers: {} });
everyBoolFn({ code: ['Digit1', 'Digit2'], modifiers: {} });
someFirstFn({ code: ['Digit1', 'Digit2'], modifiers: {} });
everyFirstFn({ code: ['Digit1', 'Digit2'], modifiers: {} });
someAllFn({ code: ['Digit1', 'Digit2'], modifiers: {} });
everyAllFn({ code: ['Digit1', 'Digit2'], modifiers: {} });

// Invalid calls
// @ts-expect-error - options call requires a bind argument
matchKeybind();

// @ts-expect-error - type: 'some' requires KeyBindGroup
someBoolFn({ code: 'Digit1', modifiers: {} });

// @ts-expect-error - type: 'every' requires KeyBindGroup
everyBoolFn({ code: 'Digit1', modifiers: {} });

// @ts-expect-error - return: 'first' without group expects KeyBind, not KeyBindGroup
firstFn({ code: ['Digit1'], modifiers: {} });

// @ts-expect-error - return: 'all' without group expects KeyBind, not KeyBindGroup
allFn({ code: ['Digit1'], modifiers: {} });

// @ts-expect-error - invalid state value
matchKeybind({ state: 'held' });

export {};