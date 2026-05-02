/**
 * 库存概览组件
 * 详细展示库存分类、商品列表、价值分布
 * 使用与市场页面一致的分类颜色
 */

import React, { useState, useMemo } from 'react';
import { InventoryStats, CategoryValue, InventoryItem } from './hooks/useDashboardData';
import { GoodsIcon } from '@/ui/components/Icons';
import { ALL_GOODS } from '@/data/goods';

interface InventoryOverviewProps {
  stats: InventoryStats;
  onNavigate?: (view: string) => void;
  onSellItem?: (goodsId: number) => void;
}

type ViewMode = 'all' | 'category';

// 与市场页面一致的分类配置
const CATEGORY_CONFIG: Record<string, { name: string; color: string; bgClass: string }> = {
  raw: { name: '原材料', color: '#f59e0b', bgClass: 'bg-amber-500' },
  basic: { name: '基础加工', color: '#3b82f6', bgClass: 'bg-blue-500' },
  intermediate: { name: '中间产品', color: '#a855f7', bgClass: 'bg-purple-500' },
  final: { name: '最终产品', color: '#22c55e', bgClass: 'bg-green-500' },
};

export const InventoryOverview: React.FC<InventoryOverviewProps> = ({ 
  stats, 
  onNavigate,
  onSellItem 
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const formatMoney = (value: number): string => {
    if (Math.abs(value) >= 1000000) {
      return `¥${(value / 1000000).toFixed(2)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `¥${(value / 1000).toFixed(1)}K`;
    }
    return `¥${value.toFixed(0)}`;
  };

  const formatQuantity = (value: number): string => {
    if (Math.abs(value) >= 10000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  // 获取商品分类
  const getGoodsCategory = (goodsId: number): string => {
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    return goods?.category || 'raw';
  };

  // 按类别分组商品
  const itemsByCategory = useMemo(() => {
    const grouped: Record<string, InventoryItem[]> = {
      raw: [],
      basic: [],
      intermediate: [],
      final: [],
    };
    
    for (const item of stats.topItems) {
      const category = getGoodsCategory(item.goodsId);
      if (grouped[category]) {
        grouped[category].push(item);
      }
    }
    
    return grouped;
  }, [stats.topItems]);

  // 渲染商品行
  const renderItemRow = (item: InventoryItem) => {
    const category = getGoodsCategory(item.goodsId);
    const categoryConfig = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.raw;
    
    return (
      <div
        key={item.goodsId}
        className="flex items-center gap-2 py-2 px-2 rounded hover:bg-background-tertiary cursor-pointer transition-colors border-b border-border-primary last:border-0"
        onClick={() => onSellItem?.(item.goodsId)}
      >
        <GoodsIcon goodsId={item.goodsId} size={20} autoColor />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-primary truncate">{item.name}</span>
            <span
              className={`px-1.5 py-0.5 text-[10px] rounded text-white ${categoryConfig.bgClass}`}
            >
              {categoryConfig.name}
            </span>
            <span
              className="px-1.5 py-0.5 text-[10px] rounded"
              style={{
                backgroundColor: item.qualityMultiplier > 1 ? 'rgba(74, 222, 128, 0.2)' : 
                                item.qualityMultiplier < 1 ? 'rgba(248, 113, 113, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                color: item.qualityMultiplier > 1 ? '#4ade80' : 
                       item.qualityMultiplier < 1 ? '#f87171' : '#60a5fa'
              }}
            >
              {item.quality}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-text-tertiary mt-0.5">
            <span className="tabular-nums">{formatQuantity(item.quantity)} 单位</span>
            <span className="tabular-nums">@ ¥{item.price.toFixed(2)}</span>
            {item.qualityMultiplier !== 1.0 && (
              <span className={item.qualityMultiplier > 1 ? 'text-chart-up' : 'text-chart-down'}>
                {item.qualityMultiplier > 1 ? '+' : ''}{((item.qualityMultiplier - 1) * 100).toFixed(0)}%
              </span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-text-primary tabular-nums">
            {formatMoney(item.value)}
          </p>
          {item.qualityMultiplier !== 1.0 && (
            <p className="text-[10px] text-text-tertiary tabular-nums">
              实际 {formatMoney(item.value * item.qualityMultiplier)}
            </p>
          )}
        </div>
      </div>
    );
  };

  // 渲染分类视图
  const renderCategoryView = () => (
    <div className="space-y-2">
      {stats.byCategory.length > 0 ? (
        stats.byCategory.map((cat: CategoryValue) => {
          const percentage = stats.totalValue > 0 
            ? (cat.value / stats.totalValue) * 100 
            : 0;
          const isExpanded = expandedCategory === cat.category;
          const categoryConfig = CATEGORY_CONFIG[cat.category] || CATEGORY_CONFIG.raw;
          const categoryItems = itemsByCategory[cat.category] || [];
          
          return (
            <div key={cat.category} className="bg-background-secondary rounded-lg overflow-hidden">
              <div 
                className="flex items-center gap-2 p-2 cursor-pointer hover:bg-background-tertiary transition-colors"
                onClick={() => setExpandedCategory(isExpanded ? null : cat.category)}
              >
                <div className={`w-3 h-3 rounded ${categoryConfig.bgClass}`} />
                <span className="text-sm text-text-primary flex-1">{categoryConfig.name}</span>
                <span className="text-xs text-text-tertiary tabular-nums">{cat.count}种</span>
                <div className="w-16 h-1.5 bg-background-tertiary rounded-full overflow-hidden">
                  <div
                    className={categoryConfig.bgClass}
                    style={{ width: `${percentage}%`, height: '100%' }}
                  />
                </div>
                <span className="text-sm text-text-primary tabular-nums w-16 text-right">
                  {formatMoney(cat.value)}
                </span>
                <span className="text-xs text-text-tertiary">
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
              
              {/* 展开的商品列表 */}
              {isExpanded && categoryItems.length > 0 && (
                <div className="px-2 pb-2 border-t border-border-primary">
                  {categoryItems.map(item => (
                    <div
                      key={item.goodsId}
                      className="flex items-center gap-2 py-1.5 pl-5 hover:bg-background-tertiary rounded cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSellItem?.(item.goodsId);
                      }}
                    >
                      <GoodsIcon goodsId={item.goodsId} size={14} autoColor />
                      <span className="text-xs text-text-secondary flex-1 truncate">{item.name}</span>
                      <span
                        className="px-1 py-0.5 text-[9px] rounded"
                        style={{
                          backgroundColor: item.qualityMultiplier > 1 ? 'rgba(74, 222, 128, 0.2)' : 
                                          item.qualityMultiplier < 1 ? 'rgba(248, 113, 113, 0.2)' : 'rgba(96, 165, 250, 0.2)',
                          color: item.qualityMultiplier > 1 ? '#4ade80' : 
                                 item.qualityMultiplier < 1 ? '#f87171' : '#60a5fa'
                        }}
                      >
                        {item.quality}
                      </span>
                      <span className="text-xs text-text-tertiary tabular-nums">{formatQuantity(item.quantity)}</span>
                      <span className="text-xs text-text-primary tabular-nums">{formatMoney(item.value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div className="text-center py-4 text-text-tertiary">
          <p className="text-sm">暂无库存</p>
        </div>
      )}
    </div>
  );

  // 渲染全部商品视图
  const renderAllItemsView = () => (
    <div className="space-y-0">
      {stats.topItems.length > 0 ? (
        stats.topItems.map(item => renderItemRow(item))
      ) : (
        <div className="text-center py-4 text-text-tertiary">
          <p className="text-sm">暂无库存</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="card p-4 h-full flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <h3 className="text-sm font-medium flex items-center gap-2">
          📦 库存概览
        </h3>
        <button
          onClick={() => onNavigate?.('market')}
          className="text-xs text-primary hover:text-primary-hover transition-colors"
        >
          去交易 →
        </button>
      </div>

      {/* 概览统计 */}
      <div className="grid grid-cols-2 gap-2 mb-3 flex-shrink-0">
        <div className="bg-background-secondary rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-text-primary tabular-nums">
            {formatMoney(stats.totalValue)}
          </p>
          <p className="text-[10px] text-text-tertiary">总价值</p>
        </div>
        <div className="bg-background-secondary rounded-lg p-2 text-center">
          <p className="text-lg font-semibold text-text-primary tabular-nums">
            {stats.totalItems}
          </p>
          <p className="text-[10px] text-text-tertiary">商品种类</p>
        </div>
      </div>

      {/* 视图切换 */}
      <div className="flex gap-1 mb-2 bg-background-secondary rounded-lg p-0.5 flex-shrink-0">
        <button
          className={`flex-1 text-xs py-1 rounded transition-colors ${
            viewMode === 'all' 
              ? 'bg-primary text-white' 
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
          onClick={() => setViewMode('all')}
        >
          全部商品
        </button>
        <button
          className={`flex-1 text-xs py-1 rounded transition-colors ${
            viewMode === 'category' 
              ? 'bg-primary text-white' 
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
          onClick={() => setViewMode('category')}
        >
          按分类
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {viewMode === 'all' ? renderAllItemsView() : renderCategoryView()}
      </div>
    </div>
  );
};

export default InventoryOverview;