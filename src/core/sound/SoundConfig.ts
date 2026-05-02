/**
 * 音效系统配置
 * 使用内嵌 WAV 数据，避免浏览器对外链音频的 ORB/跨域拦截。
 */

// 音效ID类型
export type SoundId =
  // UI音效
  | 'click'
  | 'hover'
  | 'toggle'
  | 'tab'
  | 'modal_open'
  | 'modal_close'
  // 交易音效
  | 'trade_success'
  | 'trade_fail'
  | 'order_place'
  | 'order_cancel'
  | 'coin'
  // 建筑音效
  | 'build_complete'
  | 'upgrade'
  | 'production'
  // 通知音效
  | 'notify_success'
  | 'notify_warning'
  | 'notify_error'
  | 'notify_info';

// 音效分类
export type SoundCategory = 'ui' | 'trade' | 'building' | 'notification';

// 单个音效配置
export interface SoundDefinition {
  id: SoundId;
  url: string;
  category: SoundCategory;
  volume: number;
  preload: boolean;
}

type ToneWave = 'sine' | 'square' | 'triangle';

interface ToneSpec {
  frequency: number;
  durationMs: number;
  wave?: ToneWave;
  attackMs?: number;
  decayMs?: number;
  gain?: number;
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  if (typeof btoa === 'function') {
    return btoa(binary);
  }

  const BufferCtor = (globalThis as {
    Buffer?: {
      from(input: string, encoding: string): { toString(encoding: string): string };
    };
  }).Buffer;

  if (BufferCtor) {
    return BufferCtor.from(binary, 'binary').toString('base64');
  }

  throw new Error('No base64 encoder available for sound assets');
}

function sampleWave(wave: ToneWave, phase: number): number {
  switch (wave) {
    case 'square':
      return Math.sin(phase) >= 0 ? 1 : -1;
    case 'triangle':
      return 2 * Math.asin(Math.sin(phase)) / Math.PI;
    case 'sine':
    default:
      return Math.sin(phase);
  }
}

function createToneDataUrl({
  frequency,
  durationMs,
  wave = 'sine',
  attackMs = 8,
  decayMs = 40,
  gain = 0.45,
}: ToneSpec): string {
  const sampleRate = 8_000;
  const sampleCount = Math.max(1, Math.round(sampleRate * durationMs / 1_000));
  const bytesPerSample = 2;
  const dataSize = sampleCount * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const attackSamples = Math.max(1, Math.round(sampleRate * attackMs / 1_000));
  const decaySamples = Math.max(1, Math.round(sampleRate * decayMs / 1_000));

  for (let i = 0; i < sampleCount; i++) {
    const phase = 2 * Math.PI * frequency * (i / sampleRate);
    const waveSample = sampleWave(wave, phase);

    let envelope = 1;
    if (i < attackSamples) {
      envelope = i / attackSamples;
    } else if (i > sampleCount - decaySamples) {
      envelope = Math.max(0, (sampleCount - i) / decaySamples);
    }

    const value = Math.max(-1, Math.min(1, waveSample * envelope * gain));
    view.setInt16(44 + i * bytesPerSample, Math.round(value * 0x7fff), true);
  }

  return `data:audio/wav;base64,${encodeBase64(new Uint8Array(buffer))}`;
}

function defineSound(
  id: SoundId,
  category: SoundCategory,
  volume: number,
  preload: boolean,
  spec: ToneSpec,
): SoundDefinition {
  return {
    id,
    category,
    volume,
    preload,
    url: createToneDataUrl(spec),
  };
}

export const SOUND_DEFINITIONS: Record<SoundId, SoundDefinition> = {
  click: defineSound('click', 'ui', 0.5, true, { frequency: 880, durationMs: 55, wave: 'square' }),
  hover: defineSound('hover', 'ui', 0.3, true, { frequency: 660, durationMs: 45, wave: 'sine', gain: 0.3 }),
  toggle: defineSound('toggle', 'ui', 0.4, true, { frequency: 523, durationMs: 70, wave: 'square' }),
  tab: defineSound('tab', 'ui', 0.4, true, { frequency: 740, durationMs: 55, wave: 'triangle' }),
  modal_open: defineSound('modal_open', 'ui', 0.4, false, { frequency: 392, durationMs: 120, wave: 'sine' }),
  modal_close: defineSound('modal_close', 'ui', 0.4, false, { frequency: 330, durationMs: 90, wave: 'sine' }),
  trade_success: defineSound('trade_success', 'trade', 0.6, true, { frequency: 1_046, durationMs: 180, wave: 'triangle' }),
  trade_fail: defineSound('trade_fail', 'trade', 0.5, true, { frequency: 220, durationMs: 160, wave: 'square' }),
  order_place: defineSound('order_place', 'trade', 0.5, true, { frequency: 784, durationMs: 90, wave: 'square' }),
  order_cancel: defineSound('order_cancel', 'trade', 0.4, false, { frequency: 262, durationMs: 90, wave: 'square' }),
  coin: defineSound('coin', 'trade', 0.5, true, { frequency: 1_318, durationMs: 140, wave: 'sine' }),
  build_complete: defineSound('build_complete', 'building', 0.6, false, { frequency: 587, durationMs: 220, wave: 'triangle' }),
  upgrade: defineSound('upgrade', 'building', 0.6, false, { frequency: 988, durationMs: 210, wave: 'triangle' }),
  production: defineSound('production', 'building', 0.3, false, { frequency: 440, durationMs: 110, wave: 'sine', gain: 0.22 }),
  notify_success: defineSound('notify_success', 'notification', 0.5, true, { frequency: 880, durationMs: 180, wave: 'sine' }),
  notify_warning: defineSound('notify_warning', 'notification', 0.5, true, { frequency: 494, durationMs: 180, wave: 'square' }),
  notify_error: defineSound('notify_error', 'notification', 0.5, true, { frequency: 196, durationMs: 220, wave: 'square' }),
  notify_info: defineSound('notify_info', 'notification', 0.4, true, { frequency: 660, durationMs: 160, wave: 'sine' }),
};

// 获取需要预加载的音效ID列表
export function getPreloadSoundIds(): SoundId[] {
  return Object.values(SOUND_DEFINITIONS)
    .filter((def) => def.preload)
    .map((def) => def.id);
}

// 按分类获取音效
export function getSoundsByCategory(category: SoundCategory): SoundDefinition[] {
  return Object.values(SOUND_DEFINITIONS).filter((def) => def.category === category);
}

// 获取音效配置
export function getSoundDefinition(id: SoundId): SoundDefinition | undefined {
  return SOUND_DEFINITIONS[id];
}

// 音效设置
export interface SoundSettings {
  enabled: boolean;
  masterVolume: number;
  sfxVolume: number;
  uiVolume: number;
}

// 默认设置
export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  masterVolume: 0.7,
  sfxVolume: 0.8,
  uiVolume: 0.6,
};

// localStorage 键名
export const SOUND_SETTINGS_KEY = 'supply_chain_sound_settings';
