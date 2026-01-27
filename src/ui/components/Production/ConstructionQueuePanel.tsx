/**
 * 建造队列面板
 * 显示当前正在进行的建造和拆除任务
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import { ALL_GOODS } from '@/data/goods';
import { formatConstructionTime, getConstructionStatusText, getDemolitionStatusText, ConstructionStatus, DemolitionStatus } from '@/core/construction';
import { GoodsIcon } from '@/ui/components/Icons';

// 材料状态类型
interface MaterialStatus {
  goodsId: number;
  goodsName: string;
  requiredAmount: number;
  currentAmount: number;
  isSufficient: boolean;
}

// 本地定义的队列任务类型 (从gameStore返回的格式)
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

// 状态颜色映射
const STATUS_COLORS: Record<number, string> = {
  0: 'text-gray-400',   // QUEUED
  1: 'text-blue-400',   // BUILDING
  2: 'text-yellow-400', // PAUSED
  3: 'text-green-400',  // COMPLETED
  4: 'text-red-400',    // CANCELLED
};

const DEMOLITION_STATUS_COLORS: Record<number, string> = {
  0: 'text-gray-400',   // QUEUED
  1: 'text-orange-400', // IN_PROGRESS
  2: 'text-green-400',  // COMPLETED
  3: 'text-red-400',    // CANCELLED
};

// 进度条颜色
const PROGRESS_COLORS: Record<number, string> = {
  0: 'bg-gray-500',   // QUEUED
  1: 'bg-blue-500',   // BUILDING
  2: 'bg-yellow-500', // PAUSED
  3: 'bg-green-500',  // COMPLETED
  4: 'bg-red-500',    // CANCELLED
};

const DEMOLITION_PROGRESS_COLORS: Record<number, string> = {
  0: 'bg-gray-500',   // QUEUED
  1: 'bg-orange-500', // IN_PROGRESS
  2: 'bg-green-500',  // COMPLETED
  3: 'bg-red-500',    // CANCELLED
};

/**
 * 建造任务项
 */
const ConstructionTaskItem: React.FC<{
  task: QueueConstructionTask;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onMaterialClick: (goodsId: number) => void;
}> = ({ task, onPause, onResume, onCancel, onMaterialClick }) => {
  const building = BUILDINGS_BY_ID.get(task.buildingTypeId);
  // 使用progress直接作为百分比（0-1）
  const progressPercent = task.progress * 100;
  // 估算剩余时间
  const estimatedTime = Math.max(0, task.requiredTicks - task.progressTicks);

  // 状态常量: 0=WAITING, 1=IN_PROGRESS, 2=COMPLETED, 3=CANCELLED
  const isBuilding = task.status === 1;
  const isQueued = task.status === 0;
  const canPause = false; // 当前不支持暂停
  const canResume = false; // 当前不支持恢复
  const canCancel = isQueued || isBuilding;

  // 获取状态文本
  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return '等待中';
      case 1: return '建造中';
      case 2: return '已完成';
      case 3: return '已取消';
      default: return '未知';
    }
  };

  // 获取材料颜色
  const getMaterialColor = (current: number, required: number): string => {
    const ratio = current / required;
    if (ratio >= 1) return 'text-green-400';
    if (ratio >= 0.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-white/5">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏗️</span>
          <div>
            <div className="text-sm font-medium text-text-primary">
              {task.buildingName || building?.name || '未知建筑'}
            </div>
            <div className="text-xs text-text-tertiary">
              {task.taskType === 0 ? '新建' : `升级到 Lv.${task.targetLevel}`}
            </div>
          </div>
        </div>
        <div className={`text-xs font-medium ${STATUS_COLORS[task.status] || 'text-gray-400'}`}>
          {getStatusText(task.status)}
        </div>
      </div>

      {/* 材料状态提示 */}
      {task.status === 0 && task.allMaterialsReady !== undefined && (
        <div className={`text-xs mb-2 ${task.allMaterialsReady ? 'text-green-400' : 'text-yellow-400'}`}>
          {task.allMaterialsReady ? '✅ 材料充足，等待开工' : '⏳ 等待材料到位...'}
        </div>
      )}

      {/* 进度条 */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${PROGRESS_COLORS[task.status] || 'bg-gray-500'}`}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>

      {/* 进度信息 */}
      <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
        <span>{progressPercent.toFixed(1)}%</span>
        <span>剩余 {formatConstructionTime(estimatedTime)}</span>
      </div>

      {/* 加速标识 */}
      {task.speedBoost > 1 && (
        <div className="text-xs text-yellow-400 mb-2">
          ⚡ 加速 {task.speedBoost.toFixed(1)}x
        </div>
      )}

      {/* 材料需求列表 - 显示全部材料 */}
      {task.materialsStatus && task.materialsStatus.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-text-tertiary mb-1">
            所需材料 ({task.materialsStatus.length}种):
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto scrollbar-thin">
            {task.materialsStatus.map((mat, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between text-xs cursor-pointer hover:bg-slate-700/50 rounded px-1.5 py-1 transition-colors group"
                onClick={() => onMaterialClick(mat.goodsId)}
                title={`点击跳转到市场查看 ${mat.goodsName}`}
              >
                <div className="flex items-center gap-1.5 truncate max-w-[140px]">
                  <GoodsIcon goodsId={mat.goodsId} size={14} autoColor />
                  <span className="text-text-secondary truncate group-hover:text-blue-400">
                    {mat.goodsName}
                  </span>
                </div>
                <span className={`font-medium ${getMaterialColor(mat.currentAmount, mat.requiredAmount)}`}>
                  {mat.currentAmount.toFixed(0)} / {mat.requiredAmount.toFixed(0)}
                  {mat.isSufficient && ' ✓'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2">
        {canCancel && (
          <button
            onClick={onCancel}
            className="flex-1 px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
          >
            ❌ 取消
          </button>
        )}
      </div>
    </div>
  );
};

/**
 * 拆除任务项
 */
const DemolitionTaskItem: React.FC<{
  task: QueueDemolitionTask;
  onCancel: () => void;
}> = ({ task, onCancel }) => {
  const building = BUILDINGS_BY_ID.get(task.buildingTypeId);
  // 使用progress直接作为百分比（0-1）
  const progressPercent = task.progress * 100;
  const remainingTicks = Math.max(0, task.requiredTicks - task.progressTicks);

  // 状态常量: 0=WAITING, 1=IN_PROGRESS, 2=COMPLETED, 3=CANCELLED
  const isDemolishing = task.status === 1;
  const isQueued = task.status === 0;
  const canCancel = isQueued || isDemolishing;

  // 获取状态文本
  const getStatusText = (status: number): string => {
    switch (status) {
      case 0: return '等待中';
      case 1: return '拆除中';
      case 2: return '已完成';
      case 3: return '已取消';
      default: return '未知';
    }
  };

  return (
    <div className="bg-slate-800/60 rounded-lg p-3 border border-orange-500/20">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏚️</span>
          <div>
            <div className="text-sm font-medium text-text-primary">
              {task.buildingName || building?.name || '未知建筑'}
            </div>
            <div className="text-xs text-text-tertiary">
              Lv.{task.buildingLevel} · 拆除中
            </div>
          </div>
        </div>
        <div className={`text-xs font-medium ${DEMOLITION_STATUS_COLORS[task.status] || 'text-gray-400'}`}>
          {getStatusText(task.status)}
        </div>
      </div>

      {/* 进度条 */}
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full transition-all duration-300 ${DEMOLITION_PROGRESS_COLORS[task.status] || 'bg-gray-500'}`}
          style={{ width: `${Math.min(100, progressPercent)}%` }}
        />
      </div>

      {/* 进度信息 */}
      <div className="flex items-center justify-between text-xs text-text-tertiary mb-2">
        <span>{progressPercent.toFixed(1)}%</span>
        <span>剩余 {formatConstructionTime(remainingTicks)}</span>
      </div>

      {/* 回收信息 */}
      <div className="mb-2 text-xs">
        <div className="flex justify-between">
          <span className="text-text-tertiary">预计现金回收:</span>
          <span className="text-green-400">¥{task.recoveredCash.toLocaleString()}</span>
        </div>
        {task.recoveredMaterials && task.recoveredMaterials.length > 0 && (
          <div className="mt-1">
            <span className="text-text-tertiary">回收材料:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {task.recoveredMaterials.slice(0, 4).map((mat, idx) => {
                const goods = ALL_GOODS.find(g => g.id === mat.goodsId);
                return (
                  <span
                    key={idx}
                    className="bg-slate-700 px-1.5 py-0.5 rounded"
                    title={`${goods?.name}: ${mat.amount}`}
                  >
                    📦 {mat.amount}
                  </span>
                );
              })}
              {task.recoveredMaterials.length > 4 && (
                <span className="text-text-tertiary">
                  +{task.recoveredMaterials.length - 4}种
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {canCancel && (
        <button
          onClick={onCancel}
          className="w-full px-2 py-1 text-xs bg-red-600/20 text-red-400 rounded hover:bg-red-600/30 transition-colors"
        >
          ❌ 取消拆除
        </button>
      )}
    </div>
  );
};

/**
 * 建造队列面板
 */
export const ConstructionQueuePanel: React.FC<ConstructionQueuePanelProps> = ({
  collapsed = false,
  onToggleCollapse,
}) => {
  const {
    getConstructionQueue,
    getDemolitionQueue,
    pauseConstruction,
    resumeConstruction,
    cancelPlayerConstruction,
    cancelPlayerDemolition,
    setCurrentPage,
    setSelectedGoods,
    tick
  } = useGameStore();

  const [activeTab, setActiveTab] = useState<'construction' | 'demolition'>('construction');

  // 获取队列数据
  const constructionQueue = useMemo((): QueueConstructionTask[] => {
    return getConstructionQueue?.() || [];
  }, [getConstructionQueue, tick]);

  const demolitionQueue = useMemo((): QueueDemolitionTask[] => {
    return getDemolitionQueue?.() || [];
  }, [getDemolitionQueue, tick]);

  // 统计数据 (status: 2=COMPLETED, 3=CANCELLED)
  const constructionCount = constructionQueue.filter(
    (t: QueueConstructionTask) => t.status !== 2 && t.status !== 3
  ).length;
  const demolitionCount = demolitionQueue.filter(
    (t: QueueDemolitionTask) => t.status !== 2 && t.status !== 3
  ).length;
  const totalCount = constructionCount + demolitionCount;

  // 操作处理
  const handlePauseConstruction = useCallback((taskId: number) => {
    pauseConstruction?.(taskId);
  }, [pauseConstruction]);

  const handleResumeConstruction = useCallback((taskId: number) => {
    resumeConstruction?.(taskId);
  }, [resumeConstruction]);

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

  // 点击材料跳转到市场
  const handleMaterialClick = useCallback((goodsId: number) => {
    setSelectedGoods(goodsId);
    setCurrentPage('market');
  }, [setSelectedGoods, setCurrentPage]);

  // 折叠状态
  if (collapsed) {
    return (
      <div
        className="bg-slate-800 rounded-lg px-4 py-2 shadow-lg cursor-pointer border border-white/10 hover:border-blue-500/50 transition-colors"
        onClick={onToggleCollapse}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🏗️</span>
          <span className="text-sm text-text-primary">
            建造队列 <span className="text-blue-400">({totalCount})</span>
          </span>
          <span className="text-xs text-text-tertiary">点击展开</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/95 backdrop-blur-sm rounded-lg border border-white/10 shadow-xl overflow-hidden">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className="text-lg">🏗️</span>
          <h3 className="text-sm font-semibold text-text-primary">建造队列</h3>
          <span className="text-xs text-text-tertiary">({totalCount})</span>
        </div>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="text-text-tertiary hover:text-text-primary transition-colors"
          >
            ✕
          </button>
        )}
      </div>

      {/* 标签页 */}
      <div className="flex border-b border-white/5">
        <button
          onClick={() => setActiveTab('construction')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'construction'
              ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-400/5'
              : 'text-text-tertiary hover:text-text-primary'
          }`}
        >
          建造 ({constructionCount})
        </button>
        <button
          onClick={() => setActiveTab('demolition')}
          className={`flex-1 px-4 py-2 text-xs font-medium transition-colors ${
            activeTab === 'demolition'
              ? 'text-orange-400 border-b-2 border-orange-400 bg-orange-400/5'
              : 'text-text-tertiary hover:text-text-primary'
          }`}
        >
          拆除 ({demolitionCount})
        </button>
      </div>

      {/* 内容区 */}
      <div className="p-3 max-h-80 overflow-y-auto scrollbar-thin">
        {activeTab === 'construction' ? (
          constructionCount === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm">
              没有正在进行的建造任务
            </div>
          ) : (
            <div className="space-y-2">
              {constructionQueue
                .filter((t: QueueConstructionTask) => t.status !== 2 && t.status !== 3)
                .map((task: QueueConstructionTask) => (
                  <ConstructionTaskItem
                    key={task.taskId}
                    task={task}
                    onPause={() => handlePauseConstruction(task.taskId)}
                    onResume={() => handleResumeConstruction(task.taskId)}
                    onCancel={() => handleCancelConstruction(task.taskId)}
                    onMaterialClick={handleMaterialClick}
                  />
                ))}
            </div>
          )
        ) : (
          demolitionCount === 0 ? (
            <div className="text-center py-8 text-text-tertiary text-sm">
              没有正在进行的拆除任务
            </div>
          ) : (
            <div className="space-y-2">
              {demolitionQueue
                .filter((t: QueueDemolitionTask) => t.status !== 2 && t.status !== 3)
                .map((task: QueueDemolitionTask) => (
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
    </div>
  );
};

export default ConstructionQueuePanel;