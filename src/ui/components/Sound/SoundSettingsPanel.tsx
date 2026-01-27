/**
 * 音效设置面板组件
 * 提供完整的音效控制界面
 */

import React, { useState, useCallback } from 'react';
import { useSound } from '@/ui/hooks/useSound';
import { soundManager } from '@/core/sound';

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
          <div className="text-white font-medium">{label}</div>
          <div className="text-sm text-slate-400">{description}</div>
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
          className="w-32 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer
                     [&::-webkit-slider-thumb]:appearance-none
                     [&::-webkit-slider-thumb]:w-4
                     [&::-webkit-slider-thumb]:h-4
                     [&::-webkit-slider-thumb]:rounded-full
                     [&::-webkit-slider-thumb]:bg-blue-500
                     [&::-webkit-slider-thumb]:cursor-pointer
                     [&::-webkit-slider-thumb]:hover:bg-blue-400
                     disabled:opacity-50 disabled:cursor-not-allowed"
        />
        <span className="text-white w-12 text-right tabular-nums">{percentage}%</span>
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
    playClick 
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
    <div className={`bg-slate-800 rounded-lg border border-slate-700 ${className}`}>
      <div className="p-4 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          🔊 音效设置
        </h3>
      </div>
      
      <div className="p-4 space-y-4">
        {/* 总开关 */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-3">
            <div className="text-xl">{settings.enabled ? '🔔' : '🔕'}</div>
            <div>
              <div className="text-white font-medium">启用音效</div>
              <div className="text-sm text-slate-400">开启/关闭所有游戏音效</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                if (e.target.checked) {
                  // 开启时播放测试音效
                  setTimeout(() => soundManager.playClick(), 100);
                }
              }}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
        
        <div className="border-t border-slate-700 pt-4 space-y-2">
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
        <div className="border-t border-slate-700 pt-4">
          <div className="text-sm text-slate-400 mb-3">测试音效</div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => testSound('click')}
              disabled={!settings.enabled}
              className="px-3 py-1.5 bg-slate-700 text-white text-sm rounded-lg 
                       hover:bg-slate-600 transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
            >
              🖱️ 点击
            </button>
            <button
              onClick={() => testSound('success')}
              disabled={!settings.enabled}
              className="px-3 py-1.5 bg-green-600/20 text-green-400 text-sm rounded-lg 
                       hover:bg-green-600/30 transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
            >
              ✅ 成功
            </button>
            <button
              onClick={() => testSound('error')}
              disabled={!settings.enabled}
              className="px-3 py-1.5 bg-red-600/20 text-red-400 text-sm rounded-lg 
                       hover:bg-red-600/30 transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
            >
              ❌ 错误
            </button>
            <button
              onClick={() => testSound('coin')}
              disabled={!settings.enabled}
              className="px-3 py-1.5 bg-yellow-600/20 text-yellow-400 text-sm rounded-lg 
                       hover:bg-yellow-600/30 transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
            >
              💰 金币
            </button>
            <button
              onClick={() => testSound('build')}
              disabled={!settings.enabled}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 text-sm rounded-lg 
                       hover:bg-blue-600/30 transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed"
            >
              🏗️ 建造
            </button>
          </div>
        </div>
        
        {/* 提示信息 */}
        <div className="text-xs text-slate-500 pt-2">
          <p>💡 音效设置会自动保存，下次启动游戏时会恢复。</p>
          <p className="mt-1">⚠️ 浏览器需要用户首次点击后才能播放音效。</p>
        </div>
      </div>
    </div>
  );
}

export default SoundSettingsPanel;