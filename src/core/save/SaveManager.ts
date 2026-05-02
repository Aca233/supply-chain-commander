/**
 * 游戏存档管理器
 * 处理游戏状态的保存和加载
 *
 */

import { GameWorld } from '@/core/world/GameWorld';
import { GOODS_COUNT, LABOR_ROLE_COUNT, MAX_SLOTS, legacyHourTicksToDayTicks } from '@/core/constants';
import {
  BankruptcyResolutionSnapshot,
  BankruptcyStrategySettings,
  bankruptcyResolution,
} from '@/core/finance/BankruptcyResolution';
import {
  LABOR_ROLE_BASIC,
  LABOR_ROLE_MANAGEMENT,
  LABOR_ROLE_TECHNICAL,
  getBuildingLaborIndex,
  getWorkforceDemandValue,
  hydrateLaborState,
  scaleWorkforceDemand,
  type LaborRole,
} from '@/core/labor/LaborSystem';
import { backfillManualTargetsFromCurrentEfficiency, hydrateProductionControlState } from '@/core/production/ProductionControl';
import {
  getBuildingSlotCount,
  getRecipeForBuilding,
  initializeBuildingProductionMethods,
} from '@/core/production/ProductionMethods';

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
  labor?: {
    totalSupply?: number[];
    employed?: number[];
    unemployed?: number[];
    marketWages?: number[];
    monthlyGrowth?: number[];
    demandOpenings?: number[];
    lastPayrollTick?: number;
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
    workforceHired?: number[];
    wageMultipliers?: number[];
    accruedPayroll?: number[];
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
const LEGACY_LABOR_BACKFILL_RATIO = 0.6;
const LABOR_ROLES: LaborRole[] = [
  LABOR_ROLE_BASIC,
  LABOR_ROLE_TECHNICAL,
  LABOR_ROLE_MANAGEMENT,
];

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
    hydrateLaborState(world);

    return {
      timeModel: 'day',
      goods: {
        count: world.goods.count,
        prices: Array.from(world.goods.prices),
        supplies: Array.from(world.goods.supplies),
        demands: Array.from(world.goods.demands),
        demandPressure: Array.from(world.goods.demandPressure),
      },
      labor: {
        totalSupply: Array.from(world.labor.totalSupply),
        employed: Array.from(world.labor.employed),
        unemployed: Array.from(world.labor.unemployed),
        marketWages: Array.from(world.labor.marketWages),
        monthlyGrowth: Array.from(world.labor.monthlyGrowth),
        demandOpenings: Array.from(world.labor.demandOpenings),
        lastPayrollTick: world.labor.lastPayrollTick,
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
        workforceHired: Array.from(
          world.buildings.workforceHired.subarray(0, world.buildings.count * LABOR_ROLE_COUNT),
        ),
        wageMultipliers: Array.from(
          world.buildings.wageMultipliers.subarray(0, world.buildings.count * LABOR_ROLE_COUNT),
        ),
        accruedPayroll: Array.from(world.buildings.accruedPayroll.subarray(0, world.buildings.count)),
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

  private copyNumberArray(
    target: Float32Array | Float64Array,
    source: readonly number[] | undefined,
    limit: number = target.length,
  ): void {
    if (!source) return;

    const length = Math.min(source.length, target.length, limit);
    for (let i = 0; i < length; i++) {
      const value = source[i];
      if (Number.isFinite(value)) {
        target[i] = value;
      }
    }
  }

  private resetBuildingLaborState(world: GameWorld): void {
    const laborLength = world.buildings.count * LABOR_ROLE_COUNT;
    world.buildings.workforceHired.fill(0, 0, laborLength);
    world.buildings.wageMultipliers.fill(1.0, 0, laborLength);
    world.buildings.accruedPayroll.fill(0, 0, world.buildings.count);
  }

  private restoreLaborState(data: SerializedWorld['labor'], world: GameWorld): void {
    if (!data) return;

    this.copyNumberArray(world.labor.totalSupply, data.totalSupply);
    this.copyNumberArray(world.labor.employed, data.employed);
    this.copyNumberArray(world.labor.unemployed, data.unemployed);
    this.copyNumberArray(world.labor.marketWages, data.marketWages);
    this.copyNumberArray(world.labor.monthlyGrowth, data.monthlyGrowth);
    this.copyNumberArray(world.labor.demandOpenings, data.demandOpenings);
    if (typeof data.lastPayrollTick === 'number' && Number.isFinite(data.lastPayrollTick)) {
      world.labor.lastPayrollTick = data.lastPayrollTick;
    }
  }

  private restoreBuildingLaborState(data: SerializedWorld['buildings'], world: GameWorld): void {
    const laborLength = world.buildings.count * LABOR_ROLE_COUNT;
    this.copyNumberArray(world.buildings.workforceHired, data.workforceHired, laborLength);
    this.copyNumberArray(world.buildings.wageMultipliers, data.wageMultipliers, laborLength);
    this.copyNumberArray(world.buildings.accruedPayroll, data.accruedPayroll, world.buildings.count);
  }

  private getActiveBuildingDemand(world: GameWorld, buildingId: number) {
    if (world.buildings.isActive[buildingId] !== 1) {
      return null;
    }

    const owner = world.buildings.owners[buildingId];
    if (!Number.isInteger(owner) || owner < 0 || owner >= world.companies.count) {
      return null;
    }

    const efficiency = world.buildings.efficiencies[buildingId] || 0;
    if (efficiency <= 0) {
      return null;
    }

    const buildingTypeId = world.buildings.types[buildingId];
    const slotCount = getBuildingSlotCount(buildingTypeId);
    if (slotCount <= 0) {
      return null;
    }

    const slotOffset = buildingId * MAX_SLOTS;
    const slotMethods: number[] = [];
    for (let i = 0; i < slotCount; i++) {
      slotMethods.push(world.buildings.slotMethods[slotOffset + i] ?? 0);
    }

    const recipe = getRecipeForBuilding(buildingTypeId, slotMethods);
    return scaleWorkforceDemand(recipe.workforceRequired, efficiency);
  }

  private migrateLegacyLaborState(world: GameWorld): void {
    hydrateLaborState(world);
    initializeBuildingProductionMethods();

    for (let buildingId = 0; buildingId < world.buildings.count; buildingId++) {
      const activeDemand = this.getActiveBuildingDemand(world, buildingId);
      if (!activeDemand) continue;

      for (const role of LABOR_ROLES) {
        const demand = getWorkforceDemandValue(activeDemand, role);
        if (demand <= 0) continue;

        const idx = getBuildingLaborIndex(buildingId, role);
        const existingHired = Math.max(0, world.buildings.workforceHired[idx] || 0);
        if (existingHired > 0) {
          const counted = Math.min(existingHired, Math.max(0, world.labor.unemployed[role] || 0));
          world.labor.unemployed[role] = Math.max(0, world.labor.unemployed[role] - counted);
          world.labor.employed[role] += counted;
          continue;
        }

        const targetHire = Math.ceil(demand * LEGACY_LABOR_BACKFILL_RATIO);
        const available = Math.max(0, world.labor.unemployed[role] || 0);
        const hired = Math.min(targetHire, available);
        if (hired <= 0) continue;

        world.buildings.workforceHired[idx] = hired;
        world.labor.unemployed[role] = Math.max(0, world.labor.unemployed[role] - hired);
        world.labor.employed[role] += hired;
      }
    }
  }
  
  deserializeWorld(data: SerializedWorld, world: GameWorld): void {
    const hasSerializedLabor = data.labor !== undefined;

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

    if (!hasSerializedLabor) {
      (world as unknown as { labor?: GameWorld['labor'] }).labor = undefined;
    }
    hydrateLaborState(world);
    this.resetBuildingLaborState(world);
    this.restoreLaborState(data.labor, world);
    this.restoreBuildingLaborState(data.buildings, world);
    hydrateLaborState(world);
    if (!hasSerializedLabor) {
      this.migrateLegacyLaborState(world);
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
