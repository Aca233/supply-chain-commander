/**
 * 建造队列面板
 * 使用设计系统组件重构
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { formatConstructionTime } from '@/core/construction';
import { GoodsIcon } from '@/ui/components/Icons';

// 设计系统组件
import { Card, Badge, Button, ProgressBar, Tabs, TabsList, TabsTrigger } from '@/ui/design-system';

interface MaterialStatus {
  goodsId: number;
  goodsName: string;
  requiredAmount: number;
  currentAmount: number;
  isSufficient: boolean;
}

interface QueueConstructionTask {
  taskId: number;
  queueIdx: number;
  buildingTypeId: number;
  buildingName: string;
  targetLevel: number;
  status: number;
  progress: number;
  progressTicks: number;
  requiredTicks: number;
  taskType: number;
  speedBoost: number;
  reservedMaterials: Array<{ goodsId: number; amount: number }>;
  materialsStatus?: MaterialStatus[];
  allMaterialsReady?: boolean;
}

interface QueueDemolitionTask {
  taskId: number;
  queueIdx: number;
  buildingId: number;
  buildingTypeId: number;
  buildingName: string;
  buildingLevel: number;
  status: number;
  progress: number;
  progressTicks: number;
  requiredTicks: number;
  recoveredCash: number;
  recoveredMaterials: Array<{ goodsId: number; amount: number }>;
}

interface ConstructionQueuePanelProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

// 获取状态配置
const getStatusConfig = (status: number) => {
  const configs: Record<number, { variant: 'outline' | 'info' | 'warning' | 'success' | 'error'; text: string }> = {
    0: { variant: 'outline', text: '等待中' },
    1: { variant: 'info', text: '建造中' },
    2: { variant: 'success', text: '已完成' },
    3: { variant: 'error', text: '已取消' },
  };
  return configs[status] || { variant: 'outline', text: '未知' };
};

const getDemolitionStatusConfig = (status: number) => {
  const configs: Record<number, { variant: 'outline' | 'warning' | 'success' | 'error'; text: string }> = {
    0: { variant: 'outline', text: '等待中' },
    1: { variant: 'warning', text: '拆除中' },
    2: { variant: 'success', text: '已完成' },
    3: { variant: 'error', text: '已取消' },
  };
  return configs[status] || { variant: 'outline', text: '未知' };
};

// 建造任务项
const ConstructionTaskItem: React.FC<{
  task: QueueConstructionTask;
  onCancel: () => void;
  onMaterialClick: (goodsId: number) => void;
}> = ({ task, onCancel, onMaterialClick }) => {
  const building = BUILDINGS_BY_ID.get(task.buildingTypeId);
  const progressPercent = task.progress * 100;
  const estimatedTime = Math.max(0, task.requiredTicks - task.progressTicks);
  const isQueued = task.status === 0;
  const isBuilding = task.status === 1;
  const canCancel = isQueued || isBuilding;
  const statusConfig = getStatusConfig(task.status);

  return (
    <Card variant="elevated" padding="sm" className="border-l-2 border-l-blue-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏗️</span>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {task.buildingName || building?.name || '未知建筑'}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              {task.taskType === 0 ? '新建' : `升级到 Lv.${task.targetLevel}`}
            </div>
          </div>
        </div>
        <Badge variant={statusConfig.variant} size="sm">{statusConfig.text}</Badge>
      </div>

      {task.status === 0 && task.allMaterialsReady !== undefined && (
        <Badge
          variant={task.allMaterialsReady ? 'success' : 'warning'}
          size="sm"
          className="mb-2"
        >
          {task.allMaterialsReady ? '✅ 材料充足' : '⏳ 等待材料'}
        </Badge>
      )}

      <ProgressBar
        value={progressPercent}
        max={100}
        size="sm"
        color={task.status === 1 ? 'info' : task.status === 2 ? 'success' : 'brand'}
        className="mb-2"
      />

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
        <span>{progressPercent.toFixed(1)}%</span>
        <span>剩余 {formatConstructionTime(estimatedTime)}</span>
      </div>

      {task.speedBoost > 1 && (
        <Badge variant="warning" size="sm" className="mb-2">
          ⚡ 加速 {task.speedBoost.toFixed(1)}x
        </Badge>
      )}

      {task.materialsStatus && task.materialsStatus.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-[var(--text-muted)] mb-1">
            所需材料 ({task.materialsStatus.length}种):
          </div>
          <div className="space-y-1 max-h-24 overflow-y-auto scrollbar-thin">
            {task.materialsStatus.map((mat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs cursor-pointer hover:bg-[var(--bg-muted)] rounded px-1.5 py-1 transition-colors"
                onClick={() => onMaterialClick(mat.goodsId)}
              >
                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                  <GoodsIcon goodsId={mat.goodsId} size={14} autoColor />
                  <span className="text-[var(--text-secondary)] truncate hover:text-[var(--info)]">
                    {mat.goodsName}
                  </span>
                </div>
                <span className={mat.isSufficient ? 'text-[var(--success)]' : mat.currentAmount / mat.requiredAmount >= 0.5 ? 'text-[var(--warning)]' : 'text-[var(--error)]'}>
                  {mat.currentAmount.toFixed(0)} / {mat.requiredAmount.toFixed(0)}
                  {mat.isSufficient && ' ✓'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {canCancel && (
        <Button
          variant="ghost"
          size="xs"
          fullWidth
          onClick={onCancel}
          className="text-[var(--error)] hover:bg-red-500/10"
        >
          ❌ 取消
        </Button>
      )}
    </Card>
  );
};

// 拆除任务项
const DemolitionTaskItem: React.FC<{
  task: QueueDemolitionTask;
  onCancel: () => void;
}> = ({ task, onCancel }) => {
  const building = BUILDINGS_BY_ID.get(task.buildingTypeId);
  const progressPercent = task.progress * 100;
  const remainingTicks = Math.max(0, task.requiredTicks - task.progressTicks);
  const isDemolishing = task.status === 1;
  const isQueued = task.status === 0;
  const canCancel = isQueued || isDemolishing;
  const statusConfig = getDemolitionStatusConfig(task.status);

  return (
    <Card variant="elevated" padding="sm" status="warning" className="border-l-2 border-l-orange-500">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏚️</span>
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              {task.buildingName || building?.name || '未知建筑'}
            </div>
            <div className="text-xs text-[var(--text-muted)]">
              Lv.{task.buildingLevel} · 拆除中
            </div>
          </div>
        </div>
        <Badge variant={statusConfig.variant} size="sm">{statusConfig.text}</Badge>
      </div>

      <ProgressBar
        value={progressPercent}
        max={100}
        size="sm"
        color="warning"
        className="mb-2"
      />

      <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-2">
        <span>{progressPercent.toFixed(1)}%</span>
        <span>剩余 {formatConstructionTime(remainingTicks)}</span>
      </div>

      <div className="mb-2 text-xs">
        <div className="flex justify-between">
          <span className="text-[var(--text-muted)]">预计现金回收:</span>
          <span className="text-[var(--success)]">¥{task.recoveredCash.toLocaleString()}</span>
        </div>
        {task.recoveredMaterials && task.recoveredMaterials.length > 0 && (
          <div className="mt-1">
            <span className="text-[var(--text-muted)]">回收材料:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {task.recoveredMaterials.slice(0, 4).map((mat, idx) => {
                const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
                return (
                  <Badge key={idx} variant="outline" size="sm" title={`${goods?.name}: ${mat.amount}`}>
                    📦 {mat.amount}
                  </Badge>
                );
              })}
              {task.recoveredMaterials.length > 4 && (
                <span className="text-[var(--text-muted)] text-xs">
                  +{task.recoveredMaterials.length - 4}种
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {canCancel && (
        <Button
          variant="ghost"
          size="xs"
          fullWidth
          onClick={onCancel}
          className="text-[var(--error)] hover:bg-red-500/10"
        >
          ❌ 取消拆除
        </Button>
      )}
    </Card>
  );
};

// 主面板
export const ConstructionQueuePanel: React.FC<ConstructionQueuePanelProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const {
    getConstructionQueue,
    getDemolitionQueue,
    cancelPlayerConstruction,
    cancelPlayerDemolition,
    setCurrentPage,
    setSelectedGoods,
    tick
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'construction' | 'demolition'>('construction');

  const constructionQueue = useMemo((): QueueConstructionTask[] => {
    return getConstructionQueue?.() || [];
  }, [getConstructionQueue, tick]);

  const demolitionQueue = useMemo((): QueueDemolitionTask[] => {
    return getDemolitionQueue?.() || [];
  }, [getDemolitionQueue, tick]);

  const constructionCount = constructionQueue.filter(t => t.status !== 2 && t.status !== 3).length;
  const demolitionCount = demolitionQueue.filter(t => t.status !== 2 && t.status !== 3).length;
  const totalCount = constructionCount + demolitionCount;

  const handleCancelConstruction = useCallback((taskId: number) => {
    if (confirm('确定要取消这个建造任务吗？部分材料将会损失。')) {
      cancelPlayerConstruction?.(taskId);
    }
  }, [cancelPlayerConstruction]);

  const handleCancelDemolition = useCallback((taskId: number) => {
    if (confirm('确定要取消拆除吗？')) {
      cancelPlayerDemolition?.(taskId);
    }
  }, [cancelPlayerDemolition]);

  const handleMaterialClick = useCallback((goodsId: number) => {
    setSelectedGoods(goodsId);
    setCurrentPage('market');
  }, [setSelectedGoods, setCurrentPage]);

  if (collapsed) {
    return (
      <Card
        variant="game"
        padding="sm"
        interactive
        onClick={onToggleCollapse}
        className="cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏗️</span>
          <span className="text-sm text-[var(--text-primary)]">
            建造队列 <Badge variant="info" size="sm">{totalCount}</Badge>
          </span>
          <span className="text-xs text-[var(--text-muted)]">点击展开</span>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="game" padding="none" className="overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-muted)] border-b border-[var(--border-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏗️</span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">建造队列</h3>
          <Badge variant="outline" size="sm">{totalCount}</Badge>
        </div>
        {onToggleCollapse && (
          <Button variant="ghost" size="xs" onClick={onToggleCollapse}>✕</Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'construction' | 'demolition')}>
        <TabsList variant="game" className="w-full border-b border-[var(--border-muted)]">
          <TabsTrigger value="construction" variant="game" className="flex-1">
            建造 <Badge variant="info" size="sm" className="ml-1">{constructionCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="demolition" variant="game" className="flex-1">
            拆除 <Badge variant="warning" size="sm" className="ml-1">{demolitionCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="p-3 max-h-80 overflow-y-auto">
        {activeTab === 'construction' ? (
          constructionCount === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              没有正在进行的建造任务
            </div>
          ) : (
            <div className="space-y-2">
              {constructionQueue
                .filter(t => t.status !== 2 && t.status !== 3)
                .map(task => (
                  <ConstructionTaskItem
                    key={task.taskId}
                    task={task}
                    onCancel={() => handleCancelConstruction(task.taskId)}
                    onMaterialClick={handleMaterialClick}
                  />
                ))}
            </div>
          )
        ) : (
          demolitionCount === 0 ? (
            <div className="text-center py-8 text-[var(--text-muted)] text-sm">
              没有正在进行的拆除任务
            </div>
          ) : (
            <div className="space-y-2">
              {demolitionQueue
                .filter(t => t.status !== 2 && t.status !== 3)
                .map(task => (
                  <DemolitionTaskItem
                    key={task.taskId}
                    task={task}
                    onCancel={() => handleCancelDemolition(task.taskId)}
                  />
                ))}
            </div>
          )
        )}
      </div>
    </Card>
  );
};

export default ConstructionQueuePanel;
