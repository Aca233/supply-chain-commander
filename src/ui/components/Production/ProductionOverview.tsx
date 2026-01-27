import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { RECIPES } from '@/data/recipes';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS, isRetailBuilding } from '@/data/buildings';

type TimeRange = 'day' | 'week' | 'month';

interface StatItemProps {
  icon: string;
  label: string;
  value: string | number;
  subValue?: string;
  change?: number;
  color?: string;
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, subValue, change, color = 'text-text-primary' }) => (
  <div className="flex flex-col items-center justify-center p-3 bg-gradient-to-br from-white/5 to-transparent rounded-lg border border-white/5">
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-lg">{icon}</span>
      <span className="text-xs text-text-tertiary">{label}</span>
    </div>
    <div className={`text-xl font-bold tabular-nums ${color}`}>{value}</div>
    {(subValue || change !== undefined) && (
      <div className="flex items-center gap-1 mt-0.5">
        {subValue && <span className="text-xs text-text-tertiary">{subValue}</span>}
        {change !== undefined && change !== 0 && (
          <span className={`text-xs tabular-nums ${change > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change > 0 ? '↑' : '↓'}{Math.abs(change * 100).toFixed(1)}%
          </span>
        )}
      </div>
    )}
  </div>
);

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
      if (world.buildings.owners[i] === 0) { // 玩家公司
        const isActive = world.buildings.isActive[i];
        const efficiency = world.buildings.efficiencies[i];
        const recipeId = world.buildings.recipeIds[i];
        const typeId = world.buildings.types[i];
        const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
        
        if (isActive) {
          activeCount++;
          totalEfficiency += efficiency;
          
          // 计算产出价值
          const recipe = RECIPES.find(r => r.id === recipeId);
          if (recipe) {
            for (const output of recipe.outputs) {
              const goods = ALL_GOODS.find(g => g.id === output.goodsId);
              if (goods) {
                const dailyAmount = (output.amount / recipe.ticksRequired) * 24 * efficiency;
                const price = world.goods.prices[output.goodsId] || goods.basePrice;
                dailyRevenue += dailyAmount * price;
                totalOutput += dailyAmount * price;
              }
            }
            
            // 检查瓶颈 (输入不足)
            let hasBottleneck = false;
            for (let j = 0; j < recipe.inputs.length; j++) {
              const inputBuffer = world.buildings.inputBuffers[i * 8 + j];
              if (inputBuffer < recipe.inputs[j].amount) {
                hasBottleneck = true;
                break;
              }
            }
            if (hasBottleneck) bottleneckCount++;
          }
        }
        
        // 计算运营成本
        if (buildingDef) {
          dailyCost += buildingDef.maintenanceCost + buildingDef.laborCost + buildingDef.energyCost;
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
    if (Math.abs(value) >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  return (
    <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-xl border border-white/10 p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-medium text-text-primary">生产概览</h3>
        </div>
        <div className="flex items-center bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setTimeRange('day')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              timeRange === 'day'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            日
          </button>
          <button
            onClick={() => setTimeRange('week')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              timeRange === 'week'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            周
          </button>
          <button
            onClick={() => setTimeRange('month')}
            className={`px-3 py-1 text-xs rounded-md transition-all ${
              timeRange === 'month'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-text-tertiary hover:text-text-primary'
            }`}
          >
            月
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-5 gap-3">
        <StatItem
          icon="⚡"
          label={`${timeLabel}产能`}
          value={formatMoney(stats.periodOutput)}
          color="text-blue-400"
        />
        <StatItem
          icon="🔧"
          label="运营建筑"
          value={`${stats.activeBuildings}/${stats.totalBuildings}`}
          subValue={stats.totalBuildings > 0 ? `${Math.round((stats.activeBuildings / stats.totalBuildings) * 100)}%运转` : ''}
          color="text-green-400"
        />
        <StatItem
          icon="⚠️"
          label="瓶颈数"
          value={stats.bottleneckCount}
          subValue={stats.bottleneckCount > 0 ? '需关注' : '正常'}
          color={stats.bottleneckCount > 0 ? 'text-yellow-400' : 'text-green-400'}
        />
        <StatItem
          icon="💰"
          label={`${timeLabel}利润`}
          value={formatMoney(stats.periodProfit)}
          color={stats.periodProfit >= 0 ? 'text-green-400' : 'text-red-400'}
        />
        <StatItem
          icon="📈"
          label="综合效率"
          value={`${(stats.avgEfficiency * 100).toFixed(1)}%`}
          color={stats.avgEfficiency >= 0.8 ? 'text-green-400' : stats.avgEfficiency >= 0.5 ? 'text-yellow-400' : 'text-red-400'}
        />
      </div>
      
      {/* 资源流向简图 */}
      <div className="mt-3 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-text-tertiary">
            <span>资源流向:</span>
            <div className="flex items-center gap-1">
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">原材料</span>
              <span className="text-text-tertiary">→</span>
              <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded text-[10px]">加工品</span>
              <span className="text-text-tertiary">→</span>
              <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-[10px]">成品</span>
              <span className="text-text-tertiary">→</span>
              <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">零售</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {stats.bottleneckCount === 0 ? (
              <>
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                <span className="text-xs text-green-400">产能充足</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                <span className="text-xs text-yellow-400">{stats.bottleneckCount}个瓶颈</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionOverview;