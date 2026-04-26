import { beforeEach, describe, expect, it } from 'vitest';

import { cleanupOldEvents, getMonthEvents, resetEventTracker, trackEvent } from '../EventTracker';

describe('EventTracker day-based month grouping', () => {
  beforeEach(() => {
    resetEventTracker();
  });

  it('archives events into day-based months instead of 24-tick hourly months', () => {
    trackEvent('economic_event', 0, { label: 'month-1' });
    trackEvent('economic_event', 30, { label: 'month-2' });

    expect(getMonthEvents(1, 1)).toHaveLength(1);
    expect(getMonthEvents(1, 1)[0].data.label).toBe('month-1');
    expect(getMonthEvents(1, 2)).toHaveLength(1);
    expect(getMonthEvents(1, 2)[0].data.label).toBe('month-2');
  });

  it('cleans up history older than twelve day-based months', () => {
    trackEvent('economic_event', 0, { label: 'expired' });
    trackEvent('economic_event', 390, { label: 'current' });

    cleanupOldEvents(390);

    expect(getMonthEvents(1, 1)).toHaveLength(0);
    expect(getMonthEvents(2, 2)).toHaveLength(1);
    expect(getMonthEvents(2, 2)[0].data.label).toBe('current');
  });
});
