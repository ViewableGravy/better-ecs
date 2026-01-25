import { describe, it, expect } from 'vitest';
import { createMatchKeybind } from './keybind';
import type { InputState } from '../system';
import type { Match } from './keybind.types';

/**
 * Helper function to create a mock InputState for testing
 */
function createMockInputState(options: {
  keysDown?: string[];
  pressedThisTick?: string[];
  releasedThisTick?: string[];
} = {}): InputState {
  return {
    keysDown: new Set(options.keysDown ?? []),
    pressedThisTick: new Set(options.pressedThisTick ?? []),
    releasedThisTick: new Set(options.releasedThisTick ?? []),
    keysActive: new Set(),
    pressedBetweenUpdate: new Set(),
    eventBuffer: [],
  };
}

describe('matchKeybind', () => {
  describe('boolean return mode (default)', () => {
    it('should return true for a single matching keybind', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit1'] });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ code: 'Digit1', modifiers: {} });
      expect(result).toBe(true);
    });

    it('should return false for non-matching keybind', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit1'] });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ code: 'Digit2', modifiers: {} });
      expect(result).toBe(false);
    });

    it('should respect modifier requirements', () => {
      const state = createMockInputState({ 
        keysDown: ['ControlLeft', 'Digit1'],
        pressedThisTick: ['Digit1'] 
      });
      const matchKeybind = createMatchKeybind(state);
      
      const withCtrl = matchKeybind({ code: 'Digit1', modifiers: { ctrl: true } });
      const withoutCtrl = matchKeybind({ code: 'Digit1', modifiers: {} });
      
      expect(withCtrl).toBe(true);
      expect(withoutCtrl).toBe(false);
    });

    it('should match "some" in a group when any key matches', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit2'],
        pressedThisTick: ['Digit2']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ state: 'pressed', type: 'some' })({
        code: ['Digit1', 'Digit2', 'Digit3'],
        modifiers: {}
      });
      
      expect(result).toBe(true);
    });

    it('should match "every" in a group only when all keys match', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit1', 'Digit2'],
        pressedThisTick: ['Digit1', 'Digit2']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const allMatch = matchKeybind({ state: 'pressed', type: 'every' })({
        code: ['Digit1', 'Digit2'],
        modifiers: {}
      });
      
      const notAllMatch = matchKeybind({ state: 'pressed', type: 'every' })({
        code: ['Digit1', 'Digit2', 'Digit3'],
        modifiers: {}
      });
      
      expect(allMatch).toBe(true);
      expect(notAllMatch).toBe(false);
    });

    it('should allow direct group call without options', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit2'],
        pressedThisTick: ['Digit2']
      });
      const matchKeybind = createMatchKeybind(state);

      const result = matchKeybind({
        code: ['Digit1', 'Digit2', 'Digit3'],
        modifiers: {}
      });

      expect(result).toBe(true);
    });
  });

  describe('first return mode', () => {
    it('should return Match object when keybind matches', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit5'],
        pressedThisTick: ['Digit5'] 
      });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ return: 'first' })({ 
        code: 'Digit5', 
        modifiers: {} 
      });
      
      expect(result).toBeDefined();
      expect(result).toMatchObject({
        raw: 'Digit5',
        code: 5,
        codeStr: 'Digit5',
        key: '5',
        modifiers: {
          ctrl: false,
          shift: false,
          alt: false,
          meta: false
        }
      });
    });

    it('should return undefined when keybind does not match', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit1'] });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ return: 'first' })({ 
        code: 'Digit2', 
        modifiers: {} 
      });
      
      expect(result).toBeUndefined();
    });

    it('should extract numeric code from Digit keys', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit9'] });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ return: 'first' })({ 
        code: 'Digit9', 
        modifiers: {} 
      });
      
      expect(result?.code).toBe(9);
    });

    it('should return first match from a group with type: "some"', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit3'],
        pressedThisTick: ['Digit3']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ type: 'some', return: 'first' })({
        code: ['Digit1', 'Digit2', 'Digit3', 'Digit4'],
        modifiers: {}
      });
      
      expect(result).toBeDefined();
      expect(result?.codeStr).toBe('Digit3');
      expect(result?.code).toBe(3);
    });

    it('should return first match from a group with type: "every"', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit2'],
        pressedThisTick: ['Digit2']
      });
      const matchKeybind = createMatchKeybind(state);

      const result = matchKeybind({ type: 'every', return: 'first' })({
        code: ['Digit1', 'Digit2', 'Digit3'],
        modifiers: {}
      });

      expect(result).toBeDefined();
      expect(result?.codeStr).toBe('Digit2');
      expect(result?.code).toBe(2);
    });

    it('should include modifier state in Match object', () => {
      const state = createMockInputState({ 
        keysDown: ['ControlLeft', 'ShiftLeft', 'Digit1'],
        pressedThisTick: ['Digit1']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ return: 'first' })({ 
        code: 'Digit1', 
        modifiers: { ctrl: true, shift: true } 
      });
      
      expect(result?.modifiers).toMatchObject({
        ctrl: true,
        shift: true,
        alt: false,
        meta: false
      });
    });
  });

  describe('all return mode', () => {
    it('should return MatchList with single match', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit1'] });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ return: 'all' })({ 
        code: 'Digit1', 
        modifiers: {} 
      });
      
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result?.length).toBe(1);
      expect(result?.[0].codeStr).toBe('Digit1');
    });

    it('should return undefined when no matches', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit1'] });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ return: 'all' })({ 
        code: 'Digit2', 
        modifiers: {} 
      });
      
      expect(result).toBeUndefined();
    });

    it('should return all matching keys from a group', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit1', 'Digit3', 'Digit5'],
        pressedThisTick: ['Digit1', 'Digit3', 'Digit5']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ type: 'some', return: 'all' })({
        code: ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5'],
        modifiers: {}
      });
      
      expect(result).toBeDefined();
      expect(result?.length).toBe(3);
      expect(result?.map(m => m.codeStr)).toEqual(['Digit1', 'Digit3', 'Digit5']);
      expect(result?.map(m => m.code)).toEqual([1, 3, 5]);
    });

    it('should return all matching keys for type: "every"', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit2', 'Digit4'],
        pressedThisTick: ['Digit2', 'Digit4']
      });
      const matchKeybind = createMatchKeybind(state);

      const result = matchKeybind({ type: 'every', return: 'all' })({
        code: ['Digit1', 'Digit2', 'Digit3', 'Digit4'],
        modifiers: {}
      });

      expect(result).toBeDefined();
      expect(result?.map(m => m.codeStr)).toEqual(['Digit2', 'Digit4']);
    });

    it('should guarantee first element when MatchList is defined', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit7'] });
      const matchKeybind = createMatchKeybind(state);
      
      const result = matchKeybind({ return: 'all' })({ 
        code: 'Digit7', 
        modifiers: {} 
      });
      
      // Type system guarantees result[0] exists when result !== undefined
      if (result) {
        expect(result[0]).toBeDefined();
        expect(result[0].code).toBe(7);
      }
    });
  });

  describe('state modes', () => {
    it('should match "pressed" state only on press edge', () => {
      const state = createMockInputState({ 
        pressedThisTick: ['Digit1'],
        keysDown: ['Digit1', 'Digit2']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const pressedD1 = matchKeybind({ state: 'pressed' })({ code: 'Digit1', modifiers: {} });
      const pressedD2 = matchKeybind({ state: 'pressed' })({ code: 'Digit2', modifiers: {} });
      
      expect(pressedD1).toBe(true);
      expect(pressedD2).toBe(false); // held but not newly pressed
    });

    it('should match "down" state for held keys', () => {
      const state = createMockInputState({ 
        keysDown: ['Digit1', 'Digit2']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const downD1 = matchKeybind({ state: 'down' })({ code: 'Digit1', modifiers: {} });
      const downD2 = matchKeybind({ state: 'down' })({ code: 'Digit2', modifiers: {} });
      const downD3 = matchKeybind({ state: 'down' })({ code: 'Digit3', modifiers: {} });
      
      expect(downD1).toBe(true);
      expect(downD2).toBe(true);
      expect(downD3).toBe(false);
    });

    it('should match "released" state only on release edge', () => {
      const state = createMockInputState({ 
        releasedThisTick: ['Digit1']
      });
      const matchKeybind = createMatchKeybind(state);
      
      const released = matchKeybind({ state: 'released' })({ code: 'Digit1', modifiers: {} });
      
      expect(released).toBe(true);
    });
  });

  describe('type safety', () => {
    it('should preserve type safety for return modes', () => {
      const state = createMockInputState({ pressedThisTick: ['Digit1'] });
      const matchKeybind = createMatchKeybind(state);
      
      // Boolean mode (default)
      const boolResult: boolean = matchKeybind({ code: 'Digit1', modifiers: {} });
      expect(typeof boolResult).toBe('boolean');
      
      // First mode
      const firstResult: Match | undefined = matchKeybind({ return: 'first' })({ 
        code: 'Digit1', 
        modifiers: {} 
      });
      expect(firstResult === undefined || typeof firstResult === 'object').toBe(true);
      
      // All mode
      const allResult = matchKeybind({ return: 'all' })({ 
        code: 'Digit1', 
        modifiers: {} 
      });
      expect(allResult === undefined || Array.isArray(allResult)).toBe(true);
    });
  });
});
