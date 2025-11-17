import { Injectable, Logger } from '@nestjs/common';

import type { ComputerAction } from '../../models/contracts';

export type ComputerToolInput = Record<string, unknown>;

@Injectable()
export class AnthropicActionMapper {
  private readonly logger = new Logger(AnthropicActionMapper.name);

  toComputerAction(input: ComputerToolInput): ComputerAction | null {
    const actionType = String(input.action ?? '').toLowerCase();
    const coordinate = this.extractCoordinate(input.coordinate);

    switch (actionType) {
      case 'screenshot':
        return { action: 'screenshot' };
      case 'left_click':
      case 'click':
        return coordinate ? { action: 'click', coords: coordinate } : null;
      case 'double_click':
        return coordinate ? { action: 'double_click', coords: coordinate } : null;
      case 'right_click':
        return coordinate ? { action: 'right_click', coords: coordinate } : null;
      case 'mouse_move':
        return coordinate ? { action: 'move', coords: coordinate } : null;
      case 'type':
        if (typeof input.text !== 'string') return null;
        return { action: 'type', text: input.text };
      case 'key':
        return this.mapKeyAction(input);
      case 'triple_click':
        if (!coordinate) return null;
        this.logger.debug('Downgrading triple_click to double_click action.');
        return { action: 'double_click', coords: coordinate };
      case 'middle_click':
        if (!coordinate) return null;
        this.logger.debug('Downgrading middle_click to single click action.');
        return { action: 'click', coords: coordinate };
      case 'scroll': {
        const amount = Number(input.amount ?? 500);
        const direction = String(input.direction ?? 'down');
        const deltaMap: Record<string, { deltaX: number; deltaY: number }> = {
          up: { deltaX: 0, deltaY: -amount },
          down: { deltaX: 0, deltaY: amount },
          left: { deltaX: -amount, deltaY: 0 },
          right: { deltaX: amount, deltaY: 0 },
        };
        const deltas = deltaMap[direction] ?? deltaMap.down;
        return {
          action: 'scroll',
          coords: coordinate ?? { x: 0, y: 0 },
          scroll: { deltaX: deltas.deltaX, deltaY: deltas.deltaY },
        };
      }
      case 'left_click_drag': {
        const from = this.extractCoordinate((input as { from?: unknown }).from);
        const to = this.extractCoordinate((input as { to?: unknown }).to);
        if (!from || !to) return null;
        return { action: 'drag', path: [from, to] };
      }
      case 'wait':
        return {
          action: 'wait',
          wait: {
            type: 'ms',
            value: Number((input as { ms?: unknown }).ms ?? 1000),
          },
        };
      default:
        return null;
    }
  }

  private mapKeyAction(input: ComputerToolInput): ComputerAction | null {
    if (Array.isArray((input as { keys?: unknown }).keys)) {
      const normalizedKeys = ((input as { keys?: unknown }).keys as unknown[])
        .map((key) => this.normalizeKeyToken(String(key ?? '')))
        .filter((key): key is string => Boolean(key));
      if (normalizedKeys.length) {
        return { action: 'keypress', keys: normalizedKeys };
      }
    }

    const rawCombo =
      typeof (input as { combo?: unknown }).combo === 'string'
        ? (input as { combo?: string }).combo
        : typeof (input as { key?: unknown }).key === 'string'
          ? String((input as { key?: unknown }).key)
          : typeof input.text === 'string'
            ? input.text
            : null;

    if (!rawCombo) {
      return null;
    }

    const normalized = this.normalizeHotkey(rawCombo);
    if (!normalized) {
      return null;
    }

    return { action: 'hotkey', hotkey: normalized };
  }

  private extractCoordinate(value: unknown): { x: number; y: number } | null {
    if (Array.isArray(value) && value.length >= 2) {
      const [x, y] = value;
      if (typeof x === 'number' && typeof y === 'number') {
        return { x: Math.round(x), y: Math.round(y) };
      }
    }
    if (typeof value === 'object' && value !== null) {
      const maybeX = (value as Record<string, unknown>).x;
      const maybeY = (value as Record<string, unknown>).y;
      if (typeof maybeX === 'number' && typeof maybeY === 'number') {
        return { x: Math.round(maybeX), y: Math.round(maybeY) };
      }
    }
    return null;
  }

  private normalizeHotkey(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const tokens = trimmed.split(/[+\s]+/).filter((token) => token.length > 0);
    if (tokens.length === 0) {
      return null;
    }
    const normalizedTokens = tokens
      .map((token) => this.normalizeKeyToken(token))
      .filter((token): token is string => Boolean(token));
    if (!normalizedTokens.length) {
      return null;
    }
    return normalizedTokens.join('+');
  }

  private normalizeKeyToken(token: string): string | null {
    const value = token.trim();
    if (!value) {
      return null;
    }
    const upper = value.toUpperCase();
    const directMap: Record<string, string> = {
      CTRL: 'Control',
      CONTROL: 'Control',
      CMD: 'Meta',
      COMMAND: 'Meta',
      META: 'Meta',
      WIN: 'Meta',
      WINDOWS: 'Meta',
      OPTION: 'Alt',
      ALT: 'Alt',
      SHIFT: 'Shift',
      SUPER: 'Meta',
      DEL: 'Delete',
      DELETE: 'Delete',
      BACKSPACE: 'Backspace',
      ENTER: 'Enter',
      RETURN: 'Enter',
      SPACE: 'Space',
      SPACEBAR: 'Space',
      TAB: 'Tab',
      ESC: 'Escape',
      ESCAPE: 'Escape',
      UP: 'ArrowUp',
      DOWN: 'ArrowDown',
      LEFT: 'ArrowLeft',
      RIGHT: 'ArrowRight',
      PAGEUP: 'PageUp',
      PAGEDOWN: 'PageDown',
      HOME: 'Home',
      END: 'End',
      CAPSLOCK: 'CapsLock',
    };

    if (directMap[upper]) {
      return directMap[upper];
    }

    if (/^F\d{1,2}$/.test(upper)) {
      return upper;
    }

    if (upper.length === 1 && /[A-Z0-9]/.test(upper)) {
      return upper;
    }

    if (upper === '=' || upper === '-' || upper === '[' || upper === ']' || upper === '\\') {
      return upper;
    }

    return value;
  }
}
