import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type ProcessLike = {
  on(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
  off(event: 'unhandledRejection', listener: (reason: unknown) => void): void;
};

class MockAudio {
  static reset(): void {
    MockAudio.instances = [];
  }

  static instances: MockAudio[] = [];

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
    MockAudio.instances.push(this);
  }

  load(): void {
    queueMicrotask(() => {
      this.onerror?.({ type: 'error', target: this } as unknown as Event);
    });
  }

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  addEventListener(): void {}

  removeEventListener(): void {}
}

const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

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
  };
}

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function getProcess(): ProcessLike {
  return (globalThis as typeof globalThis & { process: ProcessLike }).process;
}

describe('SoundManager', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    MockAudio.reset();
    consoleWarnSpy.mockClear();

    vi.stubGlobal('Audio', MockAudio);
    vi.stubGlobal('document', createDocumentStub());
    vi.stubGlobal('localStorage', createLocalStorageStub());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('does not leak unhandled rejections when a sound fails to load during play', async () => {
    const process = getProcess();
    const unhandledRejections: unknown[] = [];
    const onUnhandledRejection = (reason: unknown) => {
      unhandledRejections.push(reason);
    };

    process.on('unhandledRejection', onUnhandledRejection);

    try {
      const { soundManager } = await import('../SoundManager');

      soundManager.markUserInteracted();
      soundManager.play('click');
      await flushAsyncWork();

      expect(unhandledRejections).toHaveLength(0);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[SoundManager] 音效加载失败: click'),
        expect.anything()
      );
    } finally {
      process.off('unhandledRejection', onUnhandledRejection);
    }
  });
});
