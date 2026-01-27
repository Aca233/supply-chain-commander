/**
 * 音效系统配置
 * 定义所有音效资源的CDN URLs和配置
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
  volume: number;  // 0-1，相对音量
  preload: boolean; // 是否预加载
}

// 使用免费的在线音效资源
// 注意：这些是公开可用的免费音效
const SOUND_BASE_URL = 'https://assets.mixkit.co/active_storage/sfx';

/**
 * 音效资源配置
 * 使用 Mixkit 的免费音效库
 */
export const SOUND_DEFINITIONS: Record<SoundId, SoundDefinition> = {
  // ============ UI音效 ============
  click: {
    id: 'click',
    url: `${SOUND_BASE_URL}/2568/2568-preview.mp3`, // Modern click
    category: 'ui',
    volume: 0.5,
    preload: true,
  },
  hover: {
    id: 'hover',
    url: `${SOUND_BASE_URL}/2572/2572-preview.mp3`, // Soft hover
    category: 'ui',
    volume: 0.3,
    preload: true,
  },
  toggle: {
    id: 'toggle',
    url: `${SOUND_BASE_URL}/2205/2205-preview.mp3`, // Switch toggle
    category: 'ui',
    volume: 0.4,
    preload: true,
  },
  tab: {
    id: 'tab',
    url: `${SOUND_BASE_URL}/2571/2571-preview.mp3`, // Tab switch
    category: 'ui',
    volume: 0.4,
    preload: true,
  },
  modal_open: {
    id: 'modal_open',
    url: `${SOUND_BASE_URL}/2569/2569-preview.mp3`, // Popup open
    category: 'ui',
    volume: 0.4,
    preload: false,
  },
  modal_close: {
    id: 'modal_close',
    url: `${SOUND_BASE_URL}/2570/2570-preview.mp3`, // Popup close
    category: 'ui',
    volume: 0.4,
    preload: false,
  },

  // ============ 交易音效 ============
  trade_success: {
    id: 'trade_success',
    url: `${SOUND_BASE_URL}/2019/2019-preview.mp3`, // Success chime
    category: 'trade',
    volume: 0.6,
    preload: true,
  },
  trade_fail: {
    id: 'trade_fail',
    url: `${SOUND_BASE_URL}/2955/2955-preview.mp3`, // Error sound
    category: 'trade',
    volume: 0.5,
    preload: true,
  },
  order_place: {
    id: 'order_place',
    url: `${SOUND_BASE_URL}/2018/2018-preview.mp3`, // Confirmation
    category: 'trade',
    volume: 0.5,
    preload: true,
  },
  order_cancel: {
    id: 'order_cancel',
    url: `${SOUND_BASE_URL}/2017/2017-preview.mp3`, // Cancel
    category: 'trade',
    volume: 0.4,
    preload: false,
  },
  coin: {
    id: 'coin',
    url: `${SOUND_BASE_URL}/888/888-preview.mp3`, // Coin collect
    category: 'trade',
    volume: 0.5,
    preload: true,
  },

  // ============ 建筑音效 ============
  build_complete: {
    id: 'build_complete',
    url: `${SOUND_BASE_URL}/2001/2001-preview.mp3`, // Build complete
    category: 'building',
    volume: 0.6,
    preload: false,
  },
  upgrade: {
    id: 'upgrade',
    url: `${SOUND_BASE_URL}/1435/1435-preview.mp3`, // Level up
    category: 'building',
    volume: 0.6,
    preload: false,
  },
  production: {
    id: 'production',
    url: `${SOUND_BASE_URL}/2002/2002-preview.mp3`, // Production tick
    category: 'building',
    volume: 0.3,
    preload: false,
  },

  // ============ 通知音效 ============
  notify_success: {
    id: 'notify_success',
    url: `${SOUND_BASE_URL}/2000/2000-preview.mp3`, // Success notification
    category: 'notification',
    volume: 0.5,
    preload: true,
  },
  notify_warning: {
    id: 'notify_warning',
    url: `${SOUND_BASE_URL}/2003/2003-preview.mp3`, // Warning alert
    category: 'notification',
    volume: 0.5,
    preload: true,
  },
  notify_error: {
    id: 'notify_error',
    url: `${SOUND_BASE_URL}/2004/2004-preview.mp3`, // Error alert
    category: 'notification',
    volume: 0.5,
    preload: true,
  },
  notify_info: {
    id: 'notify_info',
    url: `${SOUND_BASE_URL}/2005/2005-preview.mp3`, // Info notification
    category: 'notification',
    volume: 0.4,
    preload: true,
  },
};

// 获取需要预加载的音效ID列表
export function getPreloadSoundIds(): SoundId[] {
  return Object.values(SOUND_DEFINITIONS)
    .filter(def => def.preload)
    .map(def => def.id);
}

// 按分类获取音效
export function getSoundsByCategory(category: SoundCategory): SoundDefinition[] {
  return Object.values(SOUND_DEFINITIONS).filter(def => def.category === category);
}

// 获取音效配置
export function getSoundDefinition(id: SoundId): SoundDefinition | undefined {
  return SOUND_DEFINITIONS[id];
}

// 音效设置
export interface SoundSettings {
  enabled: boolean;
  masterVolume: number;   // 0-1
  sfxVolume: number;      // 0-1
  uiVolume: number;       // 0-1 (UI音效音量)
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