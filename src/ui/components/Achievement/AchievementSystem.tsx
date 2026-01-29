/**
 * AchievementSystem.tsx - 成就系统
 *
 * 提供游戏成就追踪、解锁和展示功能
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/design-system/components/Dialog';
import { Button } from '@/ui/design-system/components/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/design-system/components/Card';
import { Badge } from '@/ui/design-system/components/Badge';
import { ProgressBar } from '@/ui/design-system/components/ProgressBar';
import { Tabs, TabsList, TabsTrigger } from '@/ui/design-system/components/Tabs';
import { cn } from '@/ui/design-system/utils/cn';

// ==================== 成就类型定义 ====================

export type AchievementCategory = 
  | 'production'   // 生产相关
  | 'trading'      // 交易相关
  | 'finance'      // 财务相关
  | 'expansion'    // 扩张相关
  | 'special';     // 特殊成就

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  icon: string;
  // 解锁条件
  condition: {
    type: 'counter' | 'threshold' | 'milestone' | 'compound';
    target: number;
    metric?: string; // 用于追踪的指标名称
  };
  // 奖励（可选）
  reward?: {
    type: 'cash' | 'bonus' | 'title';
    value: number | string;
  };
  // 隐藏成就（解锁前不显示详情）
  hidden?: boolean;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  unlocked: boolean;
  unlockedAt?: number;
  notified?: boolean;
}

// ==================== 成就定义 ====================

const ACHIEVEMENTS: Achievement[] = [
  // 生产类成就
  {
    id: 'first_facility',
    name: '踏入商界',
    description: '建造你的第一座设施',
    category: 'production',
    rarity: 'common',
    icon: '🏭',
    condition: { type: 'threshold', target: 1, metric: 'totalFacilities' }
  },
  {
    id: 'production_empire',
    name: '生产帝国',
    description: '同时运营10座设施',
    category: 'production',
    rarity: 'uncommon',
    icon: '🏗️',
    condition: { type: 'threshold', target: 10, metric: 'totalFacilities' }
  },
  {
    id: 'industrial_titan',
    name: '工业巨头',
    description: '同时运营25座设施',
    category: 'production',
    rarity: 'rare',
    icon: '🔧',
    condition: { type: 'threshold', target: 25, metric: 'totalFacilities' }
  },
  {
    id: 'production_master',
    name: '生产大师',
    description: '总产量达到10,000单位',
    category: 'production',
    rarity: 'uncommon',
    icon: '📦',
    condition: { type: 'counter', target: 10000, metric: 'totalProduced' }
  },
  {
    id: 'mass_producer',
    name: '量产专家',
    description: '总产量达到100,000单位',
    category: 'production',
    rarity: 'rare',
    icon: '🚀',
    condition: { type: 'counter', target: 100000, metric: 'totalProduced' }
  },
  {
    id: 'diversified',
    name: '多元化经营',
    description: '生产5种不同类型的商品',
    category: 'production',
    rarity: 'uncommon',
    icon: '🌈',
    condition: { type: 'threshold', target: 5, metric: 'uniqueProducts' }
  },

  // 交易类成就
  {
    id: 'first_trade',
    name: '初次交易',
    description: '完成你的第一笔市场交易',
    category: 'trading',
    rarity: 'common',
    icon: '🤝',
    condition: { type: 'threshold', target: 1, metric: 'totalTrades' }
  },
  {
    id: 'active_trader',
    name: '活跃交易者',
    description: '完成100笔市场交易',
    category: 'trading',
    rarity: 'uncommon',
    icon: '📈',
    condition: { type: 'counter', target: 100, metric: 'totalTrades' }
  },
  {
    id: 'trading_mogul',
    name: '交易大亨',
    description: '完成1,000笔市场交易',
    category: 'trading',
    rarity: 'rare',
    icon: '💹',
    condition: { type: 'counter', target: 1000, metric: 'totalTrades' }
  },
  {
    id: 'profit_maker',
    name: '盈利高手',
    description: '单笔交易获利超过$10,000',
    category: 'trading',
    rarity: 'uncommon',
    icon: '💰',
    condition: { type: 'threshold', target: 10000, metric: 'maxTradeProfit' }
  },
  {
    id: 'market_whale',
    name: '市场巨鲸',
    description: '单日交易额超过$100,000',
    category: 'trading',
    rarity: 'rare',
    icon: '🐋',
    condition: { type: 'threshold', target: 100000, metric: 'dailyTradeVolume' }
  },

  // 财务类成就
  {
    id: 'first_million',
    name: '百万富翁',
    description: '资产净值达到$1,000,000',
    category: 'finance',
    rarity: 'uncommon',
    icon: '💵',
    condition: { type: 'threshold', target: 1000000, metric: 'netWorth' }
  },
  {
    id: 'ten_million',
    name: '千万富翁',
    description: '资产净值达到$10,000,000',
    category: 'finance',
    rarity: 'rare',
    icon: '💎',
    condition: { type: 'threshold', target: 10000000, metric: 'netWorth' }
  },
  {
    id: 'hundred_million',
    name: '亿万富翁',
    description: '资产净值达到$100,000,000',
    category: 'finance',
    rarity: 'epic',
    icon: '👑',
    condition: { type: 'threshold', target: 100000000, metric: 'netWorth' }
  },
  {
    id: 'profitable_quarter',
    name: '盈利季度',
    description: '连续30天保持盈利',
    category: 'finance',
    rarity: 'uncommon',
    icon: '📊',
    condition: { type: 'counter', target: 30, metric: 'profitableDays' }
  },
  {
    id: 'debt_free',
    name: '无债一身轻',
    description: '还清所有贷款',
    category: 'finance',
    rarity: 'common',
    icon: '🔓',
    condition: { type: 'milestone', target: 1, metric: 'debtFree' }
  },
  {
    id: 'investor',
    name: '投资者',
    description: '持有其他公司的股票',
    category: 'finance',
    rarity: 'uncommon',
    icon: '📋',
    condition: { type: 'threshold', target: 1, metric: 'stockHoldings' }
  },
  {
    id: 'portfolio_king',
    name: '投资组合之王',
    description: '持有10家公司的股票',
    category: 'finance',
    rarity: 'rare',
    icon: '📈',
    condition: { type: 'threshold', target: 10, metric: 'stockHoldings' }
  },

  // 扩张类成就
  {
    id: 'first_acquisition',
    name: '首次收购',
    description: '收购你的第一家公司',
    category: 'expansion',
    rarity: 'uncommon',
    icon: '🏢',
    condition: { type: 'threshold', target: 1, metric: 'acquisitions' }
  },
  {
    id: 'conglomerate',
    name: '企业集团',
    description: '收购5家公司',
    category: 'expansion',
    rarity: 'rare',
    icon: '🌐',
    condition: { type: 'counter', target: 5, metric: 'acquisitions' }
  },
  {
    id: 'market_dominator',
    name: '市场主导者',
    description: '在某一商品市场占有率超过50%',
    category: 'expansion',
    rarity: 'epic',
    icon: '⚡',
    condition: { type: 'threshold', target: 50, metric: 'maxMarketShare' }
  },
  {
    id: 'supply_chain_master',
    name: '供应链大师',
    description: '建立完整的垂直整合供应链',
    category: 'expansion',
    rarity: 'rare',
    icon: '🔗',
    condition: { type: 'milestone', target: 1, metric: 'verticalIntegration' }
  },

  // 特殊成就
  {
    id: 'survivor',
    name: '幸存者',
    description: '从破产边缘恢复过来',
    category: 'special',
    rarity: 'uncommon',
    icon: '🦅',
    condition: { type: 'milestone', target: 1, metric: 'bankruptcyRecovery' },
    hidden: true
  },
  {
    id: 'speed_runner',
    name: '速通玩家',
    description: '在100天内达到百万资产',
    category: 'special',
    rarity: 'epic',
    icon: '⏱️',
    condition: { type: 'milestone', target: 1, metric: 'speedRunMillion' },
    hidden: true
  },
  {
    id: 'perfect_timing',
    name: '完美时机',
    description: '在市场最低点买入并在最高点卖出',
    category: 'special',
    rarity: 'legendary',
    icon: '🎯',
    condition: { type: 'milestone', target: 1, metric: 'perfectTrade' },
    hidden: true
  },
  {
    id: 'long_player',
    name: '持久玩家',
    description: '游戏时间超过1000天',
    category: 'special',
    rarity: 'rare',
    icon: '📅',
    condition: { type: 'threshold', target: 1000, metric: 'gameDays' }
  },
  {
    id: 'tutorial_complete',
    name: '毕业生',
    description: '完成所有教程章节',
    category: 'special',
    rarity: 'common',
    icon: '🎓',
    condition: { type: 'milestone', target: 1, metric: 'tutorialComplete' }
  }
];

// ==================== 工具函数 ====================

const getRarityColor = (rarity: AchievementRarity): string => {
  switch (rarity) {
    case 'common': return 'bg-neutral-500 text-white';
    case 'uncommon': return 'bg-green-500 text-white';
    case 'rare': return 'bg-blue-500 text-white';
    case 'epic': return 'bg-purple-500 text-white';
    case 'legendary': return 'bg-amber-500 text-black';
    default: return 'bg-neutral-500 text-white';
  }
};

const getRarityLabel = (rarity: AchievementRarity): string => {
  switch (rarity) {
    case 'common': return '普通';
    case 'uncommon': return '稀有';
    case 'rare': return '珍贵';
    case 'epic': return '史诗';
    case 'legendary': return '传说';
    default: return '普通';
  }
};

const getCategoryLabel = (category: AchievementCategory): string => {
  switch (category) {
    case 'production': return '生产';
    case 'trading': return '交易';
    case 'finance': return '财务';
    case 'expansion': return '扩张';
    case 'special': return '特殊';
    default: return category;
  }
};

const getCategoryIcon = (category: AchievementCategory): string => {
  switch (category) {
    case 'production': return '🏭';
    case 'trading': return '📈';
    case 'finance': return '💰';
    case 'expansion': return '🌐';
    case 'special': return '⭐';
    default: return '📋';
  }
};

// ==================== Context ====================

interface AchievementContextType {
  achievements: Achievement[];
  progress: Map<string, AchievementProgress>;
  unlockedCount: number;
  totalCount: number;
  recentUnlocks: Achievement[];
  checkAchievements: () => void;
  getProgress: (achievementId: string) => AchievementProgress | undefined;
  isUnlocked: (achievementId: string) => boolean;
  showAchievementList: () => void;
  dismissNotification: (achievementId: string) => void;
}

const AchievementContext = createContext<AchievementContextType | null>(null);

export const useAchievements = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementProvider');
  }
  return context;
};

// ==================== Provider ====================

const STORAGE_KEY = 'scc_achievements';

export const AchievementProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<Map<string, AchievementProgress>>(new Map());
  const [showList, setShowList] = useState(false);
  const [pendingNotifications, setPendingNotifications] = useState<Achievement[]>([]);
  const [recentUnlocks, setRecentUnlocks] = useState<Achievement[]>([]);

  // 从游戏状态获取指标
  const tick = useGameStore((state) => state.tick);
  const playerCash = useGameStore((state) => state.playerCash);
  const playerAssets = useGameStore((state) => state.playerAssets);
  const playerBuildings = useGameStore((state) => state.playerBuildings);
  const getPlayerLoans = useGameStore((state) => state.getPlayerLoans);
  const getPlayerHoldings = useGameStore((state) => state.getPlayerHoldings);
  const getWorld = useGameStore((state) => state.getWorld);

  // 从localStorage加载进度
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const progressMap = new Map<string, AchievementProgress>();
        Object.entries(parsed).forEach(([key, value]) => {
          progressMap.set(key, value as AchievementProgress);
        });
        setProgress(progressMap);
      } catch (e) {
        console.error('Failed to load achievement progress:', e);
      }
    }
  }, []);

  // 保存进度到localStorage
  const saveProgress = useCallback((newProgress: Map<string, AchievementProgress>) => {
    const obj: Record<string, AchievementProgress> = {};
    newProgress.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  }, []);

  // 计算当前指标值
  const getMetricValue = useCallback((metric: string): number => {
    const world = getWorld();
    
    switch (metric) {
      case 'totalFacilities':
        return playerBuildings;
      case 'totalProduced':
        // 累计生产量 - 从玩家库存估算
        if (!world) return 0;
        let totalProduced = 0;
        const GOODS_COUNT = 128;
        for (let i = 0; i < GOODS_COUNT; i++) {
          totalProduced += world.companies.inventories[0 * GOODS_COUNT + i] || 0;
        }
        return totalProduced;
      case 'uniqueProducts':
        // 独特产品种类
        if (!world) return 0;
        let uniqueCount = 0;
        const GOODS_COUNT2 = 128;
        for (let i = 0; i < GOODS_COUNT2; i++) {
          if ((world.companies.inventories[0 * GOODS_COUNT2 + i] || 0) > 0) {
            uniqueCount++;
          }
        }
        return uniqueCount;
      case 'totalTrades':
        // 估算交易次数（基于tick数）
        return Math.floor(tick / 10);
      case 'maxTradeProfit':
        return 0; // 需要追踪系统
      case 'dailyTradeVolume':
        return 0; // 需要追踪系统
      case 'netWorth':
        return playerCash + playerAssets;
      case 'profitableDays':
        return 0; // 需要追踪系统
      case 'debtFree':
        const loans = getPlayerLoans();
        return loans.length === 0 ? 1 : 0;
      case 'stockHoldings':
        const holdings = getPlayerHoldings();
        return holdings.length;
      case 'acquisitions':
        return 0; // 需要追踪系统
      case 'maxMarketShare':
        return 0; // 需要追踪系统
      case 'verticalIntegration':
        return 0; // 需要追踪系统
      case 'bankruptcyRecovery':
        return 0; // 需要追踪系统
      case 'speedRunMillion':
        // 100天内达到百万资产
        const gameDays = Math.floor(tick / 24);
        if (gameDays <= 100 && (playerCash + playerAssets) >= 1000000) {
          return 1;
        }
        return 0;
      case 'perfectTrade':
        return 0; // 需要追踪系统
      case 'gameDays':
        return Math.floor(tick / 24);
      case 'tutorialComplete':
        const tutorialProgress = localStorage.getItem('scc_tutorial');
        if (tutorialProgress) {
          try {
            const parsed = JSON.parse(tutorialProgress);
            const allComplete = parsed.completedChapters?.length >= 5;
            return allComplete ? 1 : 0;
          } catch {
            return 0;
          }
        }
        return 0;
      default:
        return 0;
    }
  }, [tick, playerCash, playerAssets, playerBuildings, getPlayerLoans, getPlayerHoldings, getWorld]);

  // 检查成就解锁
  const checkAchievements = useCallback(() => {
    const newProgress = new Map(progress);
    const newUnlocks: Achievement[] = [];

    ACHIEVEMENTS.forEach((achievement) => {
      const existingProgress = progress.get(achievement.id);
      
      // 已经解锁的跳过
      if (existingProgress?.unlocked) return;

      const metric = achievement.condition.metric;
      if (!metric) return;

      const currentValue = getMetricValue(metric);
      const target = achievement.condition.target;

      // 更新进度
      const newAchievementProgress: AchievementProgress = {
        achievementId: achievement.id,
        currentValue,
        unlocked: false,
        notified: existingProgress?.notified
      };

      // 检查是否达成
      let achieved = false;
      switch (achievement.condition.type) {
        case 'threshold':
        case 'milestone':
          achieved = currentValue >= target;
          break;
        case 'counter':
          achieved = currentValue >= target;
          break;
        case 'compound':
          // 复合条件需要特殊处理
          achieved = currentValue >= target;
          break;
      }

      if (achieved) {
        newAchievementProgress.unlocked = true;
        newAchievementProgress.unlockedAt = Date.now();
        newAchievementProgress.notified = false;
        newUnlocks.push(achievement);
      }

      newProgress.set(achievement.id, newAchievementProgress);
    });

    if (newUnlocks.length > 0) {
      setRecentUnlocks(prev => [...newUnlocks, ...prev].slice(0, 5));
      setPendingNotifications(prev => [...prev, ...newUnlocks]);
    }

    setProgress(newProgress);
    saveProgress(newProgress);
  }, [progress, getMetricValue, saveProgress]);

  // 定期检查成就
  useEffect(() => {
    const interval = setInterval(checkAchievements, 5000);
    return () => clearInterval(interval);
  }, [checkAchievements]);

  // 初始检查
  useEffect(() => {
    checkAchievements();
  }, []);

  const getProgress = useCallback((achievementId: string) => {
    return progress.get(achievementId);
  }, [progress]);

  const isUnlocked = useCallback((achievementId: string) => {
    return progress.get(achievementId)?.unlocked || false;
  }, [progress]);

  const dismissNotification = useCallback((achievementId: string) => {
    setPendingNotifications(prev => prev.filter(a => a.id !== achievementId));
    setProgress(prev => {
      const newProgress = new Map(prev);
      const existing = newProgress.get(achievementId);
      if (existing) {
        newProgress.set(achievementId, { ...existing, notified: true });
      }
      saveProgress(newProgress);
      return newProgress;
    });
  }, [saveProgress]);

  const unlockedCount = useMemo(() => {
    let count = 0;
    progress.forEach((p) => {
      if (p.unlocked) count++;
    });
    return count;
  }, [progress]);

  const value: AchievementContextType = {
    achievements: ACHIEVEMENTS,
    progress,
    unlockedCount,
    totalCount: ACHIEVEMENTS.length,
    recentUnlocks,
    checkAchievements,
    getProgress,
    isUnlocked,
    showAchievementList: () => setShowList(true),
    dismissNotification
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
      
      {/* 成就列表对话框 */}
      <AchievementListDialog open={showList} onOpenChange={setShowList} />
      
      {/* 成就解锁通知 */}
      {pendingNotifications.length > 0 && (
        <AchievementNotification 
          achievement={pendingNotifications[0]} 
          onDismiss={() => dismissNotification(pendingNotifications[0].id)}
        />
      )}
    </AchievementContext.Provider>
  );
};

// ==================== 成就通知组件 ====================

interface AchievementNotificationProps {
  achievement: Achievement;
  onDismiss: () => void;
}

const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  achievement,
  onDismiss
}) => {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <Card className="w-80 bg-surface/95 backdrop-blur border-2 border-brand shadow-2xl">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-4xl">{achievement.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-brand font-semibold">🏆 成就解锁！</span>
                <Badge className={cn('text-xs', getRarityColor(achievement.rarity))}>
                  {getRarityLabel(achievement.rarity)}
                </Badge>
              </div>
              <h4 className="font-bold text-text-primary truncate">{achievement.name}</h4>
              <p className="text-sm text-text-secondary line-clamp-2">{achievement.description}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="shrink-0"
            >
              ✕
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== 成就列表对话框 ====================

interface AchievementListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AchievementListDialog: React.FC<AchievementListDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { achievements, progress, unlockedCount, totalCount } = useAchievements();
  const [activeCategory, setActiveCategory] = useState<AchievementCategory | 'all'>('all');

  const filteredAchievements = useMemo(() => {
    if (activeCategory === 'all') return achievements;
    return achievements.filter(a => a.category === activeCategory);
  }, [achievements, activeCategory]);

  const categories: Array<AchievementCategory | 'all'> = ['all', 'production', 'trading', 'finance', 'expansion', 'special'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            🏆 成就
            <Badge variant="outline">{unlockedCount} / {totalCount}</Badge>
          </DialogTitle>
          <DialogDescription>
            完成成就解锁特殊奖励和称号
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 进度条 */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-text-secondary">总进度</span>
              <span className="text-text-primary font-medium">
                {Math.round((unlockedCount / totalCount) * 100)}%
              </span>
            </div>
            <ProgressBar value={(unlockedCount / totalCount) * 100} max={100} size="sm" />
          </div>

          {/* 分类标签 */}
          <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as AchievementCategory | 'all')}>
            <TabsList className="mb-4 flex-wrap">
              <TabsTrigger value="all">全部</TabsTrigger>
              {categories.slice(1).map((cat) => (
                <TabsTrigger key={cat} value={cat}>
                  {getCategoryIcon(cat as AchievementCategory)} {getCategoryLabel(cat as AchievementCategory)}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* 成就列表 */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredAchievements.map((achievement) => {
                const achievementProgress = progress.get(achievement.id);
                const isUnlocked = achievementProgress?.unlocked || false;
                const currentValue = achievementProgress?.currentValue || 0;
                const target = achievement.condition.target;
                const progressPercent = Math.min((currentValue / target) * 100, 100);
                const isHidden = achievement.hidden && !isUnlocked;

                return (
                  <Card 
                    key={achievement.id}
                    className={cn(
                      'transition-all',
                      isUnlocked 
                        ? 'bg-surface border-brand/30' 
                        : 'bg-surface/50 opacity-70'
                    )}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'text-3xl w-12 h-12 flex items-center justify-center rounded-lg',
                          isUnlocked ? 'bg-brand/10' : 'bg-neutral-800'
                        )}>
                          {isHidden ? '❓' : achievement.icon}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-text-primary">
                              {isHidden ? '???' : achievement.name}
                            </span>
                            <Badge className={cn('text-xs', getRarityColor(achievement.rarity))}>
                              {getRarityLabel(achievement.rarity)}
                            </Badge>
                            {isUnlocked && (
                              <Badge variant="outline" className="text-xs text-brand border-brand">
                                ✓ 已解锁
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-text-secondary mb-2">
                            {isHidden ? '完成特定条件解锁此成就' : achievement.description}
                          </p>
                          
                          {!isUnlocked && !isHidden && (
                            <div className="flex items-center gap-2">
                              <ProgressBar value={progressPercent} max={100} size="xs" className="flex-1" />
                              <span className="text-xs text-text-secondary whitespace-nowrap">
                                {currentValue.toLocaleString()} / {target.toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </Tabs>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ==================== 成就面板（用于设置页面） ====================

export const AchievementPanel: React.FC = () => {
  const { achievements, progress, unlockedCount, totalCount, showAchievementList, recentUnlocks } = useAchievements();

  // 按稀有度统计
  const rarityStats = useMemo(() => {
    const stats: Record<AchievementRarity, { total: number; unlocked: number }> = {
      common: { total: 0, unlocked: 0 },
      uncommon: { total: 0, unlocked: 0 },
      rare: { total: 0, unlocked: 0 },
      epic: { total: 0, unlocked: 0 },
      legendary: { total: 0, unlocked: 0 }
    };

    achievements.forEach((a) => {
      stats[a.rarity].total++;
      if (progress.get(a.id)?.unlocked) {
        stats[a.rarity].unlocked++;
      }
    });

    return stats;
  }, [achievements, progress]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>🏆 成就</span>
          <Badge variant="outline">{unlockedCount} / {totalCount}</Badge>
        </CardTitle>
        <CardDescription>
          完成挑战解锁成就
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 总进度 */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">总完成度</span>
            <span className="text-text-primary font-medium">
              {Math.round((unlockedCount / totalCount) * 100)}%
            </span>
          </div>
          <ProgressBar value={(unlockedCount / totalCount) * 100} max={100} size="sm" />
        </div>

        {/* 稀有度统计 */}
        <div className="grid grid-cols-5 gap-2">
          {Object.entries(rarityStats).map(([rarity, stats]) => (
            <div key={rarity} className="text-center">
              <Badge className={cn('text-xs mb-1', getRarityColor(rarity as AchievementRarity))}>
                {getRarityLabel(rarity as AchievementRarity)}
              </Badge>
              <div className="text-sm text-text-secondary">
                {stats.unlocked}/{stats.total}
              </div>
            </div>
          ))}
        </div>

        {/* 最近解锁 */}
        {recentUnlocks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-text-secondary mb-2">最近解锁</h4>
            <div className="space-y-1">
              {recentUnlocks.slice(0, 3).map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-2 text-sm">
                  <span>{achievement.icon}</span>
                  <span className="text-text-primary">{achievement.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Button onClick={showAchievementList} className="w-full">
          查看全部成就
        </Button>
      </CardContent>
    </Card>
  );
};

// ==================== 成就迷你展示（用于Header） ====================

export const AchievementMini: React.FC = () => {
  const { unlockedCount, totalCount, showAchievementList } = useAchievements();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={showAchievementList}
      className="gap-1"
    >
      <span>🏆</span>
      <span className="text-sm">{unlockedCount}/{totalCount}</span>
    </Button>
  );
};