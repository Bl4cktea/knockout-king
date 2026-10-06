import type { Action } from './sim/state';

/**
 * Tracks which physical inputs (keys, touch buttons) are currently down and which action each
 * one holds. "Held" is derived from what is physically down, so a held block can never get stuck
 * or be cancelled by an unrelated state change (starting a bout, pausing, losing focus).
 */
export class HoldTracker {
  private down = new Map<string, Action>();

  press(source: string, action: Action): void {
    this.down.set(source, action);
  }

  release(source: string): void {
    this.down.delete(source);
  }

  clear(): void {
    this.down.clear();
  }

  isHeld(action: Action): boolean {
    for (const a of this.down.values()) if (a === action) return true;
    return false;
  }
}
