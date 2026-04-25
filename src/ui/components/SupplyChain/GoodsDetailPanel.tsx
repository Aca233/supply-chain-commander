/**
 * 商品详情面板
 * 展示商品的详细信息、生产配方、上下游关系
 */

import React, { useMemo } from 'react';
import { GOODS_BY_ID, GoodsDefinition } from '@/data/goods';
import { BUILDINGS_BY_ID } from '@/data/buildings';
import {
  getProductionsProducingGoods,
  getProductionsUsingGoods,
  getBuildingsForGoods,
  getUpstreamMaterials,
  getDownstreamProducts,
  TIER_COLORS,
  TIER_NAMES,
  INDUSTRY_INFO,
  getGoodsIndustry,
  ProductionInfo,
} from '@/ui/utils/supplyChainUtils';
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from '@/ui/design-system';
import { cn } from '@/ui/design-system/utils/cn';
import { GoodsIcon } from '@/ui/components/Icons';

export interface GoodsDetailPanelProps {
  goodsId: number;
  onClose?: () => void;
  onGoodsClick?: (goodsId: number) => void;
  onBuildBuilding?: (buildingTypeId: number) => void;
  onTraceProduct?: (goodsId: number) => void;
  className?: string;
}

export const GoodsDetailPanel: React.FC<GoodsDetailPanelProps> = ({
  goodsId,
  onClose,
  onGoodsClick,
  onBuildBuilding,
  onTraceProduct,
  className,
}) => {
  const goods = useMemo(() => GOODS_BY_ID.get(goodsId), [goodsId]);
  
  const producingProductions = useMemo(() =>
    getProductionsProducingGoods(goodsId), [goodsId]
  );
  
  const usingProductions = useMemo(() =>
    getProductionsUsingGoods(goodsId), [goodsId]
  );
  
  const buildings = useMemo(() => 
    getBuildingsForGoods(goodsId), [goodsId]
  );
  
  const upstream = useMemo(() => 
    getUpstreamMaterials(goodsId, 1, 2), [goodsId]
  );
  
  const downstream = useMemo(() => 
    getDownstreamProducts(goodsId, 2), [goodsId]
  );

  const industry = useMemo(() => getGoodsIndustry(goodsId), [goodsId]);

  if (!goods) {
    return (
      <div className={cn('p-4 text-center text-[var(--text-muted)]', className)}>
        商品未找到
      </div>
    );
  }

  const industryInfo = industry ? INDUSTRY_INFO[industry] : null;
  const tierColor = TIER_COLORS[goods.tier];

  return (
    <div className={cn('flex flex-col h-full bg-[var(--bg-surface)]', className)}>
      {/* 头部 */}
      <div className="flex items-start justify-between p-4 border-b border-[var(--border-muted)]">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: `${tierColor}20`,
              border: `2px solid ${tierColor}`,
            }}
          >
            <GoodsIcon goodsId={goodsId} size={28} autoColor />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {goods.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge
                size="sm"
                style={{ backgroundColor: tierColor, color: 'white' }}
              >
                {TIER_NAMES[goods.tier]}
              </Badge>
              {industryInfo && (
                <Badge variant="outline" size="sm">
                  {industryInfo.icon} {industryInfo.name}
                </Badge>
              )}
              {goods.isConsumerGood && (
                <Badge variant="success" size="sm">
                  👤 消费品
                </Badge>
              )}
            </div>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        )}
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 基本信息 */}
        <Card variant="default">
          <CardHeader>
            <CardTitle>📋 基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">基准价格</span>
              <span className="text-[var(--text-primary)] font-medium">
                ¥{goods.basePrice.toLocaleString()}/{goods.unit}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">价格弹性</span>
              <span className="text-[var(--text-primary)]">
                {goods.priceElasticity}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--text-muted)]">收入弹性</span>
              <span className="text-[var(--text-primary)]">
                {goods.incomeElasticity}
              </span>
            </div>
            <div className="pt-2 border-t border-[var(--border-muted)]">
              <span className="text-[var(--text-muted)] text-xs">
                {goods.description}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* 生产来源 */}
        {producingProductions.length > 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>
                📥 生产来源 ({producingProductions.length}种配方)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {producingProductions.slice(0, 3).map((production, index) => (
                <ProductionCard
                  key={`${production.buildingTypeId}-${production.outputModeId}-${index}`}
                  production={production}
                  highlightOutputId={goodsId}
                  onGoodsClick={onGoodsClick}
                  onBuildBuilding={onBuildBuilding}
                />
              ))}
              {producingProductions.length > 3 && (
                <div className="text-xs text-[var(--text-muted)] text-center">
                  还有 {producingProductions.length - 3} 种配方...
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 用途 */}
        {usingProductions.length > 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>
                📤 用途 ({usingProductions.length}种配方)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {usingProductions.slice(0, 10).map((production, index) => {
                  const output = production.outputs[0];
                  const outputGoods = output ? GOODS_BY_ID.get(output.goodsId) : null;
                  
                  return outputGoods ? (
                    <Badge
                      key={`${production.buildingTypeId}-${production.outputModeId}-${index}`}
                      variant="outline"
                      size="sm"
                      className="cursor-pointer hover:border-[var(--accent)]"
                      onClick={() => onGoodsClick?.(outputGoods.id)}
                    >
                      → {outputGoods.name}
                    </Badge>
                  ) : null;
                })}
                {usingProductions.length > 10 && (
                  <Badge variant="outline" size="sm">
                    +{usingProductions.length - 10}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 上游原料 */}
        {upstream.length > 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>⬆️ 上游原料</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {upstream.slice(0, 8).map((item, index) => (
                  <Badge
                    key={`${item.goods.id}-${index}`}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer hover:border-[var(--accent)]"
                    style={{ 
                      borderColor: `${TIER_COLORS[item.goods.tier]}50`,
                    }}
                    onClick={() => onGoodsClick?.(item.goods.id)}
                  >
                    {item.goods.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 下游产品 */}
        {downstream.length > 0 && (
          <Card variant="default">
            <CardHeader>
              <CardTitle>⬇️ 下游产品</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {downstream.slice(0, 8).map((item, index) => (
                  <Badge
                    key={`${item.goods.id}-${index}`}
                    variant="outline"
                    size="sm"
                    className="cursor-pointer hover:border-[var(--accent)]"
                    style={{ 
                      borderColor: `${TIER_COLORS[item.goods.tier]}50`,
                    }}
                    onClick={() => onGoodsClick?.(item.goods.id)}
                  >
                    {item.goods.name}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* 底部操作 */}
      <div className="p-4 border-t border-[var(--border-muted)] flex gap-2">
        {onTraceProduct && (
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={() => onTraceProduct(goodsId)}
          >
            🔍 追溯产业链
          </Button>
        )}
        {buildings.length > 0 && onBuildBuilding && (
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => onBuildBuilding(buildings[0].id)}
          >
            🏭 建造工厂
          </Button>
        )}
      </div>
    </div>
  );
};

// 生产卡片子组件
interface ProductionCardProps {
  production: ProductionInfo;
  highlightOutputId?: number;
  onGoodsClick?: (goodsId: number) => void;
  onBuildBuilding?: (buildingTypeId: number) => void;
}

const ProductionCard: React.FC<ProductionCardProps> = ({
  production,
  highlightOutputId,
  onGoodsClick,
  onBuildBuilding,
}) => {
  const building = BUILDINGS_BY_ID.get(production.buildingTypeId);

  return (
    <div className="p-3 rounded-lg border border-[var(--border-muted)] bg-[var(--bg-elevated)]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[var(--text-primary)]">
          {production.outputModeName || production.buildingName}
        </span>
        {building && (
          <Badge variant="outline" size="sm">
            🏭 {building.name}
          </Badge>
        )}
      </div>
      
      {/* 输入输出 */}
      <div className="flex items-center gap-2 text-xs">
        {/* 输入 */}
        <div className="flex flex-wrap gap-1">
          {production.inputs.map((input, idx) => {
            const inputGoods = GOODS_BY_ID.get(input.goodsId);
            return inputGoods ? (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded bg-[var(--bg-muted)] text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)]"
                onClick={() => onGoodsClick?.(input.goodsId)}
              >
                {inputGoods.name}×{input.amount}
              </span>
            ) : null;
          })}
        </div>
        
        <span className="text-[var(--text-muted)]">→</span>
        
        {/* 输出 */}
        <div className="flex flex-wrap gap-1">
          {production.outputs.map((output, idx) => {
            const outputGoods = GOODS_BY_ID.get(output.goodsId);
            const isHighlighted = output.goodsId === highlightOutputId;
            return outputGoods ? (
              <span
                key={idx}
                className={cn(
                  'px-1.5 py-0.5 rounded cursor-pointer',
                  isHighlighted
                    ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
                    : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                )}
                onClick={() => onGoodsClick?.(output.goodsId)}
              >
                {outputGoods.name}×{output.amount}
              </span>
            ) : null;
          })}
        </div>
      </div>

      {/* 建造按钮 */}
      {building && onBuildBuilding && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2"
          onClick={() => onBuildBuilding(building.id)}
        >
          建造 {building.name}
        </Button>
      )}
    </div>
  );
};