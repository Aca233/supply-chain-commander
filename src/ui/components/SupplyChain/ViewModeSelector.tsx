/**
 * 视图模式选择器
 * 切换产业视图、层级视图、追溯视图
 */

import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/ui/design-system';

export type ViewMode = 'industry' | 'tier' | 'trace';

export interface ViewModeSelectorProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export const ViewModeSelector: React.FC<ViewModeSelectorProps> = ({
  value,
  onChange,
}) => {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as ViewMode)}>
      <TabsList variant="default" size="sm">
        <TabsTrigger value="industry" className="flex items-center gap-1.5">
          <span>🏭</span>
          <span>产业视图</span>
        </TabsTrigger>
        <TabsTrigger value="tier" className="flex items-center gap-1.5">
          <span>📊</span>
          <span>层级视图</span>
        </TabsTrigger>
        <TabsTrigger value="trace" className="flex items-center gap-1.5">
          <span>🔍</span>
          <span>追溯视图</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
};