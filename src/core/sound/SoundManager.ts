/**
 * 音效管理器
 * 核心音效播放和管理系统
 */

import {
  SoundId,
  SoundSettings,
  SoundCategory,
  SOUND_DEFINITIONS,
  DEFAULT_SOUND_SETTINGS,
  SOUND_SETTINGS_KEY,
  getPreloadSoundIds,
  getSoundDefinition,
} from './SoundConfig';

// 音频实例池
interface AudioPoolItem {
  audio: HTMLAudioElement;
  inUse: boolean;
  lastUsed: number;
}

// 播放选项
export interface PlayOptions {
  volume?: number;      // 覆盖默认音量 (0-1)
  loop?: boolean;       // 是否循环
  onEnd?: () => void;   // 播放结束回调
}

/**
 * 音效管理器类
 * 使用单例模式
 */
class SoundManagerClass {
  private static instance: SoundManagerClass | null = null;
  
  // 音频对象池
  private audioPool: Map<SoundId, AudioPoolItem[]> = new Map();
  
  // 设置
  private settings: SoundSettings = DEFAULT_SOUND_SETTINGS;
  
  // 已加载的音效
  private loadedSounds: Set<SoundId> = new Set();
  
  // 加载中的音效
  private loadingPromises: Map<SoundId, Promise<void>> = new Map();
  
  // 是否已初始化
  private initialized = false;
  
  // 用户是否已交互（浏览器自动播放策略）
  private userInteracted = false;
  
  // 池配置
  private readonly POOL_SIZE = 3;  // 每种音效的池大小
  private readonly REUSE_DELAY = 50; // 复用延迟(ms)
  
  private constructor() {
    this.loadSettings();
    this.setupUserInteractionListener();
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): SoundManagerClass {
    if (!SoundManagerClass.instance) {
      SoundManagerClass.instance = new SoundManagerClass();
    }
    return SoundManagerClass.instance;
  }
  
  /**
   * 初始化音效系统
   * 预加载常用音效
   */
  async init(): Promise<void> {
    if (this.initialized) return;
    
    console.log('[SoundManager] 初始化音效系统...');
    
    // 预加载标记为preload的音效
    const preloadIds = getPreloadSoundIds();
    await this.preload(preloadIds);
    
    this.initialized = true;
    console.log('[SoundManager] 音效系统初始化完成');
  }
  
  /**
   * 预加载指定音效
   */
  async preload(soundIds: SoundId[]): Promise<void> {
    const promises = soundIds.map(id => this.loadSound(id));
    await Promise.allSettled(promises);
  }
  
  /**
   * 加载单个音效
   */
  private async loadSound(soundId: SoundId): Promise<void> {
    // 已加载则跳过
    if (this.loadedSounds.has(soundId)) return;
    
    // 正在加载中则返回现有Promise
    const existingPromise = this.loadingPromises.get(soundId);
    if (existingPromise) return existingPromise;
    
    const definition = getSoundDefinition(soundId);
    if (!definition) {
      console.warn(`[SoundManager] 未找到音效定义: ${soundId}`);
      return;
    }
    
    const loadPromise = new Promise<void>((resolve, reject) => {
      const audio = new Audio();
      audio.preload = 'auto';
      
      audio.oncanplaythrough = () => {
        // 初始化音频池
        this.initPool(soundId, definition.url);
        this.loadedSounds.add(soundId);
        this.loadingPromises.delete(soundId);
        resolve();
      };
      
      audio.onerror = (e) => {
        console.warn(`[SoundManager] 音效加载失败: ${soundId}`, e);
        this.loadingPromises.delete(soundId);
        reject(e);
      };
      
      audio.src = definition.url;
      audio.load();
    });
    
    this.loadingPromises.set(soundId, loadPromise);
    return loadPromise;
  }
  
  /**
   * 初始化音频池
   */
  private initPool(soundId: SoundId, url: string): void {
    if (this.audioPool.has(soundId)) return;
    
    const pool: AudioPoolItem[] = [];
    for (let i = 0; i < this.POOL_SIZE; i++) {
      const audio = new Audio(url);
      audio.preload = 'auto';
      pool.push({
        audio,
        inUse: false,
        lastUsed: 0,
      });
    }
    
    this.audioPool.set(soundId, pool);
  }
  
  /**
   * 从池中获取可用的Audio实例
   */
  private getPooledAudio(soundId: SoundId): HTMLAudioElement | null {
    const pool = this.audioPool.get(soundId);
    if (!pool) return null;
    
    const now = Date.now();
    
    // 找一个不在使用中的
    for (const item of pool) {
      if (!item.inUse && now - item.lastUsed > this.REUSE_DELAY) {
        item.inUse = true;
        item.lastUsed = now;
        return item.audio;
      }
    }
    
    // 如果都在使用，找最早使用的
    let oldest = pool[0];
    for (const item of pool) {
      if (item.lastUsed < oldest.lastUsed) {
        oldest = item;
      }
    }
    
    // 停止并重用
    oldest.audio.pause();
    oldest.audio.currentTime = 0;
    oldest.inUse = true;
    oldest.lastUsed = now;
    return oldest.audio;
  }
  
  /**
   * 释放Audio实例回池
   */
  private releasePooledAudio(soundId: SoundId, audio: HTMLAudioElement): void {
    const pool = this.audioPool.get(soundId);
    if (!pool) return;
    
    for (const item of pool) {
      if (item.audio === audio) {
        item.inUse = false;
        break;
      }
    }
  }
  
  /**
   * 播放音效
   */
  play(soundId: SoundId, options?: PlayOptions): void {
    // 检查是否启用
    if (!this.settings.enabled) return;
    
    // 检查用户交互（浏览器自动播放策略）
    if (!this.userInteracted) {
      // 静默失败，等待用户首次交互
      return;
    }
    
    const definition = getSoundDefinition(soundId);
    if (!definition) {
      console.warn(`[SoundManager] 未找到音效: ${soundId}`);
      return;
    }
    
    // 如果音效未加载，尝试加载
    if (!this.loadedSounds.has(soundId)) {
      this.loadSound(soundId).then(() => {
        this.playInternal(soundId, definition, options);
      }).catch(() => {
        // loadSound 已记录失败详情，这里只避免未处理的 Promise rejection 泄漏到全局。
      });
      return;
    }
    
    this.playInternal(soundId, definition, options);
  }
  
  /**
   * 内部播放方法
   */
  private playInternal(
    soundId: SoundId,
    definition: { volume: number; category: SoundCategory; url: string },
    options?: PlayOptions
  ): void {
    let audio = this.getPooledAudio(soundId);
    
    // 如果没有池化的实例，创建新的
    if (!audio) {
      audio = new Audio(definition.url);
    }
    
    // 计算最终音量
    const baseVolume = options?.volume ?? definition.volume;
    const categoryVolume = definition.category === 'ui' 
      ? this.settings.uiVolume 
      : this.settings.sfxVolume;
    const finalVolume = baseVolume * categoryVolume * this.settings.masterVolume;
    
    audio.volume = Math.max(0, Math.min(1, finalVolume));
    audio.loop = options?.loop ?? false;
    audio.currentTime = 0;
    
    // 播放结束处理
    const handleEnded = () => {
      this.releasePooledAudio(soundId, audio!);
      audio!.removeEventListener('ended', handleEnded);
      options?.onEnd?.();
    };
    
    audio.addEventListener('ended', handleEnded);
    
    // 播放
    audio.play().catch((e) => {
      // 自动播放被阻止时静默处理
      if (e.name !== 'NotAllowedError') {
        console.warn(`[SoundManager] 播放失败: ${soundId}`, e);
      }
      this.releasePooledAudio(soundId, audio!);
    });
  }
  
  /**
   * 停止所有音效
   */
  stopAll(): void {
    this.audioPool.forEach((pool) => {
      pool.forEach((item) => {
        item.audio.pause();
        item.audio.currentTime = 0;
        item.inUse = false;
      });
    });
  }
  
  /**
   * 停止指定音效
   */
  stop(soundId: SoundId): void {
    const pool = this.audioPool.get(soundId);
    if (!pool) return;
    
    pool.forEach((item) => {
      item.audio.pause();
      item.audio.currentTime = 0;
      item.inUse = false;
    });
  }
  
  // ============ 设置相关 ============
  
  /**
   * 获取当前设置
   */
  getSettings(): SoundSettings {
    return { ...this.settings };
  }
  
  /**
   * 更新设置
   */
  updateSettings(partial: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
  }
  
  /**
   * 设置是否启用音效
   */
  setEnabled(enabled: boolean): void {
    this.settings.enabled = enabled;
    if (!enabled) {
      this.stopAll();
    }
    this.saveSettings();
  }
  
  /**
   * 设置主音量
   */
  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }
  
  /**
   * 设置音效音量
   */
  setSFXVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }
  
  /**
   * 设置UI音效音量
   */
  setUIVolume(volume: number): void {
    this.settings.uiVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }
  
  /**
   * 保存设置到 localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(SOUND_SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (e) {
      console.warn('[SoundManager] 保存设置失败', e);
    }
  }
  
  /**
   * 从 localStorage 加载设置
   */
  private loadSettings(): void {
    try {
      const saved = localStorage.getItem(SOUND_SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = { ...DEFAULT_SOUND_SETTINGS, ...parsed };
      }
    } catch (e) {
      console.warn('[SoundManager] 加载设置失败', e);
      this.settings = { ...DEFAULT_SOUND_SETTINGS };
    }
  }
  
  // ============ 浏览器自动播放策略处理 ============
  
  /**
   * 设置用户交互监听器
   * 浏览器需要用户交互后才能播放音频
   */
  private setupUserInteractionListener(): void {
    const handleInteraction = () => {
      this.userInteracted = true;
      
      // 移除监听器
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      
      // 初始化音效系统
      if (!this.initialized) {
        this.init();
      }
    };
    
    document.addEventListener('click', handleInteraction, { once: false });
    document.addEventListener('keydown', handleInteraction, { once: false });
    document.addEventListener('touchstart', handleInteraction, { once: false });
  }
  
  /**
   * 手动标记用户已交互
   */
  markUserInteracted(): void {
    this.userInteracted = true;
  }
  
  /**
   * 检查用户是否已交互
   */
  hasUserInteracted(): boolean {
    return this.userInteracted;
  }
  
  // ============ 便捷播放方法 ============
  
  /** 播放点击音效 */
  playClick(): void {
    this.play('click');
  }
  
  /** 播放悬停音效 */
  playHover(): void {
    this.play('hover');
  }
  
  /** 播放切换音效 */
  playToggle(): void {
    this.play('toggle');
  }
  
  /** 播放标签切换音效 */
  playTab(): void {
    this.play('tab');
  }
  
  /** 播放弹窗打开音效 */
  playModalOpen(): void {
    this.play('modal_open');
  }
  
  /** 播放弹窗关闭音效 */
  playModalClose(): void {
    this.play('modal_close');
  }
  
  /** 播放交易成功音效 */
  playTradeSuccess(): void {
    this.play('trade_success');
  }
  
  /** 播放交易失败音效 */
  playTradeFail(): void {
    this.play('trade_fail');
  }
  
  /** 播放下单音效 */
  playOrderPlace(): void {
    this.play('order_place');
  }
  
  /** 播放取消订单音效 */
  playOrderCancel(): void {
    this.play('order_cancel');
  }
  
  /** 播放金币音效 */
  playCoin(): void {
    this.play('coin');
  }
  
  /** 播放建造完成音效 */
  playBuildComplete(): void {
    this.play('build_complete');
  }
  
  /** 播放升级音效 */
  playUpgrade(): void {
    this.play('upgrade');
  }
  
  /** 播放生产完成音效 */
  playProduction(): void {
    this.play('production');
  }
  
  /** 播放成功通知音效 */
  playNotifySuccess(): void {
    this.play('notify_success');
  }
  
  /** 播放警告通知音效 */
  playNotifyWarning(): void {
    this.play('notify_warning');
  }
  
  /** 播放错误通知音效 */
  playNotifyError(): void {
    this.play('notify_error');
  }
  
  /** 播放信息通知音效 */
  playNotifyInfo(): void {
    this.play('notify_info');
  }
}

// 导出单例
export const soundManager = SoundManagerClass.getInstance();

// 也导出类型，方便类型检查
export type { SoundId, SoundSettings, SoundCategory };
