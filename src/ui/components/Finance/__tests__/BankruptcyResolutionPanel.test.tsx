import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { BankruptcyResolutionPanel } from '../BankruptcyResolutionPanel';

vi.mock('@/ui/design-system', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => React.createElement('button', { onClick, ...props }, children),
  Card: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => React.createElement('section', props, children),
  CardHeader: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => React.createElement('header', props, children),
  CardTitle: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLElement>) => React.createElement('h2', props, children),
  CardContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', props, children),
  Badge: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLSpanElement>) => React.createElement('span', props, children),
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => React.createElement('input', props),
  Select: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', props, children),
  SelectTrigger: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLButtonElement>) => React.createElement('button', props, children),
  SelectValue: ({ children }: { children?: React.ReactNode }) => React.createElement('span', null, children),
  SelectContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => React.createElement('div', props, children),
  SelectItem: ({
    children,
    value,
    ...props
  }: React.HTMLAttributes<HTMLDivElement> & { value: string }) => React.createElement('div', { 'data-value': value, ...props }, children),
  Switch: ({
    checked,
    onCheckedChange,
    ...props
  }: {
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
  } & React.ButtonHTMLAttributes<HTMLButtonElement>) => React.createElement(
    'button',
    {
      type: 'button',
      'aria-pressed': checked,
      onClick: () => onCheckedChange?.(!checked),
      ...props,
    },
    checked ? '开' : '关',
  ),
}));

describe('BankruptcyResolutionPanel', () => {
  it('renders day-based event cards and exposes confirmation actions', () => {
    const html = renderToStaticMarkup(
      <BankruptcyResolutionPanel
        strategy={{
          mode: 'auto_participate',
          eventBudgetCap: 800_000,
          assetBudgetCap: 200_000,
          autoTrackSameIndustry: true,
        }}
        events={[
          {
            id: 'bk-1',
            companyName: '破产AI',
            reasonLabel: '现金流断裂',
            statusLabel: '公开竞拍中',
            remainingDays: 3,
            debtSnapshot: 600_000,
            stockStateLabel: '停牌中',
            assets: [
              {
                id: 'asset-1',
                label: '铁矿场 #1',
                assetType: 'building',
                reservePrice: 300_000,
                currentHighestBid: 250_000,
                playerBid: 250_000,
                state: 'pending_confirmation',
                pendingConfirmDays: 1,
              },
            ],
          },
        ]}
        onStrategyChange={vi.fn()}
        onPlaceBid={vi.fn()}
        onConfirmPendingPurchase={vi.fn()}
      />,
    );

    expect(html).toContain('破产AI');
    expect(html).toContain('剩余 3天');
    expect(html).toContain('确认成交');
    expect(html).not.toContain('小时');
  });

  it('shows no-bid copy and closed-auction guidance instead of a zero bid price', () => {
    const html = renderToStaticMarkup(
      <BankruptcyResolutionPanel
        strategy={{
          mode: 'notify_only',
          eventBudgetCap: 0,
          assetBudgetCap: 0,
          autoTrackSameIndustry: false,
        }}
        events={[
          {
            id: 'bk-2',
            companyName: '破产矿业',
            reasonLabel: '资不抵债',
            statusLabel: '公开竞拍中',
            remainingDays: 12,
            debtSnapshot: 800_000,
            stockStateLabel: '停牌中',
            assets: [
              {
                id: 'asset-open',
                label: '铝矿场 #275',
                assetType: 'building',
                reservePrice: 160_000,
                currentHighestBid: 0,
                playerBid: 0,
                state: 'open',
              },
              {
                id: 'asset-closed',
                label: '铜矿场 #120',
                assetType: 'building',
                reservePrice: 200_000,
                currentHighestBid: 0,
                playerBid: 0,
                state: 'destroyed',
              },
            ],
          },
        ]}
        onStrategyChange={vi.fn()}
        onPlaceBid={vi.fn()}
        onConfirmPendingPurchase={vi.fn()}
      />,
    );

    expect(html).toContain('当前最高价 暂无出价');
    expect(html).toContain('本轮拍卖已结束');
    expect(html).not.toContain('当前最高价 ¥0');
  });
});
