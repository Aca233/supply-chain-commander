import React, { useState } from 'react';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@/ui/design-system';

export interface BankruptcyResolutionAssetView {
  id: string;
  label: string;
  assetType: 'building' | 'inventory';
  reservePrice: number;
  currentHighestBid: number;
  playerBid: number;
  state: 'queued' | 'open' | 'pending_confirmation' | 'sold' | 'unsold' | 'destroyed';
  pendingConfirmDays?: number;
}

export interface BankruptcyResolutionEventView {
  id: string;
  companyName: string;
  reasonLabel: string;
  statusLabel: string;
  remainingDays: number;
  debtSnapshot: number;
  stockStateLabel: string;
  assets: BankruptcyResolutionAssetView[];
}

export interface BankruptcyResolutionPanelProps {
  strategy: {
    mode: 'auto_participate' | 'notify_only' | 'never_participate';
    eventBudgetCap: number;
    assetBudgetCap: number;
    autoTrackSameIndustry: boolean;
  };
  events: BankruptcyResolutionEventView[];
  onStrategyChange: (patch: Partial<BankruptcyResolutionPanelProps['strategy']>) => void;
  onPlaceBid: (eventId: string, assetId: string, amount: number) => void;
  onConfirmPendingPurchase: (eventId: string, assetId: string) => void;
}

const STRATEGY_LABELS: Record<BankruptcyResolutionPanelProps['strategy']['mode'], string> = {
  auto_participate: '自动参与',
  notify_only: '只提示',
  never_participate: '永不参与',
};

const ASSET_STATE_LABELS: Record<BankruptcyResolutionAssetView['state'], string> = {
  queued: '待开拍',
  open: '竞拍中',
  pending_confirmation: '待确认',
  sold: '已成交',
  unsold: '流拍',
  destroyed: '已处置',
};

function formatCurrency(value: number): string {
  return `¥${Math.max(0, value).toLocaleString()}`;
}

function getHighestBidLabel(asset: BankruptcyResolutionAssetView): string {
  return asset.currentHighestBid > 0 ? formatCurrency(asset.currentHighestBid) : '暂无出价';
}

function getInitialBid(asset: BankruptcyResolutionAssetView): number {
  return Math.max(asset.reservePrice, asset.currentHighestBid + 1, asset.playerBid || 0);
}

export const BankruptcyResolutionPanel: React.FC<BankruptcyResolutionPanelProps> = ({
  strategy,
  events,
  onStrategyChange,
  onPlaceBid,
  onConfirmPendingPurchase,
}) => {
  const [draftBids, setDraftBids] = useState<Record<string, number>>({});

  return (
    <div className="space-y-4">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>⚖️ 破产资产处置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="text-sm font-medium text-[var(--text-primary)]">默认参与模式</div>
              <Select
                value={strategy.mode}
                onValueChange={(value) => onStrategyChange({ mode: value as BankruptcyResolutionPanelProps['strategy']['mode'] })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择参与模式" />
                </SelectTrigger>
                <SelectContent variant="game">
                  <SelectItem value="auto_participate">{STRATEGY_LABELS.auto_participate}</SelectItem>
                  <SelectItem value="notify_only">{STRATEGY_LABELS.notify_only}</SelectItem>
                  <SelectItem value="never_participate">{STRATEGY_LABELS.never_participate}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border border-[var(--border-muted)] p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-sm font-medium text-[var(--text-primary)]">自动关注同行业资产</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    只影响自动参与策略的预出价筛选，成交前仍需手动确认。
                  </div>
                </div>
                <Switch
                  checked={strategy.autoTrackSameIndustry}
                  onCheckedChange={(checked) => onStrategyChange({ autoTrackSameIndustry: checked })}
                  variant="game"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border border-[var(--border-muted)] p-4">
              <div className="text-xs text-[var(--text-muted)]">单次事件预算上限</div>
              <Input
                type="number"
                min={0}
                value={strategy.eventBudgetCap}
                onChange={(event) => onStrategyChange({ eventBudgetCap: Number(event.target.value) || 0 })}
              />
            </div>
            <div className="rounded-lg border border-[var(--border-muted)] p-4">
              <div className="text-xs text-[var(--text-muted)]">单个资产预算上限</div>
              <Input
                type="number"
                min={0}
                value={strategy.assetBudgetCap}
                onChange={(event) => onStrategyChange({ assetBudgetCap: Number(event.target.value) || 0 })}
              />
            </div>
          </div>

          {events.length === 0 ? (
            <div className="rounded-lg border border-dashed border-[var(--border-muted)] p-6 text-sm text-[var(--text-muted)]">
              当前没有进行中的破产资产处置事件。
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => (
                <Card key={event.id} variant="game">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3 w-full">
                      <div className="space-y-1">
                        <CardTitle>{event.companyName}</CardTitle>
                        <div className="text-xs text-[var(--text-muted)]">
                          {event.reasonLabel} | {event.statusLabel}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="warning">剩余 {event.remainingDays}天</Badge>
                        <Badge variant="outline">{event.stockStateLabel}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="rounded-lg bg-[var(--bg-muted)] p-3">
                        <div className="text-xs text-[var(--text-muted)]">债务快照</div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {formatCurrency(event.debtSnapshot)}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-muted)] p-3">
                        <div className="text-xs text-[var(--text-muted)]">资产数量</div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {event.assets.length} 项
                        </div>
                      </div>
                      <div className="rounded-lg bg-[var(--bg-muted)] p-3">
                        <div className="text-xs text-[var(--text-muted)]">当前策略</div>
                        <div className="text-sm font-medium text-[var(--text-primary)]">
                          {STRATEGY_LABELS[strategy.mode]}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {event.assets.map((asset) => {
                        const nextBid = draftBids[asset.id] ?? getInitialBid(asset);
                        const isOpen = asset.state === 'open';
                        const isPendingConfirmation = asset.state === 'pending_confirmation';
                        const isClosed = !isOpen && !isPendingConfirmation;

                        return (
                          <div
                            key={asset.id}
                            className="rounded-lg border border-[var(--border-muted)] p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="font-medium text-[var(--text-primary)]">{asset.label}</div>
                                  <Badge variant={isPendingConfirmation ? 'warning' : isClosed ? 'outline' : 'success'}>
                                    {ASSET_STATE_LABELS[asset.state]}
                                  </Badge>
                                </div>
                                <div className="text-xs text-[var(--text-muted)]">
                                  保留价 {formatCurrency(asset.reservePrice)} | 当前最高价 {getHighestBidLabel(asset)}
                                </div>
                                {asset.playerBid > 0 && (
                                  <div className="text-xs text-[var(--text-muted)]">
                                    你的最高出价 {formatCurrency(asset.playerBid)}
                                  </div>
                                )}
                                {isPendingConfirmation && asset.pendingConfirmDays !== undefined && (
                                  <div className="text-xs text-[var(--warning)]">
                                    请在 {asset.pendingConfirmDays} 天内确认成交，否则将顺延给下一位竞拍者。
                                  </div>
                                )}
                              </div>

                              {isPendingConfirmation ? (
                                <Button onClick={() => onConfirmPendingPurchase(event.id, asset.id)}>
                                  确认成交
                                </Button>
                              ) : isOpen ? (
                                <div className="flex flex-wrap items-center gap-2">
                                  <Input
                                    type="number"
                                    min={getInitialBid(asset)}
                                    value={nextBid}
                                    onChange={(event) => {
                                      const value = Number(event.target.value);
                                      setDraftBids((current) => ({
                                        ...current,
                                        [asset.id]: Number.isFinite(value) ? value : 0,
                                      }));
                                    }}
                                    className="w-36"
                                  />
                                  <Button
                                    onClick={() => onPlaceBid(event.id, asset.id, nextBid)}
                                  >
                                    出价
                                  </Button>
                                </div>
                              ) : (
                                <div className="text-xs text-[var(--text-muted)]">
                                  {asset.state === 'queued'
                                    ? '资产正在清点，开拍后可参与出价。'
                                    : asset.state === 'sold'
                                      ? '拍卖已成交。'
                                      : '本轮拍卖已结束。'}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BankruptcyResolutionPanel;
