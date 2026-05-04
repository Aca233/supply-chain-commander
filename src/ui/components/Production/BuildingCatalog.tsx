/**
 * 建筑目录组件
 * 使用设计系统组件重构
 */

import React, { useState, useMemo } from 'react';
import { ALL_BUILDINGS, BuildingTypeDefinition, BUILDINGS_BY_INDUSTRY, isRetailBuilding } from '@/data/buildings';
import { BuildingIcon } from '@/ui/components/Icons';
import { useGameStore } from '@/stores/gameStore';

// 设计系统组件
import { Card, Badge, Button, Input, Tabs, TabsList, TabsTrigger } from '@/ui/design-system';

// 产业链配置 - 匹配 BUILDINGS_BY_INDUSTRY 结构（按产业链分类）
const INDUSTRY_CONFIG: Record<string, { name: string; icon: string; color: string; gradient: string }> = {
  mining: { name: '矿业', icon: '⛏️', color: 'text-stone-400', gradient: 'from-stone-500/20' },
  energy: { name: '能源', icon: '⚡', color: 'text-yellow-400', gradient: 'from-yellow-500/20' },
  agriculture: { name: '农林牧渔', icon: '🌾', color: 'text-green-400', gradient: 'from-green-500/20' },
  food: { name: '食品', icon: '🍞', color: 'text-orange-400', gradient: 'from-orange-500/20' },
  chemical: { name: '化工建材', icon: '🧪', color: 'text-emerald-400', gradient: 'from-emerald-500/20' },
  metallurgy: { name: '冶金', icon: '🔩', color: 'text-slate-400', gradient: 'from-slate-500/20' },
  textile: { name: '纺织家具', icon: '🧵', color: 'text-rose-400', gradient: 'from-rose-500/20' },
  electronics: { name: '电子科技', icon: '💻', color: 'text-cyan-400', gradient: 'from-cyan-500/20' },
  automotive: { name: '汽车', icon: '🚗', color: 'text-blue-400', gradient: 'from-blue-500/20' },
  appliance: { name: '家电', icon: '📺', color: 'text-indigo-400', gradient: 'from-indigo-500/20' },
  newEnergy: { name: '新能源', icon: '☀️', color: 'text-lime-400', gradient: 'from-lime-500/20' },
  pharma: { name: '医药', icon: '💊', color: 'text-pink-400', gradient: 'from-pink-500/20' },
  luxury: { name: '奢侈品', icon: '💎', color: 'text-purple-400', gradient: 'from-purple-500/20' },
  warehouse: { name: '仓储物流', icon: '📦', color: 'text-teal-400', gradient: 'from-teal-500/20' },
};

interface BuildingCatalogProps {
  onSelectBuilding: (buildingTypeId: number) => void;
}

export const BuildingCatalog: React.FC<BuildingCatalogProps> = ({ onSelectBuilding }) => {
  const { playerCash } = useGameStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIndustries, setExpandedIndustries] = useState<Record<string, boolean>>({ core: true });
  const [filterMode, setFilterMode] = useState<'all' | 'affordable'>('all');

  // 按产业链分组并过滤建筑
  const filteredBuildingsByIndustry = useMemo(() => {
    const result: Record<string, BuildingTypeDefinition[]> = {};
    const query = searchQuery.toLowerCase();

    for (const [industryKey, buildings] of Object.entries(BUILDINGS_BY_INDUSTRY)) {
      const filtered = buildings.filter((b) => {
        if (query) {
          const matchesSearch =
            b.name.toLowerCase().includes(query) ||
            b.description.toLowerCase().includes(query) ||
            b.key.toLowerCase().includes(query);
          if (!matchesSearch) return false;
        }
        if (filterMode === 'affordable' && b.buildCost > playerCash) return false;
        return true;
      });
      
      if (filtered.length > 0) {
        result[industryKey] = filtered;
      }
    }
    return result;
  }, [searchQuery, filterMode, playerCash]);

  const toggleIndustry = (industryKey: string) => {
    setExpandedIndustries((prev) => ({ ...prev, [industryKey]: !prev[industryKey] }));
  };

  const formatCost = (cost: number) => {
    if (cost >= 1000000) return `${(cost / 1000000).toFixed(1)}M`;
    if (cost >= 1000) return `${(cost / 1000).toFixed(0)}K`;
    return `${cost}`;
  };

  const totalBuildings = Object.values(filteredBuildingsByIndustry).reduce(
    (sum, buildings) => sum + buildings.length, 0
  );

  return (
    <div className="flex flex-col h-full bg-[var(--bg-surface)] border-r border-[var(--border-muted)]">
      {/* 头部 */}
      <div className="p-4 border-b border-[var(--border-muted)]">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🏗️</span>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">建造</h3>
          <Badge variant="outline" size="sm">{totalBuildings}种</Badge>
        </div>
        
        {/* 搜索框 */}
        <Input
          placeholder="搜索建筑..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon="🔍"
          size="sm"
          className="mb-3"
        />
        
        {/* 筛选按钮 */}
        <Tabs value={filterMode} onValueChange={(v) => setFilterMode(v as 'all' | 'affordable')}>
          <TabsList variant="game" size="sm" className="w-full">
            <TabsTrigger value="all" variant="game" className="flex-1">全部</TabsTrigger>
            <TabsTrigger value="affordable" variant="game" className="flex-1">估值内</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* 建筑列表 */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(filteredBuildingsByIndustry).map(([industryKey, buildings]) => {
          const config = INDUSTRY_CONFIG[industryKey] || {
            name: industryKey, icon: '📦', color: 'text-gray-400', gradient: 'from-gray-500/20'
          };
          const isExpanded = expandedIndustries[industryKey] ?? false;

          return (
            <div key={industryKey} className="border-b border-[var(--border-muted)]">
              {/* 产业链标题 */}
              <button
                className={`w-full flex items-center justify-between px-4 py-2.5 
                           hover:bg-[var(--bg-muted)] transition-colors
                           ${isExpanded ? `bg-gradient-to-r ${config.gradient} to-transparent` : ''}`}
                onClick={() => toggleIndustry(industryKey)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{config.icon}</span>
                  <span className={`text-xs font-medium ${config.color}`}>{config.name}</span>
                  <Badge variant="outline" size="sm">{buildings.length}</Badge>
                </div>
                <span className={`text-[var(--text-muted)] text-xs transition-transform duration-200 ${
                  isExpanded ? 'rotate-180' : ''
                }`}>
                  ▼
                </span>
              </button>

              {/* 建筑列表 */}
              {isExpanded && (
                <div className="pb-2">
                  {buildings.map((building) => {
                    const hasValuationBuffer = playerCash >= building.buildCost;
                    const isRetail = isRetailBuilding(building.id);
                    
                    return (
                      <button
                        key={building.id}
                        onClick={() => onSelectBuilding(building.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2 
                                   transition-all duration-150 group hover:bg-[var(--bg-muted)] cursor-pointer`}
                      >
                        <div className="w-8 h-8 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center
                                       group-hover:bg-[var(--bg-subtle)] transition-colors">
                          <BuildingIcon buildingId={building.id} size={20} autoColor />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                              {building.name}
                            </span>
                            {isRetail && <Badge variant="warning" size="sm">零售</Badge>}
                          </div>
                          <div className="text-[10px] text-[var(--text-muted)] truncate">
                            估值 ¥{formatCost(building.buildCost)} · 工期 {building.buildTime}h · 最高Lv.{building.maxLevel}
                          </div>
                        </div>
                        <Badge
                          variant={hasValuationBuffer ? 'success' : 'outline'}
                          size="sm"
                          className="tabular-nums"
                        >
                          ¥{formatCost(building.buildCost)}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {totalBuildings === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-[var(--text-muted)]">
            <span className="text-2xl mb-2">🔍</span>
            <span className="text-xs">未找到匹配的建筑</span>
          </div>
        )}
      </div>

      {/* 底部资金显示 */}
      <Card variant="elevated" padding="sm" className="m-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[var(--text-muted)]">可用资金</span>
          <Badge variant="success" size="sm" className="tabular-nums">
            ¥{playerCash.toLocaleString()}
          </Badge>
        </div>
      </Card>
    </div>
  );
};

export default BuildingCatalog;
