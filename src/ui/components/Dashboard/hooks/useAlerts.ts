/**
 * 告警系统Hook
 * 监测各种需要玩家注意的情况并生成告警
 */

import { useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { GOODS_COUNT, ACTUAL_GOODS_COUNT } from '@/core/constants';

export type AlertLevel = 'critical' | 'warning' | 'info';
export type AlertCategory = 'production' | 'market' | 'finance' | 'inventory' | 'investment';

export interface Alert {
  id: string;
  level: AlertLevel;
  category: AlertCategory;
  title: string;
  description: string;
  actionLabel?: string;
  actionView?: string;
  actionData?: Record<string, unknown>;
  timestamp: number;
}

interface UseAlertsResult {
  alerts: Alert[];
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  hasAlerts: boolean;
}

export function useAlerts(): UseAlertsResult {
  const {
    getWorld,
    playerCash,
    tick,
    getPlayerLoans,
    getPlayerBuildings,
    getPlayerCreditProfile,
  } = useGameStore();

  const world = getWorld();

  const alerts = useMemo((): Alert[] => {
    const result: Alert[] = [];
    let alertId = 0;

    // ==================== 财务告警 ====================
    
    // 现金不足
    if (playerCash < 10000) {
      result.push({
        id: `alert-${alertId++}`,
        level: playerCash < 1000 ? 'critical' : 'warning',
        category: 'finance',
        title: '现金紧张',
        description: playerCash < 1000 
          ? `现金仅剩 ¥${playerCash.toFixed(0)}，即将无法维持运营！`
          : `现金低于安全线 (¥${playerCash.toFixed(0)})`,
        actionLabel: '申请贷款',
        actionView: 'finance',
        timestamp: tick,
      });
    }

    // 贷款到期提醒
    const loans = getPlayerLoans();
    for (const loan of loans) {
      const ticksRemaining = loan.maturityTick - tick;
      if (ticksRemaining > 0 && ticksRemaining <= 24) {
        result.push({
          id: `alert-${alertId++}`,
          level: 'warning',
          category: 'finance',
          title: '贷款即将到期',
          description: `贷款 ¥${loan.remainingPrincipal.toFixed(0)} 将在 ${ticksRemaining} tick 后到期`,
          actionLabel: '查看贷款',
          actionView: 'finance',
          timestamp: tick,
        });
      }
    }

    // 信用评级下降
    const credit = getPlayerCreditProfile();
    if (credit && credit.rating === 'CCC' || credit?.rating === 'D') {
      result.push({
        id: `alert-${alertId++}`,
        level: 'critical',
        category: 'finance',
        title: '信用评级危险',
        description: `当前信用评级 ${credit.rating}，可能影响贷款和交易`,
        actionLabel: '改善信用',
        actionView: 'finance',
        timestamp: tick,
      });
    }

    // ==================== 生产告警 ====================
    
    const buildings = getPlayerBuildings();
    let blockedCount = 0;
    let lowEfficiencyCount = 0;
    const missingMaterials = new Set<string>();

    for (const b of buildings) {
      if (b.isRetail || !b.status) continue;

      if (b.status.status === 'blocked') {
        blockedCount++;
        // 收集缺少的原料
        for (const input of b.status.inputLevels) {
          if (input.current < input.required * 0.3) {
            const goods = ALL_GOODS.find(g => g.id === input.goodsId);
            if (goods) {
              missingMaterials.add(goods.name);
            }
          }
        }
      } else if (b.status.status === 'producing' && b.status.efficiency < 0.3) {
        lowEfficiencyCount++;
      }
    }

    if (blockedCount > 0) {
      result.push({
        id: `alert-${alertId++}`,
        level: blockedCount > 3 ? 'critical' : 'warning',
        category: 'production',
        title: `${blockedCount} 个建筑生产受阻`,
        description: missingMaterials.size > 0 
          ? `缺少: ${Array.from(missingMaterials).slice(0, 3).join(', ')}${missingMaterials.size > 3 ? ' 等' : ''}`
          : '检查原料供应',
        actionLabel: '查看生产',
        actionView: 'production',
        timestamp: tick,
      });
    }

    if (lowEfficiencyCount > 0) {
      result.push({
        id: `alert-${alertId++}`,
        level: 'info',
        category: 'production',
        title: `${lowEfficiencyCount} 个建筑效率低下`,
        description: '建筑效率低于30%，考虑优化供应链',
        actionLabel: '查看生产',
        actionView: 'production',
        timestamp: tick,
      });
    }

    // ==================== 市场告警 ====================
    
    if (world) {
      // 极端价格变动
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        const goods = ALL_GOODS.find(g => g.id === i);
        if (!goods) continue;

        const currentPrice = world.goods.prices[i];
        const basePrice = goods.basePrice;
        const change = (currentPrice - basePrice) / basePrice;

        // 价格暴跌超过40%且有库存
        const stock = world.companies.inventories[0 * GOODS_COUNT + i];
        if (change < -0.4 && stock > 0) {
          result.push({
            id: `alert-${alertId++}`,
            level: 'warning',
            category: 'market',
            title: `${goods.name} 价格暴跌`,
            description: `当前价格 ¥${currentPrice.toFixed(2)}，跌幅 ${(change * 100).toFixed(0)}%`,
            actionLabel: '查看市场',
            actionView: 'market',
            actionData: { goodsId: i },
            timestamp: tick,
          });
          break; // 只显示一个价格告警
        }
      }

      // 挂单过多
      let pendingOrders = 0;
      for (let i = 0; i < world.orders.maxOrders; i++) {
        if (world.orders.isActive[i] && world.orders.companyIds[i] === 0) {
          pendingOrders++;
        }
      }
      if (pendingOrders > 20) {
        result.push({
          id: `alert-${alertId++}`,
          level: 'info',
          category: 'market',
          title: '待成交订单较多',
          description: `当前有 ${pendingOrders} 个挂单未成交`,
          actionLabel: '管理订单',
          actionView: 'market',
          timestamp: tick,
        });
      }
    }

    // ==================== 库存告警 ====================
    
    if (world) {
      // 仓库快满
      let totalInventory = 0;
      for (let i = 0; i < ACTUAL_GOODS_COUNT; i++) {
        totalInventory += world.companies.inventories[0 * GOODS_COUNT + i];
      }
      // 假设仓库容量 10000 单位
      const warehouseCapacity = 10000;
      if (totalInventory > warehouseCapacity * 0.9) {
        result.push({
          id: `alert-${alertId++}`,
          level: 'warning',
          category: 'inventory',
          title: '仓库即将满载',
          description: `库存 ${totalInventory.toFixed(0)}/${warehouseCapacity}`,
          actionLabel: '清理库存',
          actionView: 'inventory',
          timestamp: tick,
        });
      }
    }

    // 按优先级排序: critical > warning > info
    const levelOrder: Record<AlertLevel, number> = {
      critical: 0,
      warning: 1,
      info: 2,
    };

    return result.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
  }, [world, playerCash, tick]);

  // 统计各级别告警数量
  const { criticalCount, warningCount, infoCount } = useMemo(() => {
    let critical = 0, warning = 0, info = 0;
    for (const alert of alerts) {
      if (alert.level === 'critical') critical++;
      else if (alert.level === 'warning') warning++;
      else info++;
    }
    return { criticalCount: critical, warningCount: warning, infoCount: info };
  }, [alerts]);

  return {
    alerts,
    criticalCount,
    warningCount,
    infoCount,
    hasAlerts: alerts.length > 0,
  };
}

export default useAlerts;