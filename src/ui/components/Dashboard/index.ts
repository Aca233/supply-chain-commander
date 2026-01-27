/**
 * Dashboard组件导出
 */

export { default as StatCard } from './StatCard';
export { default as KPIBar } from './KPIBar';
export { default as FinancialTrends } from './FinancialTrends';
export { default as ProductionOverviewPanel } from './ProductionOverviewPanel';
export { default as MarketDynamicsPanel } from './MarketDynamicsPanel';
export { default as InvestmentPanel } from './InvestmentPanel';
export { default as AlertCenter } from './AlertCenter';
export { default as InventoryOverview } from './InventoryOverview';

// Hooks
export { useDashboardData } from './hooks/useDashboardData';
export { useAlerts } from './hooks/useAlerts';

// Types
export type {
  KPIData,
  KPIChanges,
  FinancialTrendPoint,
  ProductionStats,
  MarketStats,
  InvestmentStats,
  InventoryStats,
  RecentActivity,
  DashboardData,
} from './hooks/useDashboardData';

export type {
  Alert,
  AlertLevel,
  AlertCategory,
} from './hooks/useAlerts';