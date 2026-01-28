/**
 * 产业链图形可视化组件
 * 支持缩放、平移、节点交互的画布式产业链展示
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { GOODS_BY_ID, GoodsDefinition } from '@/data/goods';
import { RECIPES } from '@/data/recipes';
import {
  buildDependencyGraph,
  getUpstreamMaterials,
  getDownstreamProducts,
  DependencyGraph,
  TIER_COLORS,
} from '@/ui/utils/supplyChainUtils';
import { cn } from '@/ui/design-system/utils/cn';
import { Button, Badge } from '@/ui/design-system';
import { GoodsIcon } from '@/ui/components/Icons';

// 节点位置类型
interface NodePosition {
  x: number;
  y: number;
  goods: GoodsDefinition;
}

// 连接线类型
interface Edge {
  from: number;
  to: number;
  amount?: number;
}

export interface SupplyChainGraphProps {
  focusedGoodsId?: number | null;
  viewMode: 'industry' | 'tier' | 'trace';
  filterCategory?: string | null;
  filterTier?: number | null;
  onGoodsClick?: (goodsId: number) => void;
  onGoodsHover?: (goodsId: number | null) => void;
  className?: string;
}

// 布局常量
const NODE_WIDTH = 120;
const NODE_HEIGHT = 50;
const HORIZONTAL_GAP = 60;
const VERTICAL_GAP = 40;
const TIER_X_OFFSET = 200;

export const SupplyChainGraph: React.FC<SupplyChainGraphProps> = ({
  focusedGoodsId,
  viewMode,
  filterCategory,
  filterTier,
  onGoodsClick,
  onGoodsHover,
  className,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);

  // 构建依赖图
  const dependencyGraph = useMemo(() => buildDependencyGraph(), []);

  // 根据视图模式和焦点商品计算要显示的节点
  const { nodes, edges } = useMemo(() => {
    const nodePositions: Map<number, NodePosition> = new Map();
    const edgeList: Edge[] = [];

    if (viewMode === 'trace' && focusedGoodsId !== null && focusedGoodsId !== undefined) {
      // 追溯模式：显示上下游
      const upstream = getUpstreamMaterials(focusedGoodsId, 1, 5);
      const downstream = getDownstreamProducts(focusedGoodsId, 3);
      
      const focusedGoods = GOODS_BY_ID.get(focusedGoodsId);
      if (focusedGoods) {
        // 焦点商品放中间
        nodePositions.set(focusedGoodsId, {
          x: 400,
          y: 300,
          goods: focusedGoods,
        });

        // 上游放左边
        upstream.forEach((item, index) => {
          const tier = item.goods.tier;
          const x = 100 + tier * TIER_X_OFFSET;
          const y = 100 + index * (NODE_HEIGHT + VERTICAL_GAP);
          nodePositions.set(item.goods.id, {
            x,
            y,
            goods: item.goods,
          });
        });

        // 下游放右边
        downstream.forEach((item, index) => {
          const x = 600 + item.depth * 150;
          const y = 100 + index * (NODE_HEIGHT + VERTICAL_GAP);
          nodePositions.set(item.goods.id, {
            x,
            y,
            goods: item.goods,
          });
        });

        // 构建边 - 使用 adjacencyList (上游) 和 reverseAdjacencyList (下游)
        const upstreamIds = dependencyGraph.adjacencyList.get(focusedGoodsId) || [];
        upstreamIds.forEach((upId: number) => {
          if (nodePositions.has(upId)) {
            edgeList.push({ from: upId, to: focusedGoodsId });
          }
        });
        
        const downstreamIds = dependencyGraph.reverseAdjacencyList.get(focusedGoodsId) || [];
        downstreamIds.forEach((downId: number) => {
          if (nodePositions.has(downId)) {
            edgeList.push({ from: focusedGoodsId, to: downId });
          }
        });

        // 添加中间连接
        upstream.forEach(item => {
          const itemDownstream = dependencyGraph.reverseAdjacencyList.get(item.goods.id) || [];
          itemDownstream.forEach((downId: number) => {
            if (nodePositions.has(downId) && downId !== focusedGoodsId) {
              edgeList.push({ from: item.goods.id, to: downId });
            }
          });
        });
      }
    } else if (viewMode === 'tier') {
      // 按层级显示
      const tierGoods: Map<number, GoodsDefinition[]> = new Map([
        [0, []],
        [1, []],
        [2, []],
        [3, []],
      ]);

      GOODS_BY_ID.forEach((goods) => {
        if (filterTier !== null && filterTier !== undefined && goods.tier !== filterTier) return;
        if (filterCategory && goods.category !== filterCategory) return;
        tierGoods.get(goods.tier)?.push(goods);
      });

      // 布局每个层级的商品
      tierGoods.forEach((goodsList, tier) => {
        const x = 50 + tier * TIER_X_OFFSET;
        goodsList.slice(0, 15).forEach((goods, index) => {
          const y = 50 + index * (NODE_HEIGHT + VERTICAL_GAP);
          nodePositions.set(goods.id, { x, y, goods });
        });
      });

      // 构建边
      nodePositions.forEach((_, goodsId) => {
        const downstreamIds = dependencyGraph.reverseAdjacencyList.get(goodsId) || [];
        downstreamIds.forEach((downId: number) => {
          if (nodePositions.has(downId)) {
            edgeList.push({ from: goodsId, to: downId });
          }
        });
      });
    } else {
      // 行业分类显示
      const categoryGoods: Map<string, GoodsDefinition[]> = new Map();

      GOODS_BY_ID.forEach((goods) => {
        if (filterCategory && goods.category !== filterCategory) return;
        if (!categoryGoods.has(goods.category)) {
          categoryGoods.set(goods.category, []);
        }
        categoryGoods.get(goods.category)?.push(goods);
      });

      let yOffset = 50;
      categoryGoods.forEach((goodsList) => {
        goodsList.slice(0, 10).forEach((goods, index) => {
          const tier = goods.tier;
          const x = 50 + tier * TIER_X_OFFSET;
          const y = yOffset + index * (NODE_HEIGHT + 20);
          nodePositions.set(goods.id, { x, y, goods });
        });
        yOffset += (Math.min(goodsList.length, 10) + 1) * (NODE_HEIGHT + 20);
      });

      // 构建边
      nodePositions.forEach((_, goodsId) => {
        const downstreamIds = dependencyGraph.reverseAdjacencyList.get(goodsId) || [];
        downstreamIds.forEach((downId: number) => {
          if (nodePositions.has(downId)) {
            edgeList.push({ from: goodsId, to: downId });
          }
        });
      });
    }

    return { nodes: nodePositions, edges: edgeList };
  }, [viewMode, focusedGoodsId, filterCategory, filterTier, dependencyGraph]);

  // 计算画布边界
  const canvasBounds = useMemo(() => {
    let minX = 0, minY = 0, maxX = 800, maxY = 600;
    nodes.forEach((node) => {
      maxX = Math.max(maxX, node.x + NODE_WIDTH + 100);
      maxY = Math.max(maxY, node.y + NODE_HEIGHT + 100);
    });
    return { width: maxX, height: maxY };
  }, [nodes]);

  // 鼠标事件处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) { // 左键
      setIsDragging(true);
      setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
    }
  }, [transform]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setTransform(prev => ({
        ...prev,
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      }));
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 使用 useEffect 添加非 passive 的 wheel 事件监听器
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * delta, 0.3), 2);
        return { ...prev, scale: newScale };
      });
    };

    // 添加非 passive 的事件监听器以支持 preventDefault
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // 当选中商品变化时，自动居中显示
  useEffect(() => {
    if (focusedGoodsId === null || focusedGoodsId === undefined) return;
    
    const focusedNode = nodes.get(focusedGoodsId);
    if (!focusedNode) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // 获取容器尺寸
    const containerRect = canvas.getBoundingClientRect();
    const containerWidth = containerRect.width;
    const containerHeight = containerRect.height;
    
    // 计算节点中心点
    const nodeX = focusedNode.x + NODE_WIDTH / 2;
    const nodeY = focusedNode.y + NODE_HEIGHT / 2;
    
    // 计算需要的位移使节点居中
    // 容器中心 = 节点位置 * scale + translate
    // 所以 translate = 容器中心 - 节点位置 * scale
    const scale = 1; // 重置缩放到1
    const targetX = containerWidth / 2 - nodeX * scale;
    const targetY = containerHeight / 2 - nodeY * scale;
    
    setTransform({
      x: targetX,
      y: targetY,
      scale: scale,
    });
  }, [focusedGoodsId, nodes]);

  // 缩放控制
  const zoomIn = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.min(prev.scale * 1.2, 2) }));
  }, []);

  const zoomOut = useCallback(() => {
    setTransform(prev => ({ ...prev, scale: Math.max(prev.scale * 0.8, 0.3) }));
  }, []);

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  // 节点悬停处理
  const handleNodeHover = useCallback((goodsId: number | null) => {
    setHoveredNodeId(goodsId);
    onGoodsHover?.(goodsId);
  }, [onGoodsHover]);

  // 检查边是否与焦点相关
  const isEdgeHighlighted = useCallback((edge: Edge) => {
    if (!focusedGoodsId) return false;
    return edge.from === focusedGoodsId || edge.to === focusedGoodsId;
  }, [focusedGoodsId]);

  // 检查边是否与悬停节点相关
  const isEdgeHovered = useCallback((edge: Edge) => {
    if (!hoveredNodeId) return false;
    return edge.from === hoveredNodeId || edge.to === hoveredNodeId;
  }, [hoveredNodeId]);

  return (
    <div className={cn('relative w-full h-full overflow-hidden bg-[var(--bg-base)]', className)}>
      {/* 缩放控制 */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <Button variant="secondary" size="sm" onClick={zoomIn}>
          ➕
        </Button>
        <Button variant="secondary" size="sm" onClick={zoomOut}>
          ➖
        </Button>
        <Button variant="secondary" size="sm" onClick={resetView}>
          🔄
        </Button>
        <div className="text-xs text-center text-[var(--text-muted)]">
          {Math.round(transform.scale * 100)}%
        </div>
      </div>

      {/* 图例 */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2 p-2 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-muted)]">
        {[0, 1, 2, 3].map(tier => (
          <div key={tier} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: TIER_COLORS[tier] }}
            />
            <span className="text-xs text-[var(--text-muted)]">
              T{tier}
            </span>
          </div>
        ))}
      </div>

      {/* 节点统计 */}
      <div className="absolute top-4 left-4 z-10">
        <Badge variant="outline" size="sm">
          📊 {nodes.size} 节点 | {edges.length} 连接
        </Badge>
      </div>

      {/* 可拖拽画布 */}
      <div
        ref={canvasRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <svg
          width={canvasBounds.width}
          height={canvasBounds.height}
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* 绘制连接线 */}
          <g className="edges">
            {edges.map((edge, index) => {
              const fromNode = nodes.get(edge.from);
              const toNode = nodes.get(edge.to);
              if (!fromNode || !toNode) return null;

              const x1 = fromNode.x + NODE_WIDTH;
              const y1 = fromNode.y + NODE_HEIGHT / 2;
              const x2 = toNode.x;
              const y2 = toNode.y + NODE_HEIGHT / 2;

              // 贝塞尔曲线
              const midX = (x1 + x2) / 2;
              const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

              const highlighted = isEdgeHighlighted(edge);
              const hovered = isEdgeHovered(edge);

              return (
                <path
                  key={index}
                  d={path}
                  fill="none"
                  stroke={highlighted || hovered ? 'var(--accent)' : 'var(--border-muted)'}
                  strokeWidth={highlighted || hovered ? 2 : 1}
                  strokeOpacity={highlighted || hovered ? 1 : 0.5}
                  className="transition-all duration-200"
                />
              );
            })}
          </g>

          {/* 绘制节点 */}
          <g className="nodes">
            {Array.from(nodes.entries()).map(([goodsId, node]) => {
              const isFocused = goodsId === focusedGoodsId;
              const isHovered = goodsId === hoveredNodeId;
              const tierColor = TIER_COLORS[node.goods.tier];

              return (
                <g
                  key={goodsId}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onGoodsClick?.(goodsId);
                  }}
                  onMouseEnter={() => handleNodeHover(goodsId)}
                  onMouseLeave={() => handleNodeHover(null)}
                  className="cursor-pointer"
                >
                  {/* 节点背景 */}
                  <rect
                    width={NODE_WIDTH}
                    height={NODE_HEIGHT}
                    rx={8}
                    fill="var(--bg-surface)"
                    stroke={isFocused ? 'var(--accent)' : isHovered ? tierColor : 'var(--border-muted)'}
                    strokeWidth={isFocused ? 3 : isHovered ? 2 : 1}
                    className="transition-all duration-200"
                  />

                  {/* 层级指示条 */}
                  <rect
                    x={0}
                    y={0}
                    width={4}
                    height={NODE_HEIGHT}
                    rx={2}
                    fill={tierColor}
                  />

                  {/* 商品图标 - 使用 foreignObject 嵌入 React 组件 */}
                  <foreignObject
                    x={8}
                    y={(NODE_HEIGHT - 20) / 2}
                    width={20}
                    height={20}
                  >
                    <div className="flex items-center justify-center w-full h-full">
                      <GoodsIcon goodsId={goodsId} size={16} autoColor />
                    </div>
                  </foreignObject>

                  {/* 商品名称 */}
                  <text
                    x={NODE_WIDTH / 2 + 8}
                    y={NODE_HEIGHT / 2 - 4}
                    textAnchor="middle"
                    fill="var(--text-primary)"
                    fontSize={11}
                    fontWeight={isFocused ? 600 : 400}
                  >
                    {node.goods.name.length > 6
                      ? node.goods.name.substring(0, 6) + '...'
                      : node.goods.name}
                  </text>

                  {/* 价格 */}
                  <text
                    x={NODE_WIDTH / 2 + 8}
                    y={NODE_HEIGHT / 2 + 12}
                    textAnchor="middle"
                    fill="var(--text-muted)"
                    fontSize={9}
                  >
                    ¥{node.goods.basePrice.toLocaleString()}
                  </text>

                  {/* 焦点指示器 */}
                  {isFocused && (
                    <circle
                      cx={NODE_WIDTH - 8}
                      cy={8}
                      r={4}
                      fill="var(--accent)"
                      className="animate-pulse"
                    />
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* 空状态提示 */}
      {nodes.size === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-[var(--text-muted)]">
            <div className="text-4xl mb-4">📦</div>
            <div className="text-lg">选择商品开始探索产业链</div>
            <div className="text-sm mt-2">点击左侧列表中的商品查看其上下游关系</div>
          </div>
        </div>
      )}
    </div>
  );
};