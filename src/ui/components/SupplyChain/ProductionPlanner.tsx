/**
 * 生产规划器组件
 * 计算生产目标产品所需的原材料、建筑和成本
 */

import React, { useState, useMemo, useCallback } from 'react';
import { ALL_GOODS, GOODS_BY_ID } from '@/data/goods';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import { 
  calculateProductionPlan, 
  ProductionPlan,
  TIER_COLORS,
} from '@/ui/utils/supplyChainUtils';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge, Input } from '@/ui/design-system';
import { cn } from '@/ui/design-system/utils/cn';

export interface ProductionPlannerProps {
  initialGoodsId?: number;
  onBuildBuildings?: (buildingIds: number[]) => void;
  onGoodsClick?: (goodsId: number) => void;
  onClose?: () => void;
  className?: string;
}

export const ProductionPlanner: React.FC<ProductionPlannerProps> = ({
  initialGoodsId,
  onBuildBuildings,
  onGoodsClick,
  onClose,
  className,
}) => {
  const [selectedGoodsId, setSelectedGoodsId] = useState<number | null>(initialGoodsId ?? null);
  const [targetAmount, setTargetAmount] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState('');

  // 筛选最终产品（Tier 3）用于选择
  const finalProducts = useMemo(() => {
    let products = ALL_GOODS.filter(g => g.tier >= 2);
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      products = products.filter(g => 
        g.name.toLowerCase().includes(query) ||
        g.key.toLowerCase().includes(query)
      );
    }
    return products.slice(0, 20);
  }, [searchQuery]);

  // 计算生产计划
  const plan = useMemo<ProductionPlan | null>(() => {
    if (selectedGoodsId === null || targetAmount <= 0) return null;
    try {
      return calculateProductionPlan(selectedGoodsId, targetAmount);
    } catch (e) {
      console.error('Failed to calculate production plan:', e);
      return null;
    }
  }, [selectedGoodsId, targetAmount]);

  const handleBuildAll = useCallback(() => {
    if (!plan || !onBuildBuildings) return;
    const buildingIds = plan.buildings.flatMap(b => 
      Array(b.count).fill(b.building.id)
    );
    onBuildBuildings(buildingIds);
  }, [plan, onBuildBuildings]);

  const selectedGoods = selectedGoodsId ? GOODS_BY_ID.get(selectedGoodsId) : null;

  return (
    <div className={cn('flex flex-col h-full min-h-0 bg-[var(--bg-surface)]', className)}>
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-muted)]">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎯</span>
          <h3 className="text-lg font-semibold text-[var(--text-primary)]">
            生产规划器
          </h3>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
        {/* 产品选择 */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>选择目标产品</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索产品..."
            />
            
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {finalProducts.map((goods) => (
                <Badge
                  key={goods.id}
                  variant={selectedGoodsId === goods.id ? 'primary' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setSelectedGoodsId(goods.id)}
                  style={{
                    borderColor: selectedGoodsId === goods.id 
                      ? undefined 
                      : `${TIER_COLORS[goods.tier]}50`,
                  }}
                >
                  {goods.name}
                </Badge>
              ))}
            </div>

            {selectedGoods && (
              <div className="pt-3 border-t border-[var(--border-muted)]">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-muted)]">日产量:</span>
                  <Input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-24"
                    min={1}
                  />
                  <span className="text-sm text-[var(--text-muted)]">
                    {selectedGoods.unit}/天
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* 计划结果 */}
        {plan && (
          <>
            {/* 原材料清单 */}
            <Card variant="default">
              <CardHeader>
                <CardTitle>
                  📦 所需原材料 ({plan.rawMaterials.length}种)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plan.rawMaterials.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-[var(--border-muted)] last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: TIER_COLORS[item.goods.tier] }}
                        />
                        <span 
                          className="text-sm text-[var(--text-primary)] cursor-pointer hover:text-[var(--accent)]"
                          onClick={() => onGoodsClick?.(item.goods.id)}
                        >
                          {item.goods.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {item.amount.toFixed(1)} {item.goods.unit}
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          ¥{(item.goods.basePrice * item.amount).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 中间产品 */}
            {plan.intermediates.length > 0 && (
              <Card variant="default">
                <CardHeader>
                  <CardTitle>
                    🔄 中间产品 ({plan.intermediates.length}种)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {plan.intermediates.map((item, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        size="sm"
                        className="cursor-pointer hover:border-[var(--accent)]"
                        onClick={() => onGoodsClick?.(item.goods.id)}
                      >
                        {item.goods.name} ×{item.amount.toFixed(1)}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 所需建筑 */}
            <Card variant="default">
              <CardHeader>
                <CardTitle>
                  🏭 所需建筑 ({plan.buildings.length}种)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {plan.buildings.map((item, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between py-2 border-b border-[var(--border-muted)] last:border-b-0"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">🏭</span>
                        <span className="text-sm text-[var(--text-primary)]">
                          {item.building.name}
                        </span>
                        <Badge variant="outline" size="sm">
                          ×{item.count}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium text-[var(--text-primary)]">
                        ¥{item.totalCost.toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 成本估算 */}
            <Card variant="game" className="border-[var(--accent)]">
              <CardHeader>
                <CardTitle>💰 成本估算</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-[var(--text-muted)]">原材料成本/天</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      ¥{plan.totalMaterialCost.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">建筑投资</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      ¥{plan.totalBuildingCost.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">运营成本/天</div>
                    <div className="text-lg font-bold text-[var(--text-primary)]">
                      ¥{plan.dailyOperatingCost.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[var(--text-muted)]">预计收入/天</div>
                    <div className="text-lg font-bold text-[var(--success)]">
                      ¥{plan.estimatedDailyRevenue.toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[var(--border-muted)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[var(--text-muted)] text-sm">预计日利润</div>
                      <div className={cn(
                        'text-xl font-bold',
                        plan.estimatedDailyProfit > 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'
                      )}>
                        ¥{plan.estimatedDailyProfit.toLocaleString()}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[var(--text-muted)] text-sm">投资回收期</div>
                      <div className="text-xl font-bold text-[var(--text-primary)]">
                        {plan.paybackDays === Infinity ? '∞' : `${plan.paybackDays}天`}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 底部操作 */}
      {plan && onBuildBuildings && (
        <div className="p-4 border-t border-[var(--border-muted)]">
          <Button
            variant="primary"
            size="md"
            className="w-full"
            onClick={handleBuildAll}
          >
            🏗️ 一键建造所有建筑 (¥{plan.totalBuildingCost.toLocaleString()})
          </Button>
        </div>
      )}
    </div>
  );
};