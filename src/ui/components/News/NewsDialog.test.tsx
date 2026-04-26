import { describe, expect, it, vi } from 'vitest';

vi.mock('@/stores/gameStore', () => ({
  useGameStore: () => ({
    markCurrentNewsRead: () => undefined,
  }),
}));

import { getNewsDialogAutoCloseDelay } from './NewsDialog';

describe('getNewsDialogAutoCloseDelay', () => {
  it('uses a 5 second delay for auto-opened reports', () => {
    expect(getNewsDialogAutoCloseDelay('auto-generated')).toBe(5000);
  });

  it('does not auto-close manually opened reports', () => {
    expect(getNewsDialogAutoCloseDelay('manual')).toBeNull();
  });
});
