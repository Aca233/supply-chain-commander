/**
 * 游戏统计面板组件
 * 展示玩家的游戏进度、历史记录和里程碑
 */

import React, { useMemo } from 'react';
import { TICKS_PER_DAY, TICKS_PER_YEAR } from '@/core/constants';
import { GameWorld } from '@/core/world/GameWorld';
import { useGameStore } from '@/stores/gameStore';
import { Card, CardHeader, CardTitle, CardContent, Badge, ProgressBar } from '@/ui/design-system';
import { GOODS_BY_ID } from '@/data/goods';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import { formatRelativeTime } from '@/ui/utils/format';

// ==================== 类型定义 ====================

export interface GameStatisticsPanelProps {
  className?: string;
}

interface StatItem {
  label: string;
  value: string | number;
  icon?: string;
  change?: number;
  changeLabel?: string;
}

interface MilestoneItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  achieved: boolean;
}

// ==================== 辅助函数 ====================

function formatNumber(value: number): string {
  if (value >= 1000000000) {
    return (value / 1000000000).toFixed(2) + 'B';
  } else if (value >= 1000000) {
    return (value / 1000000).toFixed(2) + 'M';
  } else if (value >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return value.toFixed(0);
}

function formatMoney(value: number): string {
  return '¥' + formatNumber(value);
}

function formatTime(ticks: number): string {
  return formatRelativeTime(ticks);
}

function calculateRecordedTradeVolume(world: GameWorld): number {
  const trades = (world as GameWorld & {
    trades?: {
      count?: number;
      maxTrades?: number;
      quantities?: ArrayLike<number>;
    };
  }).trades;

  if (!trades?.quantities) {
    return 0;
  }

  const quantityLength = trades.quantities.length ?? 0;
  const tradeCount = Math.min(
    trades.count ?? 0,
    trades.maxTrades ?? quantityLength,
    quantityLength,
  );

  let totalVolume = 0;
  for (let i = 0; i < tradeCount; i++) {
    totalVolume += trades.quantities[i] || 0;
  }

  return totalVolume;
}

// ==================== 统计项组件 ====================

const StatCard: React.FC<{ stat: StatItem }> = ({ stat }) => (
  <div className="bg-background-secondary rounded-lg p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs text-text-tertiary">{stat.label}</span>
      {stat.icon && <span className="text-sm">{stat.icon}</span>}
    </div>
    <div className="flex items-end justify-between">
      <span className="text-lg font-bold text-text-primary tabular-nums">
        {stat.value}
      </span>
      {stat.change !== undefined && (
        <span className={`text-xs ${stat.change >= 0 ? 'text-chart-up' : 'text-chart-down'}`}>
          {stat.change >= 0 ? '▲' : '▼'} {Math.abs(stat.change).toFixed(1)}%
        </span>
      )}
    </div>
  </div>
);

// ==================== 里程碑组件 ====================

const MilestoneCard: React.FC<{ milestone: MilestoneItem }> = ({ milestone }) => (
  <div className={`
    p-3 rounded-lg border transition-all
    ${milestone.achieved 
      ? 'bg-success/10 border-success/30' 
      : 'bg-background-secondary border-border-default'
    }
  `}>
    <div className="flex items-start gap-3">
      <span className={`text-2xl ${milestone.achieved ? '' : 'grayscale opacity-50'}`}>
        {milestone.icon}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`text-sm font-medium truncate ${
            milestone.achieved ? 'text-success' : 'text-text-primary'
          }`}>
            {milestone.title}
          </h4>
          {milestone.achieved && (
            <Badge variant="success" size="sm">已达成</Badge>
          )}
        </div>
        <p className="text-xs text-text-tertiary mb-2">{milestone.description}</p>
        {!milestone.achieved && (
          <div className="flex items-center gap-2">
            <ProgressBar
              value={milestone.progress}
              max={milestone.target}
              size="sm"
              color="brand"
              className="flex-1"
            />
            <span className="text-xs text-text-tertiary tabular-nums">
              {formatNumber(milestone.progress)}/{formatNumber(milestone.target)}
            </span>
          </div>
        )}
      </div>
    </div>
  </div>
);

// ==================== 主组件 ====================

export const GameStatisticsPanel: React.FC<GameStatisticsPanelProps> = ({
  className = '',
}) => {
  const tick = useGameStore(s => s.tick);
  const playerBuildings = useGameStore(s => s.playerBuildings);
  const playerFinancialSnapshot = useGameStore(s => s.playerFinancialSnapshot);
  const getWorld = useGameStore(s => s.getWorld);
  const getAllCompanyProfiles = useGameStore(s => s.getAllCompanyProfiles);
  
  // 获取world实例
  const world = getWorld();

  // 计算统计数据
  const stats = useMemo(() => {
    if (!world) return null;

    // 玩家建筑数量
    let playerBuildingCount = 0;
    
    for (let i = 0; i < world.buildings.count; i++) {
      if (world.buildings.owners[i] === 0) {
        playerBuildingCount++;
      }
    }

    // AI公司数量
    const companyProfiles = getAllCompanyProfiles();
    const aiCompanies = companyProfiles.filter(c => c.id !== 0).length;

    const totalVolume = calculateRecordedTradeVolume(world);

    return {
      general: [
        { label: '游戏时间', value: formatTime(tick), icon: '⏱️' },
        { label: '净资产', value: formatMoney(playerFinancialSnapshot.netWorth), icon: '💰' },
        { label: '现金余额', value: formatMoney(playerFinancialSnapshot.cash), icon: '💵' },
        { label: '资产价值', value: formatMoney(playerFinancialSnapshot.operatingAssets), icon: '🏦' },
      ] as StatItem[],
      production: [
        { label: '建筑数量', value: playerBuildingCount, icon: '🏭' },
        { label: '商品种类', value: GOODS_BY_ID.size, icon: '📦' },
        { label: '建筑类型', value: BUILDINGS_BY_ID.size, icon: '🏗️' },
        { label: '库存价值', value: formatMoney(playerFinancialSnapshot.inventoryValue), icon: '📊' },
      ] as StatItem[],
      market: [
        { label: 'AI对手', value: aiCompanies, icon: '🤖' },
        { label: '市场交易量', value: formatNumber(totalVolume), icon: '📈' },
        { label: '活跃订单', value: (world as any).orders?.activeCount || 0, icon: '📝' },
        { label: '总公司数', value: world.companies.count, icon: '🏢' },
      ] as StatItem[],
    };
  }, [world, tick, playerFinancialSnapshot, getAllCompanyProfiles]);

  // 计算里程碑进度
  const milestones = useMemo((): MilestoneItem[] => {
    const netWorth = playerFinancialSnapshot.netWorth;
    const buildingCount = world ?
      Array.from({ length: world.buildings.count })
        .filter((_, i) => world.buildings.owners[i] === 0).length : 0;

    return [
      {
        id: 'first_million',
        title: '百万富翁',
        description: '净资产达到100万',
        icon: '💎',
        progress: netWorth,
        target: 1000000,
        achieved: netWorth >= 1000000,
      },
      {
        id: 'ten_buildings',
        title: '工业先驱',
        description: '建造10座建筑',
        icon: '🏭',
        progress: buildingCount,
        target: 10,
        achieved: playerBuildings >= 10,
      },
      {
        id: 'hundred_days',
        title: '坚持不懈',
        description: '游戏时间达到100天',
        icon: '📅',
        progress: Math.floor(tick / TICKS_PER_DAY),
        target: 100,
        achieved: tick >= 100 * TICKS_PER_DAY,
      },
      {
        id: 'ten_million',
        title: '商业巨头',
        description: '净资产达到1000万',
        icon: '👑',
        progress: netWorth,
        target: 10000000,
        achieved: netWorth >= 10000000,
      },
      {
        id: 'fifty_buildings',
        title: '帝国缔造者',
        description: '建造50座建筑',
        icon: '🏰',
        progress: buildingCount,
        target: 50,
        achieved: playerBuildings >= 50,
      },
      {
        id: 'year_one',
        title: '周年纪念',
        description: '游戏时间达到1年',
        icon: '🎂',
        progress: Math.floor(tick / TICKS_PER_DAY),
        target: TICKS_PER_YEAR,
        achieved: tick >= TICKS_PER_YEAR,
      },
    ];
  }, [playerFinancialSnapshot.netWorth, world, tick, playerBuildings]);

  // 统计里程碑完成情况
  const achievedCount = milestones.filter(m => m.achieved).length;

  if (!stats) {
    return (
      <Card variant="elevated" className={className}>
        <CardContent className="flex items-center justify-center h-40">
          <p className="text-text-tertiary">加载中...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 概览统计 */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📊 游戏统计
            <Badge variant="primary" size="sm">
              Day {Math.floor(tick / TICKS_PER_DAY) + 1}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 通用统计 */}
          <div>
            <h4 className="text-xs text-text-tertiary uppercase tracking-wide mb-2">总览</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.general.map((stat, i) => (
                <StatCard key={i} stat={stat} />
              ))}
            </div>
          </div>

          {/* 生产统计 */}
          <div>
            <h4 className="text-xs text-text-tertiary uppercase tracking-wide mb-2">生产</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.production.map((stat, i) => (
                <StatCard key={i} stat={stat} />
              ))}
            </div>
          </div>

          {/* 市场统计 */}
          <div>
            <h4 className="text-xs text-text-tertiary uppercase tracking-wide mb-2">市场</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {stats.market.map((stat, i) => (
                <StatCard key={i} stat={stat} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 里程碑 */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              🏆 里程碑
            </span>
            <Badge variant={achievedCount === milestones.length ? 'success' : 'primary'} size="sm">
              {achievedCount}/{milestones.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {milestones.map(milestone => (
              <MilestoneCard key={milestone.id} milestone={milestone} />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameStatisticsPanel;
