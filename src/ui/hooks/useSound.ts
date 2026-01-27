/**
 * 音效 React Hook
 * 提供便捷的音效播放接口
 */

import { useCallback, useEffect, useState } from 'react';
import { soundManager, SoundId, SoundSettings, PlayOptions } from '@/core/sound';

/**
 * 音效 Hook 返回值
 */
interface UseSoundReturn {
  // 通用播放
  play: (soundId: SoundId, options?: PlayOptions) => void;
  stop: (soundId?: SoundId) => void;
  
  // UI 音效
  playClick: () => void;
  playHover: () => void;
  playToggle: () => void;
  playTab: () => void;
  playModalOpen: () => void;
  playModalClose: () => void;
  
  // 交易音效
  playTradeSuccess: () => void;
  playTradeFail: () => void;
  playOrderPlace: () => void;
  playOrderCancel: () => void;
  playCoin: () => void;
  
  // 建筑音效
  playBuildComplete: () => void;
  playUpgrade: () => void;
  playProduction: () => void;
  
  // 通知音效
  playNotifySuccess: () => void;
  playNotifyWarning: () => void;
  playNotifyError: () => void;
  playNotifyInfo: () => void;
  
  // 设置
  settings: SoundSettings;
  setEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
  setSFXVolume: (volume: number) => void;
  setUIVolume: (volume: number) => void;
}

/**
 * 音效 Hook
 * 提供对音效系统的 React 接口
 */
export function useSound(): UseSoundReturn {
  const [settings, setSettings] = useState<SoundSettings>(() => 
    soundManager.getSettings()
  );
  
  // 监听设置变化
  useEffect(() => {
    // 初始化时同步设置
    setSettings(soundManager.getSettings());
  }, []);
  
  // 通用播放
  const play = useCallback((soundId: SoundId, options?: PlayOptions) => {
    soundManager.play(soundId, options);
  }, []);
  
  const stop = useCallback((soundId?: SoundId) => {
    if (soundId) {
      soundManager.stop(soundId);
    } else {
      soundManager.stopAll();
    }
  }, []);
  
  // UI 音效
  const playClick = useCallback(() => soundManager.playClick(), []);
  const playHover = useCallback(() => soundManager.playHover(), []);
  const playToggle = useCallback(() => soundManager.playToggle(), []);
  const playTab = useCallback(() => soundManager.playTab(), []);
  const playModalOpen = useCallback(() => soundManager.playModalOpen(), []);
  const playModalClose = useCallback(() => soundManager.playModalClose(), []);
  
  // 交易音效
  const playTradeSuccess = useCallback(() => soundManager.playTradeSuccess(), []);
  const playTradeFail = useCallback(() => soundManager.playTradeFail(), []);
  const playOrderPlace = useCallback(() => soundManager.playOrderPlace(), []);
  const playOrderCancel = useCallback(() => soundManager.playOrderCancel(), []);
  const playCoin = useCallback(() => soundManager.playCoin(), []);
  
  // 建筑音效
  const playBuildComplete = useCallback(() => soundManager.playBuildComplete(), []);
  const playUpgrade = useCallback(() => soundManager.playUpgrade(), []);
  const playProduction = useCallback(() => soundManager.playProduction(), []);
  
  // 通知音效
  const playNotifySuccess = useCallback(() => soundManager.playNotifySuccess(), []);
  const playNotifyWarning = useCallback(() => soundManager.playNotifyWarning(), []);
  const playNotifyError = useCallback(() => soundManager.playNotifyError(), []);
  const playNotifyInfo = useCallback(() => soundManager.playNotifyInfo(), []);
  
  // 设置方法
  const setEnabled = useCallback((enabled: boolean) => {
    soundManager.setEnabled(enabled);
    setSettings(prev => ({ ...prev, enabled }));
  }, []);
  
  const setMasterVolume = useCallback((volume: number) => {
    soundManager.setMasterVolume(volume);
    setSettings(prev => ({ ...prev, masterVolume: volume }));
  }, []);
  
  const setSFXVolume = useCallback((volume: number) => {
    soundManager.setSFXVolume(volume);
    setSettings(prev => ({ ...prev, sfxVolume: volume }));
  }, []);
  
  const setUIVolume = useCallback((volume: number) => {
    soundManager.setUIVolume(volume);
    setSettings(prev => ({ ...prev, uiVolume: volume }));
  }, []);
  
  return {
    play,
    stop,
    playClick,
    playHover,
    playToggle,
    playTab,
    playModalOpen,
    playModalClose,
    playTradeSuccess,
    playTradeFail,
    playOrderPlace,
    playOrderCancel,
    playCoin,
    playBuildComplete,
    playUpgrade,
    playProduction,
    playNotifySuccess,
    playNotifyWarning,
    playNotifyError,
    playNotifyInfo,
    settings,
    setEnabled,
    setMasterVolume,
    setSFXVolume,
    setUIVolume,
  };
}

/**
 * 简化版音效 Hook
 * 只提供最常用的播放方法，无需设置管理
 */
export function useSoundEffects() {
  return {
    playClick: useCallback(() => soundManager.playClick(), []),
    playHover: useCallback(() => soundManager.playHover(), []),
    playSuccess: useCallback(() => soundManager.playNotifySuccess(), []),
    playError: useCallback(() => soundManager.playNotifyError(), []),
    playWarning: useCallback(() => soundManager.playNotifyWarning(), []),
    playInfo: useCallback(() => soundManager.playNotifyInfo(), []),
    playTrade: useCallback((success: boolean) => {
      if (success) {
        soundManager.playTradeSuccess();
      } else {
        soundManager.playTradeFail();
      }
    }, []),
    playBuild: useCallback(() => soundManager.playBuildComplete(), []),
  };
}

export default useSound;