/**
 * 月度价格涨跌表格组件
 * 显示当月及历史月份的商品价格变化数据，支持CSV/JSON导出
 */

import React, { useState, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DataTable,
  Badge,
  Switch,
  type Column,
} from '@/ui/design-system';
import {
  MonthlyPriceReport,
  GoodsMonthlyStats,
} from '@/core/economy/MonthlyPriceTracker';

type SortField = 'name' | 'changePercent' | 'baseChangePercent' | 'volume' | 'value' | 'endPrice';
type SortOrder = 'asc' | 'desc';

export const MonthlyPriceTable: React.FC = () => {
  const {
    getCurrentMonthPriceData,
    getMonthlyPriceData,
    getAvailableMonths,
    getAllMonthlyReports,
    exportPriceDataCSV,
    exportPriceDataJSON,
    exportMonthComparisonCSV,
    exportMonthComparisonJSON,
    getMultiMonthComparison,
  } = useGameStore();

  const [selectedMonth, setSelectedMonth] = useState<string>('current');
  const [sortField, setSortField] = useState<SortField>('changePercent');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showBasePrice, setShowBasePrice] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedMonthsForCompare, setSelectedMonthsForCompare] = useState<string[]>([]);

  // 获取数据
  const currentData = getCurrentMonthPriceData();
  const selectedData = selectedMonth === 'current'
    ? currentData
    : getMonthlyPriceData(selectedMonth);
  const availableMonths = getAvailableMonths();
  const allReports = getAllMonthlyReports();

  // 提取所有分类
  const categories = useMemo(() => {
    if (!selectedData) return [];
    const cats = new Set<string>();
    selectedData.goods.forEach(g => cats.add(g.category));
    return Array.from(cats).sort();
  }, [selectedData]);

  // 过滤和排序数据
  const displayData = useMemo(() => {
    if (!selectedData) return [];

    let filtered = selectedData.goods;

    // 分类过滤
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(g => g.category === categoryFilter);
    }

    // 排序
    const sorted = [...filtered].sort((a, b) => {
      const multiplier = sortOrder === 'asc' ? 1 : -1;
      switch (sortField) {
        case 'name':
          return multiplier * a.name.localeCompare(b.name);
        case 'changePercent':
          return multiplier * (a.changePercent - b.changePercent);
        case 'baseChangePercent':
          return multiplier * (a.baseChangePercent - b.baseChangePercent);
        case 'volume':
          return multiplier * (a.totalVolume - b.totalVolume);
        case 'value':
          return multiplier * (a.totalValue - b.totalValue);
        case 'endPrice':
          return multiplier * (a.endPrice - b.endPrice);
        default:
          return 0;
      }
    });

    return sorted;
  }, [selectedData, categoryFilter, sortField, sortOrder]);

  // 处理导出
  const handleExport = (format: 'csv' | 'json') => {
    const options = {
      includeBasePrice: showBasePrice,
      sortBy: sortField as any,
      sortOrder,
    };

    if (format === 'csv') {
      exportPriceDataCSV(options);
    } else {
      exportPriceDataJSON(options);
    }
  };

  // 处理多月份对比导出
  const handleComparisonExport = (format: 'csv' | 'json') => {
    if (selectedMonthsForCompare.length < 2) return;

    const options = {
      includeBasePrice: showBasePrice,
      sortBy: sortField as any,
      sortOrder,
    };

    if (format === 'csv') {
      exportMonthComparisonCSV(selectedMonthsForCompare, options);
    } else {
      exportMonthComparisonJSON(selectedMonthsForCompare, options);
    }
  };

  // 切换对比月份选择
  const toggleCompareMonth = (monthKey: string) => {
    setSelectedMonthsForCompare(prev => {
      if (prev.includes(monthKey)) {
        return prev.filter(k => k !== monthKey);
      } else {
        return [...prev, monthKey].slice(-4); // 最多选4个月
      }
    });
  };

  // 格式化涨跌幅
  const formatChange = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    const color = value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-[var(--text-muted)]';
    return <span className={color}>{sign}{value.toFixed(2)}%</span>;
  };

  // 格式化大数字
  const formatNumber = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`;
    }
    return value.toFixed(0);
  };

  // 表格列定义
  const columns: Column<GoodsMonthlyStats>[] = [
    {
      key: 'name',
      title: '商品',
      render: (_, goods) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{goods.name}</div>
          <div className="text-xs text-[var(--text-muted)]">{goods.category}</div>
        </div>
      ),
    },
    ...(showBasePrice ? [{
      key: 'basePrice' as keyof GoodsMonthlyStats,
      title: '基准价',
      align: 'right' as const,
      render: (value: number) => <span className="text-[var(--text-muted)]">¥{value.toFixed(2)}</span>,
    }] : []),
    {
      key: 'startPrice',
      title: '月初价',
      align: 'right' as const,
      render: (value: number) => `¥${value.toFixed(2)}`,
    },
    {
      key: 'endPrice',
      title: '当前价',
      align: 'right' as const,
      render: (value: number) => <span className="font-medium text-[var(--text-primary)]">¥{value.toFixed(2)}</span>,
    },
    {
      key: 'changePercent',
      title: '月涨跌',
      align: 'right' as const,
      render: (value: number) => formatChange(value),
    },
    ...(showBasePrice ? [{
      key: 'baseChangePercent' as keyof GoodsMonthlyStats,
      title: '较基准',
      align: 'right' as const,
      render: (value: number) => formatChange(value),
    }] : []),
    {
      key: 'highPrice',
      title: '最高',
      align: 'right' as const,
      render: (value: number) => <span className="text-green-400">¥{value.toFixed(2)}</span>,
    },
    {
      key: 'lowPrice',
      title: '最低',
      align: 'right' as const,
      render: (value: number) => <span className="text-red-400">¥{value.toFixed(2)}</span>,
    },
    {
      key: 'totalVolume',
      title: '成交量',
      align: 'right' as const,
      render: (value: number) => formatNumber(value),
    },
    {
      key: 'totalValue',
      title: '成交额',
      align: 'right' as const,
      render: (value: number) => <span className="text-[var(--accent)]">¥{formatNumber(value)}</span>,
    },
    {
      key: 'avgSupplyDemandRatio',
      title: '供需比',
      align: 'right' as const,
      render: (value: number) => {
        const color = value > 1.2 ? 'text-red-400' : value < 0.8 ? 'text-green-400' : 'text-[var(--text-muted)]';
        return <span className={color}>{value.toFixed(2)}</span>;
      },
    },
  ];

  if (!selectedData && !currentData) {
    return (
      <Card variant="elevated" padding="lg">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="text-4xl">📊</div>
          <div className="text-[var(--text-muted)]">暂无价格数据，请等待游戏运行一段时间</div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* 控制栏 */}
      <Card variant="elevated">
        <CardContent className="py-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            {/* 左侧：月份选择和过滤 */}
            <div className="flex flex-wrap gap-3 items-center">
              {/* 月份选择 */}
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="选择月份" />
                </SelectTrigger>
                <SelectContent>
                  {availableMonths.map(m => (
                    <SelectItem key={m.key} value={m.key}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 分类筛选 */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部分类</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 排序 */}
              <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="changePercent">月涨跌</SelectItem>
                  <SelectItem value="baseChangePercent">较基准</SelectItem>
                  <SelectItem value="volume">成交量</SelectItem>
                  <SelectItem value="value">成交额</SelectItem>
                  <SelectItem value="endPrice">当前价</SelectItem>
                  <SelectItem value="name">名称</SelectItem>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'desc' ? '↓ 降序' : '↑ 升序'}
              </Button>
            </div>

            {/* 右侧：选项和导出 */}
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-muted)]">显示基准价</span>
                <Switch
                  checked={showBasePrice}
                  onCheckedChange={setShowBasePrice}
                  variant="game"
                />
              </div>

              <Button size="sm" variant="secondary" onClick={() => handleExport('csv')}>
                📥 导出 CSV
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleExport('json')}>
                📥 导出 JSON
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 汇总信息 */}
      {selectedData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card variant="elevated" padding="md" className="text-center">
            <div className="text-sm text-[var(--text-muted)]">商品数量</div>
            <div className="text-2xl font-bold text-[var(--text-primary)]">
              {selectedData.summary.totalGoods}
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="text-center">
            <div className="text-sm text-[var(--text-muted)]">上涨</div>
            <div className="text-2xl font-bold text-green-400">
              {selectedData.summary.risingCount}
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="text-center">
            <div className="text-sm text-[var(--text-muted)]">下跌</div>
            <div className="text-2xl font-bold text-red-400">
              {selectedData.summary.fallingCount}
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="text-center">
            <div className="text-sm text-[var(--text-muted)]">持平</div>
            <div className="text-2xl font-bold text-[var(--text-muted)]">
              {selectedData.summary.unchangedCount}
            </div>
          </Card>
          <Card variant="elevated" padding="md" className="text-center">
            <div className="text-sm text-[var(--text-muted)]">涨跌比</div>
            <div className="text-2xl font-bold text-[var(--accent)]">
              {selectedData.summary.fallingCount > 0
                ? (selectedData.summary.risingCount / selectedData.summary.fallingCount).toFixed(2)
                : '∞'}
            </div>
          </Card>
        </div>
      )}

      {/* 涨幅/跌幅榜 */}
      {selectedData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 涨幅榜 */}
          <Card variant="elevated">
            <CardHeader className="py-3">
              <CardTitle className="text-base">🔥 涨幅榜 TOP5</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="space-y-2">
                {selectedData.summary.topGainers.slice(0, 5).map((g, i) => (
                  <div key={g.goodsId} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-[var(--text-muted)]">{i + 1}</span>
                      <span className="text-[var(--text-primary)]">{g.name}</span>
                    </div>
                    <span className="text-green-400 font-medium">+{g.changePercent.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 跌幅榜 */}
          <Card variant="elevated">
            <CardHeader className="py-3">
              <CardTitle className="text-base">📉 跌幅榜 TOP5</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="space-y-2">
                {selectedData.summary.topLosers.slice(0, 5).map((g, i) => (
                  <div key={g.goodsId} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-[var(--text-muted)]">{i + 1}</span>
                      <span className="text-[var(--text-primary)]">{g.name}</span>
                    </div>
                    <span className="text-red-400 font-medium">{g.changePercent.toFixed(2)}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 活跃榜 */}
          <Card variant="elevated">
            <CardHeader className="py-3">
              <CardTitle className="text-base">💹 成交活跃 TOP5</CardTitle>
            </CardHeader>
            <CardContent className="py-0 pb-3">
              <div className="space-y-2">
                {selectedData.summary.mostActive.slice(0, 5).map((g, i) => (
                  <div key={g.goodsId} className="flex justify-between items-center text-sm">
                    <div className="flex items-center gap-2">
                      <span className="w-5 text-center text-[var(--text-muted)]">{i + 1}</span>
                      <span className="text-[var(--text-primary)]">{g.name}</span>
                    </div>
                    <span className="text-[var(--accent)] font-medium">{formatNumber(g.totalVolume)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 多月份对比 */}
      {allReports.length >= 2 && (
        <Card variant="elevated">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-base">📊 多月份对比</CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-sm text-[var(--text-muted)]">选择对比月份</span>
                <Switch
                  checked={compareMode}
                  onCheckedChange={setCompareMode}
                  variant="game"
                />
              </div>
            </div>
          </CardHeader>
          {compareMode && (
            <CardContent className="py-3 border-t border-[var(--border)]">
              <div className="flex flex-wrap gap-2 items-center">
                {allReports.map(report => (
                  <Badge
                    key={report.id}
                    variant={selectedMonthsForCompare.includes(report.id) ? 'primary' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => toggleCompareMonth(report.id)}
                  >
                    {report.year}年{report.month}月
                  </Badge>
                ))}
                <div className="flex-1" />
                {selectedMonthsForCompare.length >= 2 && (
                  <>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleComparisonExport('csv')}
                    >
                      📥 导出对比 CSV
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleComparisonExport('json')}
                    >
                      📥 导出对比 JSON
                    </Button>
                  </>
                )}
              </div>
              {selectedMonthsForCompare.length < 2 && (
                <div className="text-sm text-[var(--text-muted)] mt-2">
                  请选择至少2个月份进行对比（最多4个）
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* 详细数据表格 */}
      <Card variant="elevated">
        <CardHeader className="py-3">
          <CardTitle className="text-base">
            📋 详细数据 ({displayData.length} 项)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-auto">
            <DataTable
              data={displayData}
              columns={columns}
              rowKey="goodsId"
              variant="game"
              hoverable
              compact
              stickyHeader
              emptyText="无符合条件的数据"
              emptyIcon="📭"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MonthlyPriceTable;