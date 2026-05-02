import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class MockAudio {
  preload = '';
  src = '';
  volume = 1;
  loop = false;
  currentTime = 0;
  oncanplaythrough: (() => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(url?: string) {
    if (url) {
      this.src = url;
    }
  }

  load(): void {
    queueMicrotask(() => {
      this.oncanplaythrough?.();
    });
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  addEventListener(): void {}

  removeEventListener(): void {}
}

function createDocumentStub() {
  return {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
}

function createLocalStorageStub() {
  const store = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => store.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
    }),
    removeItem: vi.fn((key: string) => {
      store.delete(key);
    }),
    clear: vi.fn(() => {
      store.clear();
    }),
    key: vi.fn((index: number) => Array.from(store.keys())[index] ?? null),
    get length() {
      return store.size;
    },
  };
}

describe('gameStore save loading regressions', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('document', createDocumentStub());
    vi.stubGlobal('localStorage', createLocalStorageStub());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hydrates the initial player building count during initGame', async () => {
    const { useGameStore } = await import('../gameStore');

    useGameStore.getState().initGame();

    expect(useGameStore.getState().playerBuildings).toBeGreaterThan(0);
  });

  it('restores persisted world state through loadGame', async () => {
    const { useGameStore } = await import('../gameStore');
    const { saveManager } = await import('@/core/save/SaveManager');

    useGameStore.getState().initGame();

    const world = useGameStore.getState().getWorld();
    expect(world).not.toBeNull();

    world!.companies.cash[0] = 432_100;
    const metadata = saveManager.save(world!, world!.tick, 0, 'load-regression');

    world!.companies.cash[0] = 1;

    expect(useGameStore.getState().loadGame(metadata.id)).toBe(true);
    expect(useGameStore.getState().playerCash).toBe(432_100);
  });
});
