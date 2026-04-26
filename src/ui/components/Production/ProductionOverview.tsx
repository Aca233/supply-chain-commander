/**
 * 生产概览组件
 * 使用设计系统组件重构
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS, getBuildingProduction } from '@/data/buildings';
import {
  calculateBuildingDailyAmount,
  calculateBuildingFinancialEstimate,
} from './BuildingFinancialEstimate';

// 设计系统组件
import { Card, Badge, StatWidget, Tabs, TabsList, TabsTrigger } from '@/ui/design-system';

type TimeRange = 'day' | 'week' | 'month';

export const ProductionOverview: React.FC = () => {
  const { getWorld, playerCash, playerBuildings, tick } = useGameStore();
  const world = getWorld();
  const [timeRange, setTimeRange] = useState<TimeRange>('day');

  // 时间倍数
  const timeMultiplier = timeRange === 'day' ? 1 : timeRange === 'week' ? 7 : 30;
  const timeLabel = timeRange === 'day' ? '日' : timeRange === 'week' ? '周' : '月';

  // 计算生产统计数据
  const stats = useMemo(() => {
    if (!world) {
      return {
        periodOutput: 0,
        activeBuildings: 0,
        totalBuildings: 0,
        bottleneckCount: 0,
        periodProfit: 0,
        avgEfficiency: 0,
      };
    }

    let totalOutput = 0;
    let activeCount = 0;
    let bottleneckCount = 0;
    let totalEfficiency = 0;
    let dailyCost = 0;
    let dailyRevenue = 0;

    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === 0) {
        const isActive = world.buildings.isActive[i];
        const efficiency = world.buildings.efficiencies[i];
        const outputModeId = world.buildings.outputModeIds[i];
        const typeId = world.buildings.types[i];
        const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
        
        const outputEstimates: Array<{ dailyAmount: number; price: number }> = [];

        if (isActive) {
          activeCount++;
          totalEfficiency += efficiency;
          
          const production = getBuildingProduction(typeId, outputModeId);
          if (production && production.outputs) {
            const ticksRequired = production.ticksRequired || 1;
            for (const output of production.outputs) {
              const goods = ALL_GOODS.find(g => g.id === output.goodsId);
              if (goods) {
                const dailyAmount = calculateBuildingDailyAmount(output.amount, ticksRequired, efficiency);
                const price = world.goods.prices[output.goodsId] || goods.basePrice;
                totalOutput += dailyAmount * price;
                outputEstimates.push({ dailyAmount, price });
              }
            }
            
            let hasBottleneck = false;
            const inputs = production.inputs || [];
            for (let j = 0; j < inputs.length; j++) {
              const inputBuffer = world.buildings.inputBuffers[i * 8 + j];
              if (inputBuffer < inputs[j].amount) {
                hasBottleneck = true;
                break;
              }
            }
            if (hasBottleneck) bottleneckCount++;
          }
        }
        
        if (buildingDef) {
          const buildingDailyCost =
            buildingDef.maintenanceCost + buildingDef.laborCost + buildingDef.energyCost;
          dailyCost += buildingDailyCost;
          dailyRevenue += calculateBuildingFinancialEstimate({
            isActive: Boolean(isActive),
            dailyCost: buildingDailyCost,
            outputs: outputEstimates,
          }).dailyRevenue;
        }
      }
    }

    const avgEfficiency = activeCount > 0 ? totalEfficiency / activeCount : 0;
    const periodProfit = (dailyRevenue - dailyCost) * timeMultiplier;
    const periodOutput = totalOutput * timeMultiplier;

    return {
      periodOutput,
      activeBuildings: activeCount,
      totalBuildings: playerBuildings,
      bottleneckCount,
      periodProfit,
      avgEfficiency,
    };
  }, [world, playerBuildings, tick, timeMultiplier]);

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  return (
    <Card variant="game" padding="md" className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-medium text-[var(--text-primary)]">生产概览</h3>
        </div>
        <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
          <TabsList variant="game" size="sm">
            <TabsTrigger value="day" variant="game">日</TabsTrigger>
            <TabsTrigger value="week" variant="game">周</TabsTrigger>
            <TabsTrigger value="month" variant="game">月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 sm:gap-3">
        <StatWidget
          icon="⚡"
          title={`${timeLabel}产能`}
          value={formatMoney(stats.periodOutput)}
          status="info"
          compact
        />
        <StatWidget
          icon="🔧"
          title="运营建筑"
          value={`${stats.activeBuildings}/${stats.totalBuildings}`}
          status="success"
          compact
        />
        <StatWidget
          icon="⚠️"
          title="瓶颈数"
          value={stats.bottleneckCount.toString()}
          status={stats.bottleneckCount > 0 ? 'warning' : 'success'}
          compact
        />
        <StatWidget
          icon="💰"
          title={`${timeLabel}预估利润`}
          value={formatMoney(stats.periodProfit)}
          status={stats.periodProfit >= 0 ? 'success' : 'error'}
          compact
        />
        <StatWidget
          icon="📈"
          title="综合效率"
          value={`${(stats.avgEfficiency * 100).toFixed(1)}%`}
          status={stats.avgEfficiency >= 0.8 ? 'success' : stats.avgEfficiency >= 0.5 ? 'warning' : 'error'}
          compact
        />
      </div>
      
      {/* 资源流向简图 */}
      <div className="mt-3 pt-3 border-t border-[var(--border-muted)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>资源流向:</span>
            <div className="flex items-center gap-1">
              <Badge variant="warning" size="sm">原材料</Badge>
              <span className="text-[var(--text-muted)]">→</span>
              <Badge variant="info" size="sm">加工品</Badge>
              <span className="text-[var(--text-muted)]">→</span>
              <Badge variant="success" size="sm">成品</Badge>
              <span className="text-[var(--text-muted)]">→</span>
              <Badge variant="outline" size="sm" className="border-purple-500/30 text-purple-400">零售</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {stats.bottleneckCount === 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"></span>
                <span className="text-xs text-[var(--success)]">产能充足</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse"></span>
                <span className="text-xs text-[var(--warning)]">{stats.bottleneckCount}个瓶颈</span>
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ProductionOverview;
