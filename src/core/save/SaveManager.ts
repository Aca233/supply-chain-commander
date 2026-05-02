/**
 * 游戏存档管理器
 * 处理游戏状态的保存和加载
 *
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, MAX_SLOTS, legacyHourTicksToDayTicks } from '@/core/constants';
import {
  BankruptcyResolutionSnapshot,
  BankruptcyStrategySettings,
  bankruptcyResolution,
} from '@/core/finance/BankruptcyResolution';
import { backfillManualTargetsFromCurrentEfficiency, hydrateProductionControlState } from '@/core/production/ProductionControl';

export interface SaveMetadata {
  id: string;
  name: string;
  timestamp: number;
  playTime: number;
  realTime: number;
  version: string;
  playerCash: number;
  companiesCount: number;
  buildingsCount: number;
}

export interface SerializedWorld {
  timeModel?: 'hour' | 'day';
  goods: {
    count: number;
    prices: number[];
    supplies: number[];
    demands: number[];
    demandPressure?: number[];
  };
  buildings: {
    count: number;
    types: number[];
    owners: number[];
    levels: number[];
    efficiencies: number[];
    productionControlModes?: number[];
    manualEfficiencyTargets?: number[];
    oversupplySuspendedGoods?: number[];
    oversupplySuspendedUntilTick?: number[];
    slotMethods: number[];
    isActive: number[];
  };
  companies: {
    count: number;
    cash: number[];
    isAI: boolean[];
    inventories: number[][];
  };
  bankruptcy?: BankruptcyResolutionSnapshot;
  currentTick: number;
}

export interface GameSettings {
  gameSpeed: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  autoSave: boolean;
  autoSaveInterval: number;  // 自动保存间隔（毫秒）
  maxAutoSaves: number;      // 最大自动存档数量
  language: string;
  newsGenerationEnabled: boolean;
  bankruptcyStrategy?: BankruptcyStrategySettings;
}

export interface SaveData {
  metadata: SaveMetadata;
  world: SerializedWorld;
  settings: GameSettings;
}

const SAVE_PREFIX = 'supply_chain_save_';
const SETTINGS_KEY = 'supply_chain_settings';
const CURRENT_VERSION = '3.0.0';
const SUPPORTED_VERSIONS = new Set<string>([CURRENT_VERSION]);
const STORAGE_QUOTA_BYTES = 5 * 1024 * 1024;

function getStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

export class SaveManager {
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  private normalizeLoadedTick(
    currentTick: number,
    timeModel: 'hour' | 'day' = 'hour',
  ): number {
    return timeModel === 'day'
      ? currentTick
      : legacyHourTicksToDayTicks(currentTick, 'floor');
  }
  
  serializeWorld(world: GameWorld, currentTick: number): SerializedWorld {
    return {
      timeModel: 'day',
      goods: {
        count: world.goods.count,
        prices: Array.from(world.goods.prices),
        supplies: Array.from(world.goods.supplies),
        demands: Array.from(world.goods.demands),
        demandPressure: Array.from(world.goods.demandPressure),
      },
      buildings: {
        count: world.buildings.count,
        types: Array.from(world.buildings.types),
        owners: Array.from(world.buildings.owners),
        levels: Array.from(world.buildings.levels),
        efficiencies: Array.from(world.buildings.efficiencies),
        productionControlModes: Array.from(world.buildings.productionControlModes),
        manualEfficiencyTargets: Array.from(world.buildings.manualEfficiencyTargets),
        oversupplySuspendedGoods: Array.from(world.buildings.oversupplySuspendedGoods),
        oversupplySuspendedUntilTick: Array.from(world.buildings.oversupplySuspendedUntilTick),
        slotMethods: this.serializeSlotMethods(world),
        isActive: Array.from(world.buildings.isActive),
      },
      companies: {
        count: world.companies.count,
        cash: Array.from(world.companies.cash),
        isAI: [...world.companies.isAI],
        inventories: this.serializeInventories(world),
      },
      bankruptcy: bankruptcyResolution.getSnapshot(),
      currentTick,
    };
  }
  
  private serializeSlotMethods(world: GameWorld): number[] {
    const length = world.buildings.count * MAX_SLOTS;
    const arr: number[] = new Array(length);
    for (let i = 0; i < length; i++) {
      arr[i] = world.buildings.slotMethods[i] ?? 0;
    }
    return arr;
  }

  private serializeInventories(world: GameWorld): number[][] {
    const inventories: number[][] = [];
    for (let i = 0; i < world.companies.count; i++) {
      const inv: number[] = [];
      for (let j = 0; j < GOODS_COUNT; j++) {
        inv.push(world.companies.inventories[i * GOODS_COUNT + j] || 0);
      }
      inventories.push(inv);
    }
    return inventories;
  }
  
  deserializeWorld(data: SerializedWorld, world: GameWorld): void {
    // 恢复游戏tick（修复日期重置问题）
    world.tick = this.normalizeLoadedTick(data.currentTick, data.timeModel ?? 'hour');
    
    world.goods.count = data.goods.count;
    world.goods.prices.set(data.goods.prices);
    world.goods.supplies.set(data.goods.supplies);
    world.goods.demands.set(data.goods.demands);
    if (data.goods.demandPressure) {
      world.goods.demandPressure.set(data.goods.demandPressure);
      world.goods.demandPressureTick = world.tick;
    } else {
      world.goods.demandPressure.set(data.goods.demands);
      world.goods.demandPressureTick = world.tick;
    }
    
    world.buildings.count = data.buildings.count;
    world.buildings.types.set(data.buildings.types);
    world.buildings.owners.set(data.buildings.owners);
    world.buildings.levels.set(data.buildings.levels);
    world.buildings.efficiencies.set(data.buildings.efficiencies);
    world.buildings.slotMethods.set(data.buildings.slotMethods);
    world.buildings.oversupplySuspendedGoods.fill(-1);
    world.buildings.oversupplySuspendedUntilTick.fill(0);

    if (data.buildings.productionControlModes) {
      world.buildings.productionControlModes.set(data.buildings.productionControlModes);
    }
    if (data.buildings.manualEfficiencyTargets) {
      world.buildings.manualEfficiencyTargets.set(data.buildings.manualEfficiencyTargets);
    }
    if (data.buildings.oversupplySuspendedGoods) {
      world.buildings.oversupplySuspendedGoods.set(data.buildings.oversupplySuspendedGoods);
    }
    if (data.buildings.oversupplySuspendedUntilTick) {
      world.buildings.oversupplySuspendedUntilTick.set(data.buildings.oversupplySuspendedUntilTick);
    }

    // 恢复建筑激活状态
    world.buildings.isActive.set(data.buildings.isActive);

    if (data.buildings.manualEfficiencyTargets) {
      hydrateProductionControlState(world);
    } else {
      backfillManualTargetsFromCurrentEfficiency(world);
      hydrateProductionControlState(world);
    }
    
    world.companies.count = data.companies.count;
    world.companies.cash.set(data.companies.cash);
    world.companies.isAI = [...data.companies.isAI];
    
    for (let i = 0; i < data.companies.inventories.length; i++) {
      const inv = data.companies.inventories[i];
      for (let j = 0; j < inv.length; j++) {
        world.companies.inventories[i * GOODS_COUNT + j] = inv[j];
      }
    }

    bankruptcyResolution.hydrate(data.bankruptcy);
  }
  
  save(world: GameWorld, currentTick: number, playTime: number, saveName?: string): SaveMetadata {
    const id = Date.now().toString(36);
    const metadata: SaveMetadata = {
      id,
      name: saveName || `存档 ${new Date().toLocaleString('zh-CN')}`,
      timestamp: Date.now(),
      playTime: currentTick,
      realTime: playTime,
      version: CURRENT_VERSION,
      playerCash: world.companies.cash[0],
      companiesCount: world.companies.count,
      buildingsCount: world.buildings.count,
    };
    
    const saveData: SaveData = {
      metadata,
      world: this.serializeWorld(world, currentTick),
      settings: this.loadSettings(),
    };
    
    try {
      localStorage.setItem(`${SAVE_PREFIX}${id}`, JSON.stringify(saveData));
      console.log(`Game saved: ${metadata.name}`);
      return metadata;
    } catch (error) {
      console.error('Failed to save game:', error);
      throw error;
    }
  }
  
  load(saveId: string, world: GameWorld): SaveData | null {
    try {
      const json = localStorage.getItem(`${SAVE_PREFIX}${saveId}`);
      if (!json) return null;

      const saveData: SaveData = JSON.parse(json);
      const version = saveData.metadata?.version;
      if (!version || !SUPPORTED_VERSIONS.has(version)) {
        console.error(
          `[存档加载] 版本不兼容：存档版本 ${version ?? '未知'}，当前仅支持 ${CURRENT_VERSION}。请新建游戏。`,
        );
        return null;
      }

      this.deserializeWorld(saveData.world, world);
      console.log(`Game loaded: ${saveData.metadata.name}`);
      return saveData;
    } catch (error) {
      console.error('Failed to load game:', error);
      return null;
    }
  }
  
  listSaves(): SaveMetadata[] {
    const saves: SaveMetadata[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(SAVE_PREFIX)) {
        try {
          const json = localStorage.getItem(key);
          if (json) {
            const data: SaveData = JSON.parse(json);
            saves.push(data.metadata);
          }
        } catch (error) {
          console.warn(`Failed to parse save: ${key}`);
        }
      }
    }
    return saves.sort((a, b) => b.timestamp - a.timestamp);
  }
  
  deleteSave(saveId: string): boolean {
    try {
      localStorage.removeItem(`${SAVE_PREFIX}${saveId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete save:', error);
      return false;
    }
  }
  
  quickSave(world: GameWorld, currentTick: number, playTime: number): SaveMetadata {
    const saves = this.listSaves();
    const quickSave = saves.find(s => s.name === '快速存档');
    if (quickSave) this.deleteSave(quickSave.id);
    return this.save(world, currentTick, playTime, '快速存档');
  }
  
  quickLoad(world: GameWorld): SaveData | null {
    const saves = this.listSaves();
    const quickSave = saves.find(s => s.name === '快速存档');
    return quickSave ? this.load(quickSave.id, world) : null;
  }
  
  enableAutoSave(
    world: GameWorld,
    getCurrentTick: () => number,
    getPlayTime: () => number,
    intervalMs: number = 60000
  ): void {
    this.disableAutoSave();
    this.autoSaveTimer = setInterval(() => {
      const saves = this.listSaves();
      const autoSave = saves.find(s => s.name === '自动存档');
      if (autoSave) this.deleteSave(autoSave.id);
      this.save(world, getCurrentTick(), getPlayTime(), '自动存档');
    }, intervalMs);
  }
  
  disableAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }
  
  saveSettings(settings: GameSettings): void {
    const storage = getStorage();
    if (!storage) return;

    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
  
  loadSettings(): GameSettings {
    const defaultSettings = {
      gameSpeed: 1,
      soundEnabled: true,
      musicEnabled: true,
      autoSave: true,
      autoSaveInterval: 60000,
      maxAutoSaves: 5,
      language: 'zh-CN',
      newsGenerationEnabled: true,
      bankruptcyStrategy: bankruptcyResolution.getStrategy(0),
    };
    const storage = getStorage();
    if (!storage) return defaultSettings;

    try {
      const json = storage.getItem(SETTINGS_KEY);
      if (json) {
        const saved = JSON.parse(json);
        // 合并默认值，确保新字段有默认值
        return {
          ...defaultSettings,
          ...saved,
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return defaultSettings;
  }
  
  getStorageUsage(): { used: number; total: number; percent: number } {
    const storage = getStorage();
    if (!storage) return { used: 0, total: STORAGE_QUOTA_BYTES, percent: 0 };

    let used = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) used += (storage.getItem(key)?.length || 0) * 2;
    }
    const total = STORAGE_QUOTA_BYTES;
    return { used, total, percent: (used / total) * 100 };
  }
}

export const saveManager = new SaveManager();
