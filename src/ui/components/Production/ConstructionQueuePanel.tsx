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
import { useMobile } from '@/ui/hooks/useMobile';

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

// 建造任务项 - 紧凑版
const ConstructionTaskItem: React.FC<{
  task: QueueConstructionTask;
  onCancel: () => void;
  onMaterialClick: (goodsId: number) => void;
  compact?: boolean;
}> = ({ task, onCancel, onMaterialClick, compact = false }) => {
  const building = BUILDINGS_BY_ID.get(task.buildingTypeId);
  const progressPercent = task.progress * 100;
  const estimatedTime = Math.max(0, task.requiredTicks - task.progressTicks);
  const isQueued = task.status === 0;
  const isBuilding = task.status === 1;
  const canCancel = isQueued || isBuilding;
  const statusConfig = getStatusConfig(task.status);
  const [showMaterials, setShowMaterials] = useState(false);

  // 获取缺少的材料数量
  const missingMaterials = task.materialsStatus?.filter(m => !m.isSufficient).length || 0;

  return (
    <div className="p-2 bg-[var(--bg-elevated)] rounded-lg border-l-2 border-l-blue-500">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm">🏗️</span>
          <span className="text-xs font-medium text-[var(--text-primary)] truncate">
            {task.buildingName || building?.name || '未知建筑'}
          </span>
          <Badge variant={statusConfig.variant} size="sm" className="flex-shrink-0">
            {statusConfig.text}
          </Badge>
        </div>
        {canCancel && (
          <button
            onClick={onCancel}
            className="ml-1 w-5 h-5 text-xs text-[var(--error)] hover:bg-red-500/10 rounded flex items-center justify-center"
            title="取消"
          >
            ✕
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="mt-1.5 flex items-center gap-2">
        <ProgressBar
          value={progressPercent}
          max={100}
          size="xs"
          color={task.status === 1 ? 'info' : task.status === 2 ? 'success' : 'brand'}
          className="flex-1"
        />
        <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-16 text-right">
          {formatConstructionTime(estimatedTime)}
        </span>
      </div>

      {/* 材料状态（紧凑显示）*/}
      {task.status === 0 && task.materialsStatus && task.materialsStatus.length > 0 && (
        <div className="mt-1">
          <button
            onClick={() => setShowMaterials(!showMaterials)}
            className="text-[10px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] flex items-center gap-1"
          >
            {task.allMaterialsReady ? (
              <span className="text-[var(--success)]">✓ 材料齐全</span>
            ) : (
              <span className="text-[var(--warning)]">⏳ 缺{missingMaterials}种材料</span>
            )}
            <span>{showMaterials ? '▲' : '▼'}</span>
          </button>
          {showMaterials && (
            <div className="mt-1 space-y-0.5 max-h-16 overflow-y-auto scrollbar-thin">
              {task.materialsStatus.slice(0, 4).map((mat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-[10px] cursor-pointer hover:bg-[var(--bg-muted)] rounded px-1 py-0.5"
                  onClick={() => onMaterialClick(mat.goodsId)}
                >
                  <span className="text-[var(--text-secondary)] truncate max-w-[100px]">
                    {mat.goodsName}
                  </span>
                  <span className={mat.isSufficient ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
                    {mat.currentAmount.toFixed(0)}/{mat.requiredAmount.toFixed(0)}
                  </span>
                </div>
              ))}
              {task.materialsStatus.length > 4 && (
                <div className="text-[10px] text-[var(--text-muted)] text-center">
                  +{task.materialsStatus.length - 4}种...
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// 拆除任务项 - 紧凑版
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
    <div className="p-2 bg-[var(--bg-elevated)] rounded-lg border-l-2 border-l-orange-500">
      {/* 标题行 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-sm">🏚️</span>
          <span className="text-xs font-medium text-[var(--text-primary)] truncate">
            {task.buildingName || building?.name || '未知建筑'}
          </span>
          <Badge variant={statusConfig.variant} size="sm" className="flex-shrink-0">
            {statusConfig.text}
          </Badge>
        </div>
        {canCancel && (
          <button
            onClick={onCancel}
            className="ml-1 w-5 h-5 text-xs text-[var(--error)] hover:bg-red-500/10 rounded flex items-center justify-center"
            title="取消"
          >
            ✕
          </button>
        )}
      </div>

      {/* 进度条 */}
      <div className="mt-1.5 flex items-center gap-2">
        <ProgressBar
          value={progressPercent}
          max={100}
          size="xs"
          color="warning"
          className="flex-1"
        />
        <span className="text-[10px] text-[var(--text-muted)] tabular-nums w-16 text-right">
          {formatConstructionTime(remainingTicks)}
        </span>
      </div>

      {/* 回收信息 */}
      <div className="mt-1 text-[10px] text-[var(--text-muted)]">
        回收: <span className="text-[var(--success)]">¥{task.recoveredCash.toLocaleString()}</span>
        {task.recoveredMaterials && task.recoveredMaterials.length > 0 && (
          <span className="ml-1">+{task.recoveredMaterials.length}种材料</span>
        )}
      </div>
    </div>
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
      {/* 紧凑头部 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-muted)] border-b border-[var(--border-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-sm">🏗️</span>
          <h3 className="text-xs font-semibold text-[var(--text-primary)]">建造队列</h3>
          <Badge variant="outline" size="sm">{totalCount}</Badge>
        </div>
        {onToggleCollapse && (
          <Button variant="ghost" size="xs" onClick={onToggleCollapse}>✕</Button>
        )}
      </div>

      {/* 紧凑标签 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'construction' | 'demolition')}>
        <TabsList variant="game" className="w-full border-b border-[var(--border-muted)] py-1">
          <TabsTrigger value="construction" variant="game" className="flex-1 text-xs py-1">
            建造 <Badge variant="info" size="sm" className="ml-1">{constructionCount}</Badge>
          </TabsTrigger>
          <TabsTrigger value="demolition" variant="game" className="flex-1 text-xs py-1">
            拆除 <Badge variant="warning" size="sm" className="ml-1">{demolitionCount}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 紧凑内容 - 限制最大高度 */}
      <div className="p-2 max-h-48 overflow-y-auto scrollbar-thin">
        {activeTab === 'construction' ? (
          constructionCount === 0 ? (
            <div className="text-center py-4 text-[var(--text-muted)] text-xs">
              暂无建造任务
            </div>
          ) : (
            <div className="space-y-1.5">
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
            <div className="text-center py-4 text-[var(--text-muted)] text-xs">
              暂无拆除任务
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
