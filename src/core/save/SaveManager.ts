/**
 * 游戏存档管理器
 * 处理游戏状态的保存和加载
 *
 * v4.0更新：使用outputModeIds替代recipeIds
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT } from '@/core/constants';
import {
  BankruptcyResolutionSnapshot,
  BankruptcyStrategySettings,
  bankruptcyResolution,
} from '@/core/finance/BankruptcyResolution';
import { BUILDINGS_BY_ID, getBuildingProduction, getAvailableOutputModes } from '@/data/buildings';
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
  goods: {
    count: number;
    prices: number[];
    supplies: number[];
    demands: number[];
  };
  buildings: {
    count: number;
    types: number[];
    owners: number[];
    levels: number[];
    efficiencies: number[];
    productionControlModes?: number[];
    manualEfficiencyTargets?: number[];
    outputModeIds: number[];  // v4.0更新：替代recipeIds
    isActive: number[];
    // 兼容旧存档
    recipeIds?: number[];
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
const CURRENT_VERSION = '1.0.0';

export class SaveManager {
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  
  serializeWorld(world: GameWorld, currentTick: number): SerializedWorld {
    return {
      goods: {
        count: world.goods.count,
        prices: Array.from(world.goods.prices),
        supplies: Array.from(world.goods.supplies),
        demands: Array.from(world.goods.demands),
      },
      buildings: {
        count: world.buildings.count,
        types: Array.from(world.buildings.types),
        owners: Array.from(world.buildings.owners),
        levels: Array.from(world.buildings.levels),
        efficiencies: Array.from(world.buildings.efficiencies),
        productionControlModes: Array.from(world.buildings.productionControlModes),
        manualEfficiencyTargets: Array.from(world.buildings.manualEfficiencyTargets),
        outputModeIds: Array.from(world.buildings.outputModeIds),  // v4.0更新
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
    world.tick = data.currentTick;
    
    world.goods.count = data.goods.count;
    world.goods.prices.set(data.goods.prices);
    world.goods.supplies.set(data.goods.supplies);
    world.goods.demands.set(data.goods.demands);
    
    world.buildings.count = data.buildings.count;
    world.buildings.types.set(data.buildings.types);
    world.buildings.owners.set(data.buildings.owners);
    world.buildings.levels.set(data.buildings.levels);
    world.buildings.efficiencies.set(data.buildings.efficiencies);

    if (data.buildings.productionControlModes) {
      world.buildings.productionControlModes.set(data.buildings.productionControlModes);
    }
    if (data.buildings.manualEfficiencyTargets) {
      world.buildings.manualEfficiencyTargets.set(data.buildings.manualEfficiencyTargets);
    }
    
    // v4.0更新：处理outputModeIds，兼容旧存档的recipeIds
    if (data.buildings.outputModeIds) {
      world.buildings.outputModeIds.set(data.buildings.outputModeIds);
    } else if (data.buildings.recipeIds) {
      // 旧存档迁移：将recipeIds映射到outputModeIds
      this.migrateRecipeIdsToOutputModeIds(data.buildings.recipeIds, data.buildings.types, world);
    }
    
    // 验证并修复建筑生产模式
    this.validateAndFixBuildingOutputModes(world);
    
    // 恢复建筑激活状态（修复建筑暂停问题）
    if (data.buildings.isActive) {
      world.buildings.isActive.set(data.buildings.isActive);
    } else {
      // 兼容旧存档：如果没有isActive数据，默认所有建筑激活
      for (let i = 0; i < data.buildings.count; i++) {
        world.buildings.isActive[i] = 1;
      }
    }

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
  
  /**
   * 旧存档迁移：将recipeIds映射到outputModeIds
   * 由于配方系统已删除，我们使用默认模式0
   */
  private migrateRecipeIdsToOutputModeIds(
    recipeIds: number[],
    buildingTypes: number[],
    world: GameWorld
  ): void {
    console.log('[存档迁移] 检测到旧版存档，正在迁移recipeIds到outputModeIds...');
    
    for (let i = 0; i < recipeIds.length; i++) {
      // 旧存档的recipeIds无法直接映射，使用默认模式0
      world.buildings.outputModeIds[i] = 0;
    }
    
    console.log(`[存档迁移] 完成迁移 ${recipeIds.length} 个建筑到默认生产模式`);
  }
  
  /**
   * 验证并修复建筑生产模式
   * v4.0更新：使用outputModeIds替代recipeIds
   */
  private validateAndFixBuildingOutputModes(world: GameWorld): void {
    let fixedCount = 0;
    
    for (let i = 0; i < world.buildings.count; i++) {
      const buildingTypeId = world.buildings.types[i];
      const currentModeId = world.buildings.outputModeIds[i];
      const buildingLevel = world.buildings.levels[i];
      
      const buildingDef = BUILDINGS_BY_ID.get(buildingTypeId);
      if (!buildingDef) {
        console.warn(`[存档修复] 未知建筑类型: ${buildingTypeId}`);
        continue;
      }
      
      // 零售建筑不需要生产模式
      if (buildingDef.category === 'retail') {
        continue;
      }
      
      // 检查当前模式是否有效
      const availableModes = getAvailableOutputModes(buildingTypeId, buildingLevel);
      const production = getBuildingProduction(buildingTypeId, currentModeId);
      
      if (!production) {
        // 当前模式无效，使用默认模式0
        world.buildings.outputModeIds[i] = 0;
        fixedCount++;
        console.log(`[存档修复] 建筑#${i} (${buildingDef.name}) 生产模式从 ${currentModeId} 修复为 0`);
      } else if (availableModes.length > 0) {
        // 检查模式是否在可用列表中
        const modeExists = availableModes.some(m => m.modeId === currentModeId);
        if (!modeExists) {
          world.buildings.outputModeIds[i] = 0;
          fixedCount++;
          console.log(`[存档修复] 建筑#${i} (${buildingDef.name}) 模式 ${currentModeId} 不可用，修复为 0`);
        }
      }
    }
    
    if (fixedCount > 0) {
      console.log(`[存档修复] 共修复了 ${fixedCount} 个建筑的生产模式`);
    }
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
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }
  
  loadSettings(): GameSettings {
    try {
      const json = localStorage.getItem(SETTINGS_KEY);
      if (json) {
        const saved = JSON.parse(json);
        // 合并默认值，确保新字段有默认值
        return {
          gameSpeed: 1,
          soundEnabled: true,
          musicEnabled: true,
          autoSave: true,
          autoSaveInterval: 60000,
          maxAutoSaves: 5,
          language: 'zh-CN',
          newsGenerationEnabled: true,
          bankruptcyStrategy: bankruptcyResolution.getStrategy(0),
          ...saved,
        };
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
    return {
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
  }
  
  getStorageUsage(): { used: number; total: number; percent: number } {
    let used = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) used += (localStorage.getItem(key)?.length || 0) * 2;
    }
    const total = 5 * 1024 * 1024;
    return { used, total, percent: (used / total) * 100 };
  }
}

export const saveManager = new SaveManager();
