/**
 * 数值平衡调优面板
 * 用于实时调整和测试游戏参数
 */

import React, { useState, useCallback } from 'react';
import {
  useBalanceStore,
  CONFIG_CATEGORIES,
  PRESET_LABELS,
  type PresetName,
  type BalanceConfiguration,
  type ConfigFieldMeta,
} from '@/core/balance/BalanceConfig';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Badge,
  Input,
} from '@/ui/design-system';

// ==================== 配置字段组件 ====================

interface ConfigFieldProps {
  meta: ConfigFieldMeta;
  value: number;
  onChange: (value: number) => void;
  defaultValue: number;
}

const ConfigField: React.FC<ConfigFieldProps> = ({ meta, value, onChange, defaultValue }) => {
  const isModified = value !== defaultValue;
  
  const formatValue = (val: number): string => {
    switch (meta.format) {
      case 'percent':
        return `${(val * 100).toFixed(1)}%`;
      case 'currency':
        if (val >= 1_000_000_000) return `¥${(val / 1_000_000_000).toFixed(1)}B`;
        if (val >= 1_000_000) return `¥${(val / 1_000_000).toFixed(1)}M`;
        if (val >= 1_000) return `¥${(val / 1_000).toFixed(1)}K`;
        return `¥${val.toFixed(0)}`;
      case 'tick':
        return `${val} ${meta.unit || 'tick'}`;
      default:
        return `${val}${meta.unit ? ' ' + meta.unit : ''}`;
    }
  };
  
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    onChange(newValue);
  };
  
  const handleReset = () => {
    onChange(defaultValue);
  };
  
  // 计算滑块的百分比位置
  const percentage = ((value - meta.min) / (meta.max - meta.min)) * 100;
  
  return (
    <div className="py-3 border-b border-[var(--border)] last:border-b-0">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[var(--text-primary)] font-medium text-sm">
            {meta.label}
          </span>
          {isModified && (
            <Badge variant="warning" size="sm">已修改</Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[var(--accent)] font-mono text-sm min-w-[80px] text-right">
            {formatValue(value)}
          </span>
          {isModified && (
            <button
              onClick={handleReset}
              className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="恢复默认值"
            >
              ↻
            </button>
          )}
        </div>
      </div>
      
      <p className="text-xs text-[var(--text-muted)] mb-2">{meta.description}</p>
      
      <div className="relative">
        <input
          type="range"
          min={meta.min}
          max={meta.max}
          step={meta.step}
          value={value}
          onChange={handleSliderChange}
          className="w-full h-2 bg-[var(--bg-secondary)] rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-[var(--accent)]
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:transition-transform
                     [&::-webkit-slider-thumb]:hover:scale-110
                     [&::-moz-range-thumb]:w-4
                     [&::-moz-range-thumb]:h-4
                     [&::-moz-range-thumb]:rounded-full
                     [&::-moz-range-thumb]:bg-[var(--accent)]
                     [&::-moz-range-thumb]:border-0
                     [&::-moz-range-thumb]:cursor-pointer"
          style={{
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, var(--bg-secondary) ${percentage}%, var(--bg-secondary) 100%)`,
          }}
        />
        <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
          <span>{formatValue(meta.min)}</span>
          <span>{formatValue(meta.max)}</span>
        </div>
      </div>
    </div>
  );
};

// ==================== 配置分类面板 ====================

interface CategoryPanelProps {
  categoryKey: keyof BalanceConfiguration;
  meta: ConfigFieldMeta[];
  config: Record<string, number>;
  defaultConfig: Record<string, number>;
  onConfigChange: (key: string, value: number) => void;
  onReset: () => void;
}

const CategoryPanel: React.FC<CategoryPanelProps> = ({
  categoryKey,
  meta,
  config,
  defaultConfig,
  onConfigChange,
  onReset,
}) => {
  const hasModifications = meta.some(m => config[m.key] !== defaultConfig[m.key]);
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {hasModifications && (
            <Badge variant="warning">已修改</Badge>
          )}
        </div>
        <Button
          size="xs"
          variant="secondary"
          onClick={onReset}
          disabled={!hasModifications}
        >
          重置分类
        </Button>
      </div>
      
      <div className="space-y-1">
        {meta.map((field) => (
          <ConfigField
            key={field.key}
            meta={field}
            value={config[field.key]}
            defaultValue={defaultConfig[field.key]}
            onChange={(value) => onConfigChange(field.key, value)}
          />
        ))}
      </div>
    </div>
  );
};

// ==================== 预设选择器 ====================

interface PresetSelectorProps {
  activePreset: PresetName;
  onSelect: (preset: PresetName) => void;
}

const PresetSelector: React.FC<PresetSelectorProps> = ({ activePreset, onSelect }) => {
  const presets = Object.entries(PRESET_LABELS) as [PresetName, { label: string; description: string }][];
  
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {presets.map(([key, { label, description }]) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          className={`
            p-3 rounded-lg border transition-all text-left
            ${activePreset === key
              ? 'border-[var(--accent)] bg-[var(--accent)]/10'
              : 'border-[var(--border)] hover:border-[var(--accent)]/50 bg-[var(--bg-secondary)]'
            }
          `}
        >
          <div className={`font-medium text-sm ${activePreset === key ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}`}>
            {label}
          </div>
          <div className="text-xs text-[var(--text-muted)] mt-1">{description}</div>
        </button>
      ))}
    </div>
  );
};

// ==================== 导入导出面板 ====================

interface ImportExportPanelProps {
  onExport: () => void;
  onImport: (json: string) => boolean;
}

const ImportExportPanel: React.FC<ImportExportPanelProps> = ({ onExport, onImport }) => {
  const [importText, setImportText] = useState('');
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  
  const handleImport = () => {
    const success = onImport(importText);
    setImportStatus(success ? 'success' : 'error');
    if (success) {
      setImportText('');
      setTimeout(() => setImportStatus('idle'), 2000);
    }
  };
  
  return (
    <div className="space-y-4">
      <div>
        <Button onClick={onExport} variant="secondary" size="sm">
          📤 导出配置
        </Button>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          导出当前配置为JSON文件
        </p>
      </div>
      
      <div className="border-t border-[var(--border)] pt-4">
        <label className="text-sm font-medium text-[var(--text-primary)]">导入配置</label>
        <textarea
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="粘贴配置JSON..."
          className="w-full h-24 mt-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)] text-sm font-mono resize-none"
        />
        <div className="flex items-center gap-2 mt-2">
          <Button onClick={handleImport} size="sm" disabled={!importText.trim()}>
            📥 导入
          </Button>
          {importStatus === 'success' && (
            <span className="text-sm text-[var(--success)]">✓ 导入成功</span>
          )}
          {importStatus === 'error' && (
            <span className="text-sm text-[var(--error)]">✗ 导入失败</span>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== 主面板组件 ====================

export const BalanceTuningPanel: React.FC = () => {
  const {
    config,
    activePreset,
    isDirty,
    setConfig,
    applyPreset,
    resetToDefault,
    resetCategory,
    saveToStorage,
    exportConfig,
    importConfig,
    undo,
    getPresetConfig,
    history,
  } = useBalanceStore();
  
  const [activeCategory, setActiveCategory] = useState<keyof BalanceConfiguration>('price');
  
  const defaultConfig = getPresetConfig('default');
  
  const handleConfigChange = useCallback((category: keyof BalanceConfiguration, key: string, value: number) => {
    // 使用类型断言绕过严格类型检查
    (setConfig as (cat: keyof BalanceConfiguration, k: string, v: number) => void)(category, key, value);
  }, [setConfig]);
  
  const handleExport = useCallback(() => {
    const json = exportConfig();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-config-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportConfig]);
  
  const handleSave = useCallback(() => {
    saveToStorage();
    // TODO: 通知用户保存成功
  }, [saveToStorage]);
  
  return (
    <div className="space-y-6">
      {/* 顶部工具栏 */}
      <Card variant="elevated">
        <CardHeader>
          <div className="flex justify-between items-center w-full">
            <CardTitle>🎛️ 数值平衡调优</CardTitle>
            <div className="flex items-center gap-2">
              {isDirty && (
                <Badge variant="warning">未保存</Badge>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={undo}
                disabled={history.length === 0}
                title="撤销上一次修改"
              >
                ↶ 撤销
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={resetToDefault}
              >
                重置全部
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSave}
                disabled={!isDirty}
              >
                💾 保存配置
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-3">预设配置</h3>
              <PresetSelector activePreset={activePreset} onSelect={applyPreset} />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* 配置面板 */}
      <Card variant="elevated">
        <Tabs value={activeCategory} onValueChange={(v) => setActiveCategory(v as keyof BalanceConfiguration)}>
          <TabsList variant="game" className="border-b border-[var(--border)] p-1">
            {CONFIG_CATEGORIES.map((cat) => (
              <TabsTrigger key={cat.key} value={cat.key} variant="game" className="text-sm">
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {CONFIG_CATEGORIES.map((cat) => (
            <TabsContent key={cat.key} value={cat.key} className="p-4">
              <CategoryPanel
                categoryKey={cat.key}
                meta={cat.meta}
                config={config[cat.key] as unknown as Record<string, number>}
                defaultConfig={defaultConfig[cat.key] as unknown as Record<string, number>}
                onConfigChange={(key, value) => handleConfigChange(cat.key, key, value)}
                onReset={() => resetCategory(cat.key)}
              />
            </TabsContent>
          ))}
        </Tabs>
      </Card>
      
      {/* 导入导出 */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>📁 导入/导出</CardTitle>
        </CardHeader>
        <CardContent>
          <ImportExportPanel onExport={handleExport} onImport={importConfig} />
        </CardContent>
      </Card>
      
      {/* 使用说明 */}
      <Card variant="game" padding="md">
        <div className="text-sm text-[var(--text-secondary)] space-y-2">
          <p className="font-medium text-[var(--text-primary)]">💡 使用说明</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>调整滑块即时修改参数，点击"保存配置"后生效</li>
            <li>选择预设配置可快速切换不同的游戏难度和风格</li>
            <li>点击参数旁的 ↻ 可恢复该参数的默认值</li>
            <li>导出配置可保存当前设置，便于分享或备份</li>
            <li><strong>注意：</strong>部分参数需要重新开始游戏才能完全生效</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default BalanceTuningPanel;