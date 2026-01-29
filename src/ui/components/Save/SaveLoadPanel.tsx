/**
 * 存档/读档面板组件
 * 完整的游戏存档管理界面
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SaveMetadata, saveManager, GameSettings } from '@/core/save/SaveManager';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Dialog, DialogContent, DialogHeader, DialogTitle } from '@/ui/design-system';

// ==================== 类型定义 ====================

export interface SaveLoadPanelProps {
  onLoad?: (saveId: string) => void;
  onSave?: (saveName: string) => void;
  onClose?: () => void;
  className?: string;
}

interface SaveSlotProps {
  save: SaveMetadata;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onLoad: () => void;
}

// ==================== 辅助函数 ====================

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPlayTime(ticks: number): string {
  const hours = Math.floor(ticks / (24 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) {
    return `${days}天 ${hours % 24}小时`;
  }
  return `${hours}小时`;
}

function formatMoney(value: number): string {
  if (value >= 1000000) {
    return `¥${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `¥${(value / 1000).toFixed(1)}K`;
  }
  return `¥${value.toFixed(0)}`;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  } else if (bytes >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

function getSaveTypeIcon(name: string): string {
  if (name === '快速存档') return '⚡';
  if (name === '自动存档') return '🔄';
  return '💾';
}

function getSaveTypeBadge(name: string): { label: string; variant: 'primary' | 'warning' | 'success' } {
  if (name === '快速存档') return { label: '快速', variant: 'warning' };
  if (name === '自动存档') return { label: '自动', variant: 'success' };
  return { label: '手动', variant: 'primary' };
}

// ==================== 子组件 ====================

const SaveSlot: React.FC<SaveSlotProps> = ({
  save,
  isSelected,
  onSelect,
  onDelete,
  onLoad,
}) => {
  const badge = getSaveTypeBadge(save.name);
  
  return (
    <div
      onClick={onSelect}
      className={`
        p-3 rounded-lg border cursor-pointer transition-all
        ${isSelected 
          ? 'border-accent bg-accent/10 ring-2 ring-accent/30' 
          : 'border-border-default bg-background-secondary hover:border-border-hover'
        }
      `}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{getSaveTypeIcon(save.name)}</span>
          <div>
            <h4 className="font-medium text-text-primary text-sm truncate max-w-[200px]">
              {save.name}
            </h4>
            <p className="text-xs text-text-tertiary">
              {formatDate(save.timestamp)}
            </p>
          </div>
        </div>
        <Badge variant={badge.variant} size="sm">
          {badge.label}
        </Badge>
      </div>
      
      <div className="grid grid-cols-3 gap-2 text-xs text-text-secondary mb-2">
        <div>
          <span className="text-text-tertiary">资金: </span>
          <span className="font-mono">{formatMoney(save.playerCash)}</span>
        </div>
        <div>
          <span className="text-text-tertiary">建筑: </span>
          <span className="font-mono">{save.buildingsCount}</span>
        </div>
        <div>
          <span className="text-text-tertiary">游戏时间: </span>
          <span className="font-mono">{formatPlayTime(save.playTime)}</span>
        </div>
      </div>
      
      {isSelected && (
        <div className="flex gap-2 mt-3 pt-2 border-t border-border-default">
          <Button
            size="xs"
            variant="primary"
            onClick={(e) => {
              e.stopPropagation();
              onLoad();
            }}
            className="flex-1"
          >
            📂 读取
          </Button>
          <Button
            size="xs"
            variant="danger"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            🗑️
          </Button>
        </div>
      )}
    </div>
  );
};

// ==================== 主组件 ====================

export const SaveLoadPanel: React.FC<SaveLoadPanelProps> = ({
  onLoad,
  onSave,
  onClose,
  className = '',
}) => {
  const [saves, setSaves] = useState<SaveMetadata[]>([]);
  const [selectedSaveId, setSelectedSaveId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'load' | 'save'>('load');
  const [newSaveName, setNewSaveName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ used: number; total: number; percent: number }>({
    used: 0,
    total: 5 * 1024 * 1024,
    percent: 0,
  });

  // 加载存档列表
  const loadSaves = useCallback(() => {
    const list = saveManager.listSaves();
    setSaves(list);
    setStorageInfo(saveManager.getStorageUsage());
  }, []);

  useEffect(() => {
    loadSaves();
  }, [loadSaves]);

  // 分类存档
  const categorizedSaves = useMemo(() => {
    const quick = saves.find(s => s.name === '快速存档');
    const auto = saves.find(s => s.name === '自动存档');
    const manual = saves.filter(s => s.name !== '快速存档' && s.name !== '自动存档');
    return { quick, auto, manual };
  }, [saves]);

  // 读取存档
  const handleLoad = useCallback(() => {
    if (!selectedSaveId) return;
    onLoad?.(selectedSaveId);
    onClose?.();
  }, [selectedSaveId, onLoad, onClose]);

  // 保存游戏
  const handleSave = useCallback(() => {
    const name = newSaveName.trim() || `存档 ${new Date().toLocaleString('zh-CN')}`;
    onSave?.(name);
    setNewSaveName('');
    loadSaves();
  }, [newSaveName, onSave, loadSaves]);

  // 删除存档
  const handleDelete = useCallback(() => {
    if (!selectedSaveId) return;
    saveManager.deleteSave(selectedSaveId);
    setSelectedSaveId(null);
    setShowDeleteConfirm(false);
    loadSaves();
  }, [selectedSaveId, loadSaves]);

  // 快速存档
  const handleQuickSave = useCallback(() => {
    onSave?.('快速存档');
    loadSaves();
  }, [onSave, loadSaves]);

  // 快速读取
  const handleQuickLoad = useCallback(() => {
    if (categorizedSaves.quick) {
      onLoad?.(categorizedSaves.quick.id);
      onClose?.();
    }
  }, [categorizedSaves.quick, onLoad, onClose]);

  return (
    <Card variant="elevated" className={`max-w-2xl w-full ${className}`}>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>💾 存档管理</CardTitle>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 标签切换 */}
        <div className="flex gap-2 border-b border-border-default pb-2">
          <button
            onClick={() => setActiveTab('load')}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === 'load'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            📂 读取存档
          </button>
          <button
            onClick={() => setActiveTab('save')}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === 'save'
                ? 'bg-accent/20 text-accent font-medium'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            💾 保存游戏
          </button>
        </div>

        {/* 快速操作按钮 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="warning"
            onClick={handleQuickSave}
            className="flex-1"
          >
            ⚡ 快速存档
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleQuickLoad}
            disabled={!categorizedSaves.quick}
            className="flex-1"
          >
            ⚡ 快速读取
          </Button>
        </div>

        {activeTab === 'load' ? (
          <>
            {/* 存档列表 */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {/* 特殊存档 */}
              {(categorizedSaves.quick || categorizedSaves.auto) && (
                <div className="space-y-2">
                  <h4 className="text-xs text-text-tertiary uppercase tracking-wide">特殊存档</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {categorizedSaves.quick && (
                      <SaveSlot
                        save={categorizedSaves.quick}
                        isSelected={selectedSaveId === categorizedSaves.quick.id}
                        onSelect={() => setSelectedSaveId(categorizedSaves.quick!.id)}
                        onDelete={() => {
                          setSelectedSaveId(categorizedSaves.quick!.id);
                          setShowDeleteConfirm(true);
                        }}
                        onLoad={() => {
                          setSelectedSaveId(categorizedSaves.quick!.id);
                          handleLoad();
                        }}
                      />
                    )}
                    {categorizedSaves.auto && (
                      <SaveSlot
                        save={categorizedSaves.auto}
                        isSelected={selectedSaveId === categorizedSaves.auto.id}
                        onSelect={() => setSelectedSaveId(categorizedSaves.auto!.id)}
                        onDelete={() => {
                          setSelectedSaveId(categorizedSaves.auto!.id);
                          setShowDeleteConfirm(true);
                        }}
                        onLoad={() => {
                          setSelectedSaveId(categorizedSaves.auto!.id);
                          handleLoad();
                        }}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* 手动存档 */}
              {categorizedSaves.manual.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs text-text-tertiary uppercase tracking-wide">
                    手动存档 ({categorizedSaves.manual.length})
                  </h4>
                  <div className="grid grid-cols-1 gap-2">
                    {categorizedSaves.manual.map(save => (
                      <SaveSlot
                        key={save.id}
                        save={save}
                        isSelected={selectedSaveId === save.id}
                        onSelect={() => setSelectedSaveId(save.id)}
                        onDelete={() => {
                          setSelectedSaveId(save.id);
                          setShowDeleteConfirm(true);
                        }}
                        onLoad={() => {
                          setSelectedSaveId(save.id);
                          handleLoad();
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {saves.length === 0 && (
                <div className="text-center py-8 text-text-tertiary">
                  <span className="text-4xl block mb-2">📭</span>
                  <p>暂无存档</p>
                  <p className="text-sm mt-1">开始游戏并保存进度吧！</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* 新存档 */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-text-secondary mb-1">
                  存档名称
                </label>
                <input
                  type="text"
                  value={newSaveName}
                  onChange={(e) => setNewSaveName(e.target.value)}
                  placeholder={`存档 ${new Date().toLocaleString('zh-CN')}`}
                  className="w-full px-3 py-2 rounded-lg bg-background-tertiary border border-border-default 
                           text-text-primary placeholder-text-tertiary
                           focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </div>
              
              <Button
                variant="primary"
                onClick={handleSave}
                className="w-full"
              >
                💾 创建新存档
              </Button>

              {/* 覆盖现有存档 */}
              {categorizedSaves.manual.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-border-default">
                  <h4 className="text-xs text-text-tertiary uppercase tracking-wide">
                    或覆盖现有存档
                  </h4>
                  <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                    {categorizedSaves.manual.map(save => (
                      <button
                        key={save.id}
                        onClick={() => {
                          onSave?.(save.name);
                          loadSaves();
                        }}
                        className="flex items-center justify-between p-2 rounded-lg bg-background-tertiary
                                 border border-border-default hover:border-warning transition-colors text-left"
                      >
                        <span className="text-sm text-text-primary truncate">{save.name}</span>
                        <span className="text-xs text-text-tertiary">{formatDate(save.timestamp)}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* 存储空间信息 */}
        <div className="pt-3 border-t border-border-default">
          <div className="flex items-center justify-between text-xs text-text-tertiary mb-1">
            <span>存储空间使用</span>
            <span>{formatBytes(storageInfo.used)} / {formatBytes(storageInfo.total)}</span>
          </div>
          <div className="h-2 bg-background-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                storageInfo.percent > 80 ? 'bg-error' : storageInfo.percent > 50 ? 'bg-warning' : 'bg-accent'
              }`}
              style={{ width: `${Math.min(100, storageInfo.percent)}%` }}
            />
          </div>
          {storageInfo.percent > 80 && (
            <p className="text-xs text-warning mt-1">
              ⚠️ 存储空间即将满，请删除一些旧存档
            </p>
          )}
        </div>
      </CardContent>

      {/* 删除确认对话框 */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-text-secondary">
              确定要删除这个存档吗？此操作无法撤销。
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
              取消
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SaveLoadPanel;