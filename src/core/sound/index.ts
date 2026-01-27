/**
 * 音效系统模块导出
 */

export { soundManager, type PlayOptions } from './SoundManager';
export type { SoundId, SoundSettings, SoundCategory } from './SoundConfig';
export {
  SOUND_DEFINITIONS,
  DEFAULT_SOUND_SETTINGS,
  SOUND_SETTINGS_KEY,
  getPreloadSoundIds,
  getSoundsByCategory,
  getSoundDefinition,
} from './SoundConfig';