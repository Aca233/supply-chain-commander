/**
 * 建筑详情展开面板
 *
 * 点击建筑卡片后在原位置展开。信息结构按经营决策排序：
 * 生产链、生产方式与产量、经营拆账，劳动力压缩为底部工资条。
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGameStore, type LaborRoleKey } from '@/stores/gameStore';
import { BuildingIcon, GoodsIcon } from '@/ui/components/Icons';
import { ProductionMethodsPanel } from './ProductionMethodsPanel';
import { UpgradeConfirmDialog } from './BuildingUpgradePanel';
import { useBuildingData } from '@/ui/hooks/useBuildingData';
import { formatMoneyCompact } from '@/ui/utils/format';
import {
  STATUS_STYLES,
  coverageColor,
} from './buildingCardConfig';
import {
  Button, Badge, ProgressBar, Switch, Slider,
} from '@/ui/design-system';

interface Props {
  buildingIndex: number;
  onClose: () => void;
}

const LABOR_ROLES: LaborRoleKey[] = ['basic', 'technical', 'management'];

const sectionShellClass = 'min-w-0 rounded-lg border border-white/[0.08] bg-white/[0.025] p-3';
const sectionHeadingClass = 'text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38';
const rowClass = 'min-w-0 rounded-md border border-white/[0.06] bg-black/[0.12] px-2.5 py-2';

function coverageCssColor(rate: number): string {
  if (rate >= 1) return 'var(--success)';
  if (rate >= 0.7) return 'var(--warning)';
  return 'var(--error)';
}

function formatSignedMoney(value: number): string {
  return `${value >= 0 ? '+' : ''}${formatMoneyCompact(value)}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(0)}%`;
}

function KpiCell({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'good' | 'bad' | 'warning';
}) {
  const toneClass = {
    neutral: 'text-white/82',
    good: 'text-[var(--success)]',
    bad: 'text-[var(--error)]',
    warning: 'text-[var(--warning)]',
  }[tone];

  return (
    <div className="min-w-[82px] border-l border-white/[0.08] pl-3">
      <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-white/28">{label}</div>
      <div className={`mt-0.5 text-sm font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}

function FinancialRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'neutral' | 'good' | 'bad' | 'muted';
}) {
  const toneClass = {
    neutral: 'text-white/78',
    good: 'text-[var(--success)]',
    bad: 'text-[var(--error)]',
    muted: 'text-white/45',
  }[tone];

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.055] py-2 last:border-b-0">
      <span className="text-[11px] text-white/42">{label}</span>
      <span className={`text-sm font-semibold tabular-nums ${toneClass}`}>{value}</span>
    </div>
  );
}

export const BuildingCardExpanded: React.FC<Props> = ({ buildingIndex, onClose }) => {
  const data = useBuildingData(buildingIndex);
  const {
    upgradeBuilding, toggleBuildingActive, demolishBuilding,
    getBuildingProductionControl, setBuildingProductionControlAuto,
    setBuildingManualProductionTarget, getBuildingLaborView,
    setBuildingLaborWageMultiplier, setSelectedGoods, setCurrentPage,
  } = useGameStore();

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [confirmDemolish, setConfirmDemolish] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const pc = getBuildingProductionControl(buildingIndex);
  const lv = getBuildingLaborView(buildingIndex);
  const owned = pc?.ownerCompanyId === 0;

  useEffect(() => {
    panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [buildingIndex]);

  useEffect(() => { setConfirmDemolish(false); }, [buildingIndex]);

  const goMarket = useCallback(
    (gid: number) => () => { setSelectedGoods(gid); setCurrentPage('market'); },
    [setSelectedGoods, setCurrentPage],
  );
  const onAutoAdjust = useCallback(
    (v: boolean) => setBuildingProductionControlAuto(buildingIndex, v),
    [buildingIndex, setBuildingProductionControlAuto],
  );
  const onManualTarget = useCallback(
    (v: number[]) => { if (v.length) setBuildingManualProductionTarget(buildingIndex, v[0] / 100); },
    [buildingIndex, setBuildingManualProductionTarget],
  );
  const onWage = useCallback(
    (r: LaborRoleKey) => (v: number[]) => {
      if (v.length) setBuildingLaborWageMultiplier(buildingIndex, r, v[0] / 100);
    },
    [buildingIndex, setBuildingLaborWageMultiplier],
  );
  const onDemolish = useCallback(() => {
    if (!confirmDemolish) { setConfirmDemolish(true); return; }
    demolishBuilding(buildingIndex);
    setConfirmDemolish(false);
    onClose();
  }, [buildingIndex, confirmDemolish, demolishBuilding, onClose]);

  if (!data) return null;

  const st = STATUS_STYLES[data.status];
  const eff = Math.round(data.efficiency * 100);
  const profitTone = data.dailyProfit >= 0 ? 'good' : 'bad';

  return (
    <div ref={panelRef} className="col-span-full">
      <div className="overflow-hidden rounded-lg border border-white/[0.10] bg-[#101419] shadow-[0_18px_48px_rgba(0,0,0,0.38)]">
        <div className={`border-l-4 ${st.borderColor}`}>
          <header className="flex flex-col gap-3 border-b border-white/[0.08] bg-[#131820] px-3 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.10] bg-white/[0.045]">
                <BuildingIcon buildingId={data.typeId} size={24} autoColor />
              </div>

              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">{data.name}</h3>
                  <span className="rounded border border-white/[0.10] bg-white/[0.04] px-1.5 py-[1px] text-[10px] font-medium tabular-nums text-white/50">
                    Lv.{data.level}
                  </span>
                  <Badge variant={st.badge} size="xs" dot>{st.label}</Badge>
                </div>
                <div className="mt-1 truncate text-[11px] text-white/38">{data.productionName}</div>
              </div>
            </div>

            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <KpiCell label="日利润" value={`${formatSignedMoney(data.dailyProfit)}/日`} tone={profitTone} />
                <KpiCell label="效率" value={`${eff}%`} tone={eff >= 80 ? 'good' : eff >= 50 ? 'warning' : 'bad'} />
                <KpiCell label="收入" value={formatMoneyCompact(data.dailyRevenue)} tone="good" />
                <KpiCell label="成本" value={formatMoneyCompact(data.dailyCost)} tone="bad" />
                <KpiCell label="利润率" value={formatPercent(data.profitMargin)} tone={profitTone} />
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Button
                  variant={data.isActive ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={() => toggleBuildingActive(buildingIndex)}
                  disabled={!owned}
                >
                  {data.isActive ? '暂停' : '恢复'}
                </Button>
                {data.level < data.maxLevel ? (
                  <Button
                    variant="gradient"
                    size="sm"
                    onClick={() => setShowUpgradeModal(true)}
                    disabled={!data.canUpgrade || !owned}
                  >
                    升级 Lv.{data.level + 1}
                    <span className="ml-1 text-[10px] opacity-60">{formatMoneyCompact(data.upgradeCost)}</span>
                  </Button>
                ) : (
                  <Badge variant="warning" size="sm">满级</Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDemolish}
                  disabled={!owned}
                  className={confirmDemolish ? 'border-[var(--error)]/25 text-[var(--error)]' : ''}
                >
                  {confirmDemolish ? '确认拆除？' : '拆除'}
                </Button>
                <button
                  type="button"
                  aria-label="关闭建筑详情"
                  onClick={onClose}
                  className="h-8 w-8 rounded-lg border border-white/[0.08] bg-white/[0.035] text-sm text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/75"
                >
                  ×
                </button>
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 items-start gap-3 p-3 xl:grid-cols-12">
            <section className={`${sectionShellClass} xl:col-span-5`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className={sectionHeadingClass}>生产链</h4>
                {data.hasBottleneck && (
                  <Badge variant="error" size="xs">缺料</Badge>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                <div className="min-w-0">
                  <div className="mb-2 text-[10px] font-medium text-white/35">投入</div>
                  <div className="space-y-1.5">
                    {!data.isRetail && data.inputs.length > 0 ? (
                      data.inputs.map(inp => {
                        const isShort = inp.percentage < 1;

                        return (
                          <button
                            key={inp.goodsId}
                            type="button"
                            className={`${rowClass} w-full text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.045] ${isShort ? 'border-[var(--error)]/25 bg-[var(--error)]/[0.045]' : ''}`}
                            onClick={goMarket(inp.goodsId)}
                          >
                            <div className="mb-1.5 flex min-w-0 items-center justify-between gap-2">
                              <span className="flex min-w-0 items-center gap-1.5">
                                <GoodsIcon goodsId={inp.goodsId} size={14} />
                                <span className="truncate text-xs font-medium text-white/82">{inp.name}</span>
                              </span>
                              <span className={`shrink-0 text-[10px] tabular-nums ${isShort ? 'text-[var(--error)]' : 'text-white/45'}`}>
                                {inp.current.toFixed(0)}/{inp.required.toFixed(0)}
                              </span>
                            </div>
                            <ProgressBar
                              value={inp.percentage * 100}
                              max={100}
                              size="xs"
                              color={coverageColor(inp.percentage)}
                            />
                            <div className="mt-1 flex items-center justify-between text-[10px] text-white/32">
                              <span>日需</span>
                              <span className="tabular-nums">{inp.dailyNeed.toFixed(0)}</span>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className={`${rowClass} text-xs text-white/35`}>
                        {data.isRetail ? '零售建筑不显示生产投入' : '无生产投入'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="mb-2 text-[10px] font-medium text-white/35">产出</div>
                  <div className="space-y-1.5">
                    {data.outputs.length > 0 ? (
                      data.outputs.map(out => (
                        <button
                          key={out.goodsId}
                          type="button"
                          className={`${rowClass} w-full text-left transition-colors hover:border-white/[0.12] hover:bg-white/[0.045]`}
                          onClick={goMarket(out.goodsId)}
                        >
                          <div className="mb-1 flex min-w-0 items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <GoodsIcon goodsId={out.goodsId} size={14} />
                              <span className="truncate text-xs font-medium text-white/82">{out.name}</span>
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold tabular-nums text-[var(--success)]">
                              +{out.dailyAmount.toFixed(0)}/日
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-white/35">
                            <span>库存 {out.buffer.toFixed(0)}</span>
                            <span className="tabular-nums">¥{out.price.toFixed(0)}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className={`${rowClass} text-xs text-white/35`}>暂无产出</div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className={`${sectionShellClass} xl:col-span-4`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className={sectionHeadingClass}>生产方式与产量</h4>
                {pc && (
                  <span className="text-[10px] text-white/35">
                    {pc.autoAdjustEnabled ? '自动' : '手动'}
                  </span>
                )}
              </div>

              <ProductionMethodsPanel
                buildingId={buildingIndex}
                buildingTypeId={data.typeId}
                buildingLevel={data.level}
                compact
              />

              {pc && (
                <div className="mt-2 rounded-md border border-white/[0.065] bg-black/[0.13] px-2.5 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="min-w-0 text-[11px] font-medium text-white/70">自动产量</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[10px] tabular-nums text-white/36">
                        {pc.autoAdjustEnabled ? '开启' : `${Math.round(pc.manualTarget * 100)}%`}
                      </span>
                    <Switch
                      checked={pc.autoAdjustEnabled}
                      onCheckedChange={onAutoAdjust}
                      disabled={!pc.canManage}
                      variant="game"
                    />
                    </div>
                  </div>

                  {!pc.autoAdjustEnabled && (
                    <div className="mt-2">
                      <Slider
                        value={[Math.round(pc.manualTarget * 100)]}
                        min={pc.manualTargetRange.min * 100}
                        max={pc.manualTargetRange.max * 100}
                        step={1}
                        onValueChange={onManualTarget}
                        label="手动产量"
                        showValue
                        formatValue={v => `${Math.round(v)}%`}
                        variant="game"
                        color="warning"
                        disabled={!pc.canManage}
                      />
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className={`${sectionShellClass} xl:col-span-3`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className={sectionHeadingClass}>经营拆账</h4>
                <span className="text-[10px] text-white/32">日度估算</span>
              </div>

              <div className="rounded-lg border border-white/[0.065] bg-black/[0.12] px-3">
                <FinancialRow label="销售收入" value={formatMoneyCompact(data.dailyRevenue)} tone="good" />
                <FinancialRow label="运营成本" value={formatMoneyCompact(data.dailyCost)} tone="bad" />
                {lv && (
                  <FinancialRow label="预计月薪" value={formatMoneyCompact(lv.estimatedMonthlyPayroll)} tone="muted" />
                )}
                <FinancialRow
                  label="日利润"
                  value={formatSignedMoney(data.dailyProfit)}
                  tone={data.dailyProfit >= 0 ? 'good' : 'bad'}
                />
                <FinancialRow
                  label="利润率"
                  value={formatPercent(data.profitMargin)}
                  tone={data.dailyProfit >= 0 ? 'good' : 'bad'}
                />
              </div>
            </section>
          </div>

          {lv ? (
            <section className="border-t border-white/[0.08] bg-black/[0.18] px-3 py-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className={sectionHeadingClass}>劳动力与工资</h4>
                  <span
                    className="text-xs font-semibold tabular-nums"
                    style={{ color: coverageCssColor(lv.coverage) }}
                  >
                    覆盖 {(lv.coverage * 100).toFixed(0)}%
                  </span>
                  {lv.bottleneckRole && (
                    <Badge variant="warning" size="xs">瓶颈: {lv.roles[lv.bottleneckRole].name}</Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/36">
                  <span>预计月薪 {formatMoneyCompact(lv.estimatedMonthlyPayroll)}</span>
                  <span>已计提 {formatMoneyCompact(lv.accruedPayroll)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
                {LABOR_ROLES.map(role => {
                  const r = lv.roles[role];

                  return (
                    <div key={role} className="rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-2">
                      <div className="mb-1.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium text-white/70">{r.name}</span>
                        <span className="text-[10px] tabular-nums text-white/42">
                          {r.hired.toFixed(0)}/{r.activeDemand.toFixed(0)}
                          {r.shortage > 0 && (
                            <span className="ml-1 font-medium text-[var(--error)]">缺{r.shortage.toFixed(0)}</span>
                          )}
                        </span>
                      </div>
                      <ProgressBar
                        value={r.coverage * 100}
                        max={100}
                        size="xs"
                        color={coverageColor(r.coverage)}
                      />
                      <div className="mt-2">
                        <Slider
                          value={[Math.round(r.wageMultiplier * 100)]}
                          min={50}
                          max={200}
                          step={5}
                          onValueChange={onWage(role)}
                          label={`${r.name}工资`}
                          showValue
                          formatValue={v => `${(v / 100).toFixed(2)}x`}
                          variant="game"
                          color="info"
                          disabled={!pc?.canManage}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <section className="border-t border-white/[0.08] bg-black/[0.18] px-3 py-2 text-xs text-white/35">
              暂无劳动力数据
            </section>
          )}
        </div>
      </div>

      <UpgradeConfirmDialog
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        buildingIndex={buildingIndex}
        onConfirm={() => { upgradeBuilding(buildingIndex); setShowUpgradeModal(false); }}
      />
    </div>
  );
};

export default BuildingCardExpanded;
