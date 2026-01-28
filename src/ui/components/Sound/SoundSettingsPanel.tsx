/**
 * 音效设置面板组件
 * 提供完整的音效控制界面
 * 使用统一设计系统，支持主题切换
 */

import React, { useCallback } from 'react';
import { useSound } from '@/ui/hooks/useSound';
import { soundManager } from '@/core/sound';
import { Card, CardHeader, CardTitle, CardContent, Button, Switch } from '@/ui/design-system';

interface VolumeSliderProps {
  label: string;
  description: string;
  value: number;
  onChange: (value: number) => void;
  icon?: React.ReactNode;
  disabled?: boolean;
}

function VolumeSlider({ 
  label, 
  description, 
  value, 
  onChange, 
  icon,
  disabled = false 
}: VolumeSliderProps) {
  const percentage = Math.round(value * 100);
  
  return (
    <div className={`flex items-center justify-between py-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        {icon && <div className="text-xl">{icon}</div>}
        <div>
          <div className="text-[var(--text-primary)] font-medium">{label}</div>
          <div className="text-sm text-[var(--text-muted)]">{description}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0"
          max="100"
          value={percentage}
          onChange={(e) => onChange(Number(e.target.value) / 100)}
          disabled={disabled}
          className="w-32 h-2 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${percentage}%, var(--bg-muted) ${percentage}%, var(--bg-muted) 100%)`,
          }}
        />
        <span className="text-[var(--text-primary)] w-12 text-right tabular-nums">{percentage}%</span>
      </div>
    </div>
  );
}

interface SoundSettingsPanelProps {
  className?: string;
}

export function SoundSettingsPanel({ className = '' }: SoundSettingsPanelProps) {
  const { 
    settings, 
    setEnabled, 
    setMasterVolume, 
    setSFXVolume, 
    setUIVolume,
  } = useSound();
  
  // 测试音效
  const testSound = useCallback((type: 'click' | 'success' | 'error' | 'coin' | 'build') => {
    switch (type) {
      case 'click':
        soundManager.playClick();
        break;
      case 'success':
        soundManager.playNotifySuccess();
        break;
      case 'error':
        soundManager.playNotifyError();
        break;
      case 'coin':
        soundManager.playCoin();
        break;
      case 'build':
        soundManager.playBuildComplete();
        break;
    }
  }, []);
  
  return (
    <Card variant="elevated" className={className}>
      <CardHeader>
        <CardTitle>🔊 音效设置</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* 总开关 */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="text-xl">{settings.enabled ? '🔔' : '🔕'}</div>
            <div>
              <div className="text-[var(--text-primary)] font-medium">启用音效</div>
              <div className="text-sm text-[var(--text-muted)]">开启/关闭所有游戏音效</div>
            </div>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => {
              setEnabled(checked);
              if (checked) {
                setTimeout(() => soundManager.playClick(), 100);
              }
            }}
            variant="game"
          />
        </div>
        
        <div className="border-t border-[var(--border-default)] pt-4 space-y-2">
          {/* 主音量 */}
          <VolumeSlider
            label="主音量"
            description="控制所有音效的总体音量"
            value={settings.masterVolume}
            onChange={setMasterVolume}
            icon="🎚️"
            disabled={!settings.enabled}
          />
          
          {/* 音效音量 */}
          <VolumeSlider
            label="音效音量"
            description="交易、建筑等游戏事件音效"
            value={settings.sfxVolume}
            onChange={setSFXVolume}
            icon="🎮"
            disabled={!settings.enabled}
          />
          
          {/* UI音量 */}
          <VolumeSlider
            label="界面音效"
            description="按钮点击、页面切换等界面音效"
            value={settings.uiVolume}
            onChange={setUIVolume}
            icon="🖱️"
            disabled={!settings.enabled}
          />
        </div>
        
        {/* 测试音效 */}
        <div className="border-t border-[var(--border-default)] pt-4">
          <div className="text-sm text-[var(--text-muted)] mb-3">测试音效</div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => testSound('click')}
              disabled={!settings.enabled}
            >
              🖱️ 点击
            </Button>
            <Button
              size="xs"
              variant="success"
              onClick={() => testSound('success')}
              disabled={!settings.enabled}
            >
              ✅ 成功
            </Button>
            <Button
              size="xs"
              variant="danger"
              onClick={() => testSound('error')}
              disabled={!settings.enabled}
            >
              ❌ 错误
            </Button>
            <Button
              size="xs"
              variant="warning"
              onClick={() => testSound('coin')}
              disabled={!settings.enabled}
            >
              💰 金币
            </Button>
            <Button
              size="xs"
              variant="primary"
              onClick={() => testSound('build')}
              disabled={!settings.enabled}
            >
              🏗️ 建造
            </Button>
          </div>
        </div>
        
        {/* 提示信息 */}
        <div className="text-xs text-[var(--text-subtle)] pt-2">
          <p>💡 音效设置会自动保存，下次启动游戏时会恢复。</p>
          <p className="mt-1">⚠️ 浏览器需要用户首次点击后才能播放音效。</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SoundSettingsPanel;
