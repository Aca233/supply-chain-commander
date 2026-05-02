import { describe, expect, it } from 'vitest';

import {
  ConstructionManager,
  ConstructionStatus,
  DEFAULT_CONSTRUCTION_CONFIG,
  createConstructionQueueSystem,
} from '../ConstructionManager';

describe('ConstructionManager regressions', () => {
  it('preserves fractional speed boosts in progressTicks', () => {
    const manager = new ConstructionManager({
      ...DEFAULT_CONSTRUCTION_CONFIG,
      simultaneousBuilds: 1,
    });
    const queue = createConstructionQueueSystem(4);

    queue.activeCount = 1;
    queue.taskIds[0] = 1;
    queue.companyIds[0] = 1;
    queue.statuses[0] = ConstructionStatus.BUILDING;
    queue.requiredTicks[0] = 10;
    queue.progressTicks[0] = 0;
    queue.speedBoosts[0] = 1.5;

    manager.processTick(queue);

    expect(queue.progressTicks[0]).toBeCloseTo(1.5, 6);
  });
});
