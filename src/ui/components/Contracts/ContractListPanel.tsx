/**
 * 合约列表面板组件
 * 显示玩家的供应合同列表
 */

import React, { useMemo, useState } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { GoodsIcon } from '@/ui/components/Icons';
import {
  supplyContractManager,
  SupplyContract,
  ContractStatus,
  ContractRole,
  PricingMode,
  getContractStatusName,
  getPricingModeName,
  DeliveryRecord,
} from '@/core/economy/SupplyContracts';
import {
  Button,
  Card,
  Badge,
  ProgressBar,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/ui/design-system';

interface ContractListPanelProps {
  companyId?: number;
}

export const ContractListPanel: React.FC<ContractListPanelProps> = ({ companyId = 0 }) => {
  const { tick, addNotification } = useGameStore();
  const [selectedContract, setSelectedContract] = useState<SupplyContract | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showNewContractDialog, setShowNewContractDialog] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  const contracts = useMemo(() => {
    const allContracts = supplyContractManager.getCompanyContracts(companyId);
    
    switch (filter) {
      case 'active':
        return allContracts.filter(c => c.status === ContractStatus.ACTIVE);
      case 'completed':
        return allContracts.filter(c => 
          c.status === ContractStatus.COMPLETED || 
          c.status === ContractStatus.EXPIRED
        );
      default:
        return allContracts;
    }
  }, [companyId, filter, tick]);

  const upcomingDeliveries = useMemo(() => {
    return supplyContractManager.getUpcomingDeliveries(companyId, 7, tick);
  }, [companyId, tick]);

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const formatTime = (ticks: number) => {
    const hours = ticks;
    if (hours >= 24) {
      return `${(hours / 24).toFixed(1)}天`;
    }
    return `${hours}小时`;
  };

  const getStatusConfig = (status: ContractStatus) => {
    const configs: Record<ContractStatus, { variant: 'success' | 'warning' | 'error' | 'outline' | 'default'; color: string }> = {
      [ContractStatus.NEGOTIATING]: { variant: 'warning', color: 'var(--warning)' },
      [ContractStatus.ACTIVE]: { variant: 'success', color: 'var(--success)' },
      [ContractStatus.COMPLETED]: { variant: 'default', color: 'var(--text-muted)' },
      [ContractStatus.BREACHED]: { variant: 'error', color: 'var(--error)' },
      [ContractStatus.CANCELLED]: { variant: 'default', color: 'var(--text-muted)' },
      [ContractStatus.EXPIRED]: { variant: 'outline', color: 'var(--text-muted)' },
    };
    return configs[status];
  };

  return (
    <div className="h-full flex flex-col">
      {/* 头部统计 */}
      <div className="p-4 border-b border-[var(--border-muted)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">📋 供应合同</h2>
          <Button variant="primary" size="sm" onClick={() => setShowNewContractDialog(true)}>
            + 新建合同
          </Button>
        </div>
        
        {/* 筛选器 */}
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
              {f === 'active' && (
                <Badge variant="success" size="sm" className="ml-1">
                  {contracts.filter(c => c.status === ContractStatus.ACTIVE).length}
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* 即将到期的交付 */}
      {upcomingDeliveries.length > 0 && (
        <Card variant="default" status="warning" padding="md" className="m-4">
          <h3 className="text-xs font-medium text-[var(--warning)] mb-2">
            ⏰ 即将到期的交付 ({upcomingDeliveries.length})
          </h3>
          <div className="space-y-2">
            {upcomingDeliveries.slice(0, 3).map((delivery, idx) => {
              const contract = supplyContractManager.getCompanyContracts(companyId)
                .find(c => c.id === delivery.contractId);
              const goods = ALL_GOODS.find(g => g.id === contract?.goodsId);
              const remaining = delivery.scheduledTick - tick;
              
              return (
                <div key={`${delivery.contractId}-${delivery.period}`} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <GoodsIcon goodsId={contract?.goodsId || 0} size={14} />
                    <span className="text-[var(--text-muted)]">{goods?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[var(--text-primary)] tabular-nums">{delivery.quantity.toFixed(0)}</span>
                    <Badge variant={remaining <= 24 ? 'error' : 'warning'} size="sm">
                      {formatTime(remaining)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 合同列表 */}
      <div className="flex-1 overflow-y-auto p-4">
        {contracts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📄</div>
            <div className="text-[var(--text-muted)]">暂无合同</div>
            <Button
              variant="primary"
              size="sm"
              className="mt-4"
              onClick={() => setShowNewContractDialog(true)}
            >
              创建第一份合同
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {contracts.map((contract) => {
              const goods = ALL_GOODS.find(g => g.id === contract.goodsId);
              const statusConfig = getStatusConfig(contract.status);
              const progress = contract.currentPeriod / contract.totalPeriods;
              const valueInfo = supplyContractManager.calculateContractValue(contract);
              const isSupplier = contract.myRole === ContractRole.SUPPLIER;

              return (
                <Card
                  key={contract.id}
                  variant="elevated"
                  padding="md"
                  interactive
                  onClick={() => {
                    setSelectedContract(contract);
                    setShowDetailDialog(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--bg-muted)] flex items-center justify-center">
                        <GoodsIcon goodsId={contract.goodsId} size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {goods?.name || `商品#${contract.goodsId}`}
                          </span>
                          <Badge variant={isSupplier ? 'success' : 'warning'} size="sm">
                            {isSupplier ? '供应' : '采购'}
                          </Badge>
                        </div>
                        <div className="text-xs text-[var(--text-muted)]">
                          与 {contract.counterpartyName}
                        </div>
                      </div>
                    </div>
                    <Badge variant={statusConfig.variant} size="sm">
                      {getContractStatusName(contract.status)}
                    </Badge>
                  </div>

                  {/* 合同条款摘要 */}
                  <div className="grid grid-cols-3 gap-4 mb-3 text-xs">
                    <div>
                      <div className="text-[var(--text-muted)]">每期数量</div>
                      <div className="text-[var(--text-primary)] tabular-nums">
                        {contract.quantityPerPeriod.toFixed(0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)]">约定价格</div>
                      <div className="text-[var(--text-primary)] tabular-nums">
                        {formatMoney(contract.agreedPrice)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[var(--text-muted)]">履约评分</div>
                      <div className={`tabular-nums ${contract.performanceRating >= 80 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>
                        {contract.performanceRating.toFixed(0)}分
                      </div>
                    </div>
                  </div>

                  {/* 进度条 */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs text-[var(--text-muted)] mb-1">
                      <span>进度 {contract.currentPeriod}/{contract.totalPeriods} 期</span>
                      <span>{(progress * 100).toFixed(0)}%</span>
                    </div>
                    <ProgressBar
                      value={progress * 100}
                      max={100}
                      size="sm"
                      color={contract.status === ContractStatus.ACTIVE ? 'success' : 'info'}
                    />
                  </div>

                  {/* 金额统计 */}
                  <div className="flex justify-between text-xs pt-2 border-t border-[var(--border-muted)]">
                    <span className="text-[var(--text-muted)]">
                      已{isSupplier ? '收入' : '支出'}: {formatMoney(contract.totalValue)}
                    </span>
                    <span className="text-[var(--text-muted)]">
                      剩余: {formatMoney(valueInfo.remainingValue)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 合同详情弹窗 */}
      <ContractDetailDialog
        contract={selectedContract}
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        currentTick={tick}
      />

      {/* 新建合同弹窗 */}
      <NewContractDialog
        open={showNewContractDialog}
        onOpenChange={setShowNewContractDialog}
        companyId={companyId}
        currentTick={tick}
      />
    </div>
  );
};

// ==================== 合同详情弹窗 ====================

interface ContractDetailDialogProps {
  contract: SupplyContract | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTick: number;
}

const ContractDetailDialog: React.FC<ContractDetailDialogProps> = ({
  contract,
  open,
  onOpenChange,
  currentTick,
}) => {
  if (!contract) return null;

  const goods = ALL_GOODS.find(g => g.id === contract.goodsId);
  const deliveries = supplyContractManager.getContractDeliveries(contract.id);
  const valueInfo = supplyContractManager.calculateContractValue(contract);
  const isSupplier = contract.myRole === ContractRole.SUPPLIER;

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const getDeliveryStatusConfig = (status: DeliveryRecord['status']) => {
    const configs = {
      scheduled: { variant: 'outline' as const, text: '待交付', color: 'var(--text-muted)' },
      delivered: { variant: 'success' as const, text: '已完成', color: 'var(--success)' },
      partial: { variant: 'warning' as const, text: '部分交付', color: 'var(--warning)' },
      missed: { variant: 'error' as const, text: '未交付', color: 'var(--error)' },
    };
    return configs[status];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg" variant="game">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GoodsIcon goodsId={contract.goodsId} size={24} />
            {goods?.name} {isSupplier ? '供应' : '采购'}合同 #{contract.id}
          </DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4 max-h-[60vh] overflow-y-auto">
          {/* 基本信息 */}
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3">📋 合同条款</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">交易对手：</span>
                <span className="text-[var(--text-primary)]">{contract.counterpartyName}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">我方角色：</span>
                <span className={isSupplier ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                  {isSupplier ? '供应商' : '采购方'}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">每期数量：</span>
                <span className="text-[var(--text-primary)] tabular-nums">{contract.quantityPerPeriod.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">周期天数：</span>
                <span className="text-[var(--text-primary)] tabular-nums">{contract.periodDays} 天</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">定价模式：</span>
                <span className="text-[var(--text-primary)]">{getPricingModeName(contract.pricingMode)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">约定价格：</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatMoney(contract.agreedPrice)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">违约金率：</span>
                <span className="text-[var(--text-primary)]">{(contract.penaltyRate * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">宽限期：</span>
                <span className="text-[var(--text-primary)]">{contract.gracePeriodDays} 天</span>
              </div>
            </div>
          </Card>

          {/* 履约统计 */}
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3">📊 履约统计</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-[var(--text-muted)]">已交付期数：</span>
                <span className="text-[var(--text-primary)] tabular-nums">
                  {contract.currentPeriod} / {contract.totalPeriods}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">总交付量：</span>
                <span className="text-[var(--text-primary)] tabular-nums">{contract.totalDelivered.toFixed(0)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">累计金额：</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatMoney(contract.totalValue)}</span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">未交付次数：</span>
                <span className={contract.missedDeliveries > 0 ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}>
                  {contract.missedDeliveries}
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">履约评分：</span>
                <span className={contract.performanceRating >= 80 ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                  {contract.performanceRating.toFixed(0)} 分
                </span>
              </div>
              <div>
                <span className="text-[var(--text-muted)]">剩余价值：</span>
                <span className="text-[var(--text-primary)] tabular-nums">{formatMoney(valueInfo.remainingValue)}</span>
              </div>
            </div>
          </Card>

          {/* 交付记录 */}
          <Card variant="elevated" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-3">📦 交付记录</h4>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {deliveries.map((delivery) => {
                const config = getDeliveryStatusConfig(delivery.status);
                return (
                  <div
                    key={`${delivery.contractId}-${delivery.period}`}
                    className="flex items-center justify-between text-xs p-2 rounded bg-[var(--bg-muted)]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-muted)]">第{delivery.period + 1}期</span>
                      <Badge variant={config.variant} size="sm">{config.text}</Badge>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-[var(--text-muted)] tabular-nums">
                        {delivery.actualQuantity > 0 ? delivery.actualQuantity.toFixed(0) : delivery.quantity.toFixed(0)}
                      </span>
                      <span className="text-[var(--text-primary)] tabular-nums">
                        {formatMoney(delivery.value)}
                      </span>
                      {delivery.penalty && delivery.penalty > 0 && (
                        <span className="text-[var(--error)] tabular-nums">
                          -{formatMoney(delivery.penalty)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            关闭
          </Button>
          {contract.status === ContractStatus.ACTIVE && (
            <Button variant="primary" className="bg-[var(--error)]">
              终止合同
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ==================== 新建合同弹窗 ====================

interface NewContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companyId: number;
  currentTick: number;
}

const NewContractDialog: React.FC<NewContractDialogProps> = ({
  open,
  onOpenChange,
  companyId,
  currentTick,
}) => {
  const { addNotification } = useGameStore();
  const [role, setRole] = useState<ContractRole>(ContractRole.SUPPLIER);
  const [goodsId, setGoodsId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(100);
  const [periodDays, setPeriodDays] = useState<number>(7);
  const [totalPeriods, setTotalPeriods] = useState<number>(4);
  const [price, setPrice] = useState<number>(100);

  const handleCreate = () => {
    // 创建合同提案（目标AI公司ID暂时设为1）
    const proposal = supplyContractManager.createProposal(
      companyId,
      1, // 目标公司
      role,
      goodsId,
      quantity,
      periodDays,
      totalPeriods,
      price,
      currentTick
    );

    // 自动接受（简化流程）
    const contract = supplyContractManager.acceptProposal(proposal.id, currentTick);

    if (contract) {
      addNotification('success', `合同已创建！#${contract.id}`);
      onOpenChange(false);
    } else {
      addNotification('error', '合同创建失败');
    }
  };

  const formatMoney = (value: number) => {
    if (Math.abs(value) >= 1000000) return `¥${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `¥${(value / 1000).toFixed(1)}K`;
    return `¥${value.toFixed(0)}`;
  };

  const totalValue = quantity * price * totalPeriods;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" variant="game">
        <DialogHeader>
          <DialogTitle>📝 新建供应合同</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          {/* 角色选择 */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-2 block">我方角色</label>
            <div className="flex gap-2">
              <Button
                variant={role === ContractRole.SUPPLIER ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setRole(ContractRole.SUPPLIER)}
              >
                供应商（卖方）
              </Button>
              <Button
                variant={role === ContractRole.BUYER ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setRole(ContractRole.BUYER)}
              >
                采购方（买方）
              </Button>
            </div>
          </div>

          {/* 商品选择 */}
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-2 block">交易商品</label>
            <select
              className="w-full p-2 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-muted)]"
              value={goodsId}
              onChange={(e) => setGoodsId(Number(e.target.value))}
            >
              {ALL_GOODS.slice(0, 30).map((goods) => (
                <option key={goods.id} value={goods.id}>
                  {goods.name}
                </option>
              ))}
            </select>
          </div>

          {/* 数量和周期 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-2 block">每期数量</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-muted)]"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-2 block">周期天数</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-muted)]"
                value={periodDays}
                onChange={(e) => setPeriodDays(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>

          {/* 总周期和价格 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-2 block">总周期数</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-muted)]"
                value={totalPeriods}
                onChange={(e) => setTotalPeriods(Number(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-muted)] mb-2 block">约定价格</label>
              <input
                type="number"
                className="w-full p-2 rounded bg-[var(--bg-muted)] text-[var(--text-primary)] border border-[var(--border-muted)]"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          {/* 合同概要 */}
          <Card variant="default" status="info" padding="md">
            <h4 className="text-xs font-medium text-[var(--text-primary)] mb-2">📊 合同概要</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">合同期限</span>
                <span className="text-[var(--text-primary)]">{periodDays * totalPeriods} 天</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">总数量</span>
                <span className="text-[var(--text-primary)]">{quantity * totalPeriods}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">合同总价值</span>
                <span className={role === ContractRole.SUPPLIER ? 'text-[var(--success)]' : 'text-[var(--warning)]'}>
                  {formatMoney(totalValue)}
                </span>
              </div>
            </div>
          </Card>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button variant="gradient" onClick={handleCreate}>
            ✅ 创建合同
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ContractListPanel;