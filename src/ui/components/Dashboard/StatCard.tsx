import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: string;
  suffix?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  icon,
  suffix = '',
}) => {
  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-chart-up';
    if (change < 0) return 'text-chart-down';
    return 'text-chart-neutral';
  };

  const formatChange = (change: number) => {
    const sign = change > 0 ? '+' : '';
    return `${sign}${(change * 100).toFixed(1)}%`;
  };

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-tertiary">{title}</p>
          <p className="text-2xl font-semibold text-text-primary mt-1 tabular-nums">
            {value}
            {suffix && <span className="text-base font-normal ml-1">{suffix}</span>}
          </p>
          {change !== undefined && (
            <p className={`text-sm mt-1 ${getChangeColor(change)}`}>
              {formatChange(change)}
            </p>
          )}
        </div>
        <div className="text-2xl">{icon}</div>
      </div>
    </div>
  );
};

export default StatCard;