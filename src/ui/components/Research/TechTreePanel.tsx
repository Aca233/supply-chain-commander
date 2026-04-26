/**
 * 科技树面板组件
 * 展示科技研发树和研发进度
 */

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import {
  ALL_TECHNOLOGIES,
  Technology,
  TechnologyCategory,
  TECHNOLOGIES_BY_CATEGORY,
  getResearchState,
  canResearchTech,
  getCurrentResearch,
  getResearchQueue,
  getAvailableTechs,
  getCategoryName,
  getCategoryIcon,
  TECHNOLOGIES_BY_ID,
} from '@/core/research/TechnologySystem';
import {
  Button,
  Card,
  Badge,
  ProgressBar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/ui/design-system';
import { formatRelativeTime } from '@/ui/utils/format';

interface TechTreePanelProps {
  companyId?: number;
}

export const TechTreePanel: React.FC<TechTreePanelProps> = ({ companyId = 0 }) => {
  const { playerCash, tick } = useGameStore();
  const [selectedCategory, setSelectedCategory] = useState<TechnologyCategory | 'all'>('all');
  const [selectedTech, setSelectedTech] = useState<Technology | null>(null);
  const [showResearchDialog, setShowResearchDialog] = useState(false);

  const researchState = useMemo(() => getResearchState(companyId), [companyId, tick]);
  const currentResearch = useMemo(() => getCurrentResearch(companyId), [companyId, tick]);
  const researchQueue = useMemo(() => getResearchQueue(companyId), [companyId, tick]);
  const availableTechs = useMemo(() => getAvailableTechs(companyId), [companyId, tick]);

  const filteredTechs = useMemo(() => {
    if (selectedCategory === 'all') {
      return ALL_TECHNOLOGIES;
    }
    return TECHNOLOGIES_BY_CATEGORY.get(selectedCategory) || [];
  }, [selectedCategory]);

  const getTechStatus = (tech: Technology): 'researched' | 'researching' | 'queued' | 'available' | 'locked' => {
    if (researchState.researchedTechs.has(tech.id)) return 'researched';
    if (researchState.currentResearchId === tech.id) return 'researching';
    if (researchState.researchQueue.includes(tech.id)) return 'queued';
    
    // 检查前置科技
    for (const prereqId of tech.prerequisites) {
      if (!researchState.researchedTechs.has(prereqId)) {
        return 'locked';
      }
    }
    return 'available';
  };

  const formatTime = (ticks: number) => {
    return formatRelativeTime(ticks);
  };

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const categories: Array<{ key: TechnologyCategory | 'all'; name: string; icon: string }> = [
    { key: 'all', name: '全部', icon: '📚' },
    { key: 'production', name: '生产', icon: '🏭' },
    { key: 'logistics', name: '物流', icon: '🚚' },
    { key: 'automation', name: '自动化', icon: '🤖' },
    { key: 'quality', name: '品质', icon: '⭐' },
    { key: 'market', name: '市场', icon: '📈' },
    { key: 'finance', name: '金融', icon: '💰' },
  ];

  const statusConfig = {
    researched: { color: 'var(--success)', badge: 'success' as const, text: '已研发' },
    researching: { color: 'var(--primary)', badge: 'primary' as const, text: '研发中' },
    queued: { color: 'var(--warning)', badge: 'warning' as const, text: '队列中' },
    available: { color: 'var(--text-primary)', badge: 'outline' as const, text: '可研发' },
    locked: { color: 'var(--text-muted)', badge: 'default' as const, text: '未解锁' },
  };

  return (
    <div className="h-full flex flex-col">
      {/* 当前研发进度 */}
      {currentResearch.tech && (
        <Card variant="game" padding="md" className="mb-4 mx-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getCategoryIcon(currentResearch.tech.category)}</span>
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {currentResearch.tech.name}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  剩余 {formatTime(currentResearch.remainingTicks)}
                </div>
              </div>
            </div>
            <Badge variant="primary">研发中</Badge>
          </div>
          <ProgressBar
            value={currentResearch.progress * 100}
            max={100}
            size="md"
            color="info"
            showValue
          />
        </Card>
      )}

      {/* 研发队列 */}
      {researchQueue.length > 0 && (
        <div className="px-4 mb-4">
          <div className="text-xs text-[var(--text-muted)] mb-2">研发队列 ({researchQueue.length})</div>
          <div className="flex gap-2 flex-wrap">
            {researchQueue.map((tech, idx) => (
              <Badge key={tech.id} variant="outline" size="sm">
                {idx + 1}. {tech.name}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* 分类标签 */}
      <div className="px-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <Button
              key={cat.key}
              variant={selectedCategory === cat.key ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory(cat.key)}
            >
              <span className="mr-1">{cat.icon}</span>
              {cat.name}
            </Button>
          ))}
        </div>
      </div>

      {/* 科技列表 */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="grid grid-cols-1 gap-3">
          {filteredTechs.map((tech) => {
            const status = getTechStatus(tech);
            const config = statusConfig[status];
            const isLocked = status === 'locked';
            const isResearched = status === 'researched';

            return (
              <Card
                key={tech.id}
                variant={isResearched ? 'default' : 'elevated'}
                status={isResearched ? 'success' : undefined}
                padding="md"
                interactive={!isLocked && !isResearched}
                onClick={() => {
                  if (!isLocked && !isResearched) {
                    setSelectedTech(tech);
                    setShowResearchDialog(true);
                  }
                }}
                className={isLocked ? 'opacity-50' : ''}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                      style={{ backgroundColor: 'var(--bg-muted)' }}
                    >
                      {getCategoryIcon(tech.category)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-[var(--text-primary)]">
                          {tech.name}
                        </span>
                        <Badge variant={config.badge} size="sm">
                          {config.text}
                        </Badge>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mb-2">
                        {tech.description}
                      </div>
                      
                      {/* 效果预览 */}
                      <div className="flex flex-wrap gap-1">
                        {tech.effects.productionBonus && (
                          <Badge variant="outline" size="sm">
                            产量 +{(tech.effects.productionBonus * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {tech.effects.efficiencyBonus && (
                          <Badge variant="outline" size="sm">
                            效率 +{(tech.effects.efficiencyBonus * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {tech.effects.qualityBonus && (
                          <Badge variant="outline" size="sm">
                            品质 +{(tech.effects.qualityBonus * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {tech.effects.costReduction && (
                          <Badge variant="outline" size="sm">
                            成本 -{(tech.effects.costReduction * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {tech.effects.tradingBonus && (
                          <Badge variant="outline" size="sm">
                            交易 +{(tech.effects.tradingBonus * 100).toFixed(0)}%
                          </Badge>
                        )}
                        {tech.effects.storageBonus && (
                          <Badge variant="outline" size="sm">
                            存储 +{(tech.effects.storageBonus * 100).toFixed(0)}%
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-xs text-[var(--text-muted)]">
                      {formatMoney(tech.researchCost)}
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {formatTime(tech.researchTime)}
                    </div>
                  </div>
                </div>

                {/* 前置科技 */}
                {tech.prerequisites.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-[var(--border-muted)]">
                    <div className="text-[10px] text-[var(--text-muted)]">
                      前置科技: {tech.prerequisites.map((id) => {
                        const prereq = TECHNOLOGIES_BY_ID.get(id);
                        const isComplete = researchState.researchedTechs.has(id);
                        return (
                          <span
                            key={id}
                            className={isComplete ? 'text-[var(--success)]' : 'text-[var(--warning)]'}
                          >
                            {prereq?.name || `#${id}`}
                            {isComplete && ' ✓'}
                          </span>
                        );
                      }).reduce((prev, curr, idx) => (
                        <>{prev}{idx > 0 && ', '}{curr}</>
                      ), <></>)}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* 研发确认弹窗 */}
      <TechResearchDialog
        tech={selectedTech}
        open={showResearchDialog}
        onOpenChange={setShowResearchDialog}
        companyId={companyId}
      />
    </div>
  );
};

// ==================== 研发确认弹窗 ====================

interface TechResearchDialogProps {
  tech: Technology | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
}

const TechResearchDialog: React.FC<TechResearchDialogProps> = ({
  tech,
  open,
  onOpenChange,
  companyId,
}) => {
  const { playerCash, addNotification } = useGameStore();

  if (!tech) return null;

  const checkResult = canResearchTech(companyId, tech.id);
  const canAfford = playerCash >= tech.researchCost;

  const handleStartResearch = () => {
    // 这里需要连接到游戏store来扣费和开始研发
    // 暂时只显示通知
    if (canAfford && checkResult.canResearch) {
      addNotification('success', `开始研发「${tech.name}」`);
      onOpenChange(false);
    } else {
      addNotification('error', checkResult.reason || '无法开始研发');
    }
  };

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const formatTime = (ticks: number) => {
    return formatRelativeTime(ticks);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" variant="game">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{getCategoryIcon(tech.category)}</span>
            研发 {tech.name}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">{tech.description}</p>

          {/* 研发费用 */}
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3">💰 研发费用</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">研发成本</span>
                <span className={canAfford ? 'text-[var(--text-primary)]' : 'text-[var(--error)]'}>
                  {formatMoney(tech.researchCost)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">研发时间</span>
                <span className="text-[var(--text-primary)]">{formatTime(tech.researchTime)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[var(--border-muted)]">
                <span className="text-[var(--text-muted)]">当前余额</span>
                <span className="text-[var(--text-muted)]">{formatMoney(playerCash)}</span>
              </div>
            </div>
          </Card>

          {/* 科技效果 */}
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3">⚡ 科技效果</h4>
            <div className="space-y-2 text-sm">
              {tech.effects.productionBonus && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">生产加成</span>
                  <span className="text-[var(--success)]">+{(tech.effects.productionBonus * 100).toFixed(0)}%</span>
                </div>
              )}
              {tech.effects.efficiencyBonus && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">效率加成</span>
                  <span className="text-[var(--success)]">+{(tech.effects.efficiencyBonus * 100).toFixed(0)}%</span>
                </div>
              )}
              {tech.effects.qualityBonus && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">品质加成</span>
                  <span className="text-[var(--success)]">+{(tech.effects.qualityBonus * 100).toFixed(0)}%</span>
                </div>
              )}
              {tech.effects.costReduction && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">成本降低</span>
                  <span className="text-[var(--success)]">-{(tech.effects.costReduction * 100).toFixed(0)}%</span>
                </div>
              )}
              {tech.effects.tradingBonus && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">交易加成</span>
                  <span className="text-[var(--success)]">+{(tech.effects.tradingBonus * 100).toFixed(0)}%</span>
                </div>
              )}
              {tech.effects.storageBonus && (
                <div className="flex justify-between">
                  <span className="text-[var(--text-muted)]">存储加成</span>
                  <span className="text-[var(--success)]">+{(tech.effects.storageBonus * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </Card>

          {/* 解锁内容 */}
          {(tech.unlocks.buildings?.length || tech.unlocks.recipes?.length || tech.unlocks.features?.length) && (
            <Card variant="elevated" padding="md">
              <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3">🔓 解锁内容</h4>
              <div className="space-y-1 text-sm text-[var(--text-muted)]">
                {tech.unlocks.buildings && tech.unlocks.buildings.length > 0 && (
                  <div>🏭 解锁 {tech.unlocks.buildings.length} 个新建筑</div>
                )}
                {tech.unlocks.recipes && tech.unlocks.recipes.length > 0 && (
                  <div>📜 解锁 {tech.unlocks.recipes.length} 个新配方</div>
                )}
                {tech.unlocks.productionMethods && tech.unlocks.productionMethods.length > 0 && (
                  <div>⚙️ 解锁 {tech.unlocks.productionMethods.length} 个生产方式</div>
                )}
                {tech.unlocks.subsidiaries && tech.unlocks.subsidiaries.length > 0 && (
                  <div>🏗️ 解锁 {tech.unlocks.subsidiaries.length} 个附属设施</div>
                )}
                {tech.unlocks.features && tech.unlocks.features.length > 0 && (
                  <div>✨ 解锁新功能</div>
                )}
              </div>
            </Card>
          )}

          {/* 警告信息 */}
          {!checkResult.canResearch && (
            <Card variant="default" status="error" padding="sm">
              <span className="text-xs text-[var(--error)]">❌ {checkResult.reason}</span>
            </Card>
          )}
        </DialogBody>
        <DialogFooter>
          <div className="flex items-center gap-2">
            <Badge variant={canAfford ? 'success' : 'error'}>
              {canAfford ? '资金充足' : '资金不足'}
            </Badge>
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button
              variant="gradient"
              onClick={handleStartResearch}
              disabled={!canAfford || !checkResult.canResearch}
            >
              🔬 开始研发
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TechTreePanel;
