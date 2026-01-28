/**
 * ⚙️ 主菜单设置对话框
 * 在主菜单中显示的简化版设置界面
 * 支持深色/浅色主题
 */

import React, { useState, useEffect, useCallback } from 'react';
import { saveManager, GameSettings } from '@/core/save/SaveManager';
import { soundManager } from '@/core/sound';
import '../styles/menu.css';

interface SettingsDialogProps {
  /** 是否显示 */
  open: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

// 默认设置
const DEFAULT_SETTINGS: GameSettings = {
  gameSpeed: 1,
  soundEnabled: true,
  musicEnabled: true,
  autoSave: true,
  autoSaveInterval: 60000,
  maxAutoSaves: 5,
  language: 'zh-CN',
};

// 自定义下拉组件
interface CustomSelectProps {
  value: string | number;
  onChange: (value: string) => void;
  options: { value: string | number; label: string }[];
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(opt => String(opt.value) === String(value));

  return (
    <div className="relative">
      <button
        type="button"
        className="px-4 py-2 rounded-lg text-sm min-w-[120px] text-left flex items-center justify-between gap-2 transition-colors
          bg-white/5 border border-white/10 text-white hover:bg-white/10
          dark:bg-white/5 dark:border-white/10 dark:text-white dark:hover:bg-white/10
          light:bg-black/5 light:border-black/10 light:text-gray-900 light:hover:bg-black/10"
        style={{
          backgroundColor: 'var(--bg-select, rgba(255,255,255,0.05))',
          borderColor: 'var(--border-select, rgba(255,255,255,0.1))',
          color: 'var(--text-select, white)',
        }}
        onClick={() => {
          setIsOpen(!isOpen);
          soundManager.playClick();
        }}
      >
        <span>{selectedOption?.label || '选择...'}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6,9 12,15 18,9" />
        </svg>
      </button>
      
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          {/* 下拉菜单 */}
          <div 
            className="absolute top-full left-0 mt-1 min-w-full rounded-lg overflow-hidden z-50"
            style={{
              background: 'var(--bg-dropdown)',
              border: '1px solid var(--border-dropdown)',
              boxShadow: 'var(--shadow-dropdown)',
            }}
          >
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                  String(option.value) === String(value)
                    ? 'bg-[var(--accent)] text-white'
                    : 'hover:bg-[var(--bg-item-hover)]'
                }`}
                style={{
                  color: String(option.value) === String(value) ? 'white' : 'var(--text-dropdown)',
                }}
                onClick={() => {
                  onChange(String(option.value));
                  setIsOpen(false);
                  soundManager.playClick();
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const SettingsDialog: React.FC<SettingsDialogProps> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [masterVolume, setMasterVolume] = useState(70);
  const [sfxVolume, setSfxVolume] = useState(80);
  const [uiVolume, setUiVolume] = useState(60);

  // 加载设置
  useEffect(() => {
    if (open) {
      const savedSettings = saveManager.loadSettings();
      setSettings(savedSettings);
      
      // 加载主题
      const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
      setTheme(savedTheme || 'dark');
      
      // 加载音量设置
      const soundSettings = soundManager.getSettings();
      setMasterVolume(Math.round(soundSettings.masterVolume * 100));
      setSfxVolume(Math.round(soundSettings.sfxVolume * 100));
      setUiVolume(Math.round(soundSettings.uiVolume * 100));
    }
  }, [open]);

  // 保存设置
  const handleSettingChange = useCallback((key: keyof GameSettings, value: unknown) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      saveManager.saveSettings(newSettings);
      return newSettings;
    });
  }, []);

  // 切换主题
  const handleThemeChange = useCallback((newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.classList.toggle('light', newTheme === 'light');
    soundManager.playClick();
  }, []);

  // 音量变化
  const handleMasterVolumeChange = useCallback((value: number) => {
    setMasterVolume(value);
    soundManager.setMasterVolume(value / 100);
  }, []);

  const handleSfxVolumeChange = useCallback((value: number) => {
    setSfxVolume(value);
    soundManager.setSFXVolume(value / 100);
  }, []);

  const handleUiVolumeChange = useCallback((value: number) => {
    setUiVolume(value);
    soundManager.setUIVolume(value / 100);
  }, []);

  // 点击背景关闭
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      soundManager.playClick();
      onClose();
    }
  }, [onClose]);

  if (!open) return null;

  const isLight = theme === 'light';

  // 主题相关的样式变量
  const themeStyles = {
    '--bg-dialog': isLight ? '#ffffff' : 'linear-gradient(180deg, #0a0a0b 0%, #111113 100%)',
    '--border-dialog': isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)',
    '--shadow-dialog': isLight ? '0 20px 50px rgba(0, 0, 0, 0.15)' : '0 20px 60px rgba(0, 0, 0, 0.7)',
    '--text-title': isLight ? '#0f172a' : '#ffffff',
    '--text-primary': isLight ? '#1e293b' : '#ffffff',
    '--text-secondary': isLight ? '#64748b' : '#a1a1aa',
    '--text-muted': isLight ? '#94a3b8' : '#71717a',
    '--border-section': isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.1)',
    '--bg-button': isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.05)',
    '--bg-button-hover': isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)',
    '--bg-button-active': isLight ? '#2563eb' : '#3b82f6',
    '--bg-slider-track': isLight ? '#e2e8f0' : '#27272a',
    '--bg-slider-fill': isLight ? '#2563eb' : '#3b82f6',
    '--bg-toggle-off': isLight ? '#cbd5e1' : 'rgba(255, 255, 255, 0.1)',
    '--bg-toggle-on': isLight ? '#2563eb' : '#3b82f6',
    '--bg-dropdown': isLight ? '#ffffff' : 'linear-gradient(180deg, #1a1a1d 0%, #111113 100%)',
    '--border-dropdown': isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)',
    '--shadow-dropdown': isLight ? '0 10px 40px rgba(0, 0, 0, 0.1)' : '0 10px 40px rgba(0, 0, 0, 0.5)',
    '--text-dropdown': isLight ? '#1e293b' : '#d4d4d8',
    '--bg-item-hover': isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.1)',
    '--accent': isLight ? '#2563eb' : '#3b82f6',
    '--bg-select': isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)',
    '--border-select': isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)',
    '--text-select': isLight ? '#1e293b' : 'white',
  } as React.CSSProperties;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ 
        backgroundColor: isLight ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.8)', 
        backdropFilter: 'blur(8px)',
      }}
      onClick={handleBackdropClick}
    >
      <div
        className="w-[560px] max-h-[85vh] overflow-hidden rounded-xl"
        style={{
          ...themeStyles,
          background: isLight ? '#ffffff' : 'linear-gradient(180deg, #0a0a0b 0%, #111113 100%)',
          border: `1px solid ${isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: isLight ? '0 20px 50px rgba(0, 0, 0, 0.15)' : '0 20px 60px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.1)'}` }}
        >
          <h2 
            className="text-xl font-semibold flex items-center gap-2"
            style={{ color: isLight ? '#0f172a' : 'white' }}
          >
            <span>⚙️</span>
            <span>游戏设置</span>
          </h2>
          <button
            className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors"
            style={{ 
              color: isLight ? '#64748b' : '#a1a1aa',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)';
              e.currentTarget.style.color = isLight ? '#0f172a' : 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = isLight ? '#64748b' : '#a1a1aa';
            }}
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* 内容区 */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[calc(85vh-120px)]">
          {/* 外观设置 */}
          <div className="space-y-4">
            <h3 
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: isLight ? '#64748b' : '#a1a1aa' }}
            >
              🎨 外观
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: isLight ? '#1e293b' : 'white' }}>主题模式</div>
                <div className="text-sm" style={{ color: isLight ? '#64748b' : '#71717a' }}>切换深色/浅色主题</div>
              </div>
              <div className="flex gap-2">
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: theme === 'light' ? (isLight ? '#2563eb' : '#3b82f6') : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'),
                    color: theme === 'light' ? 'white' : (isLight ? '#64748b' : '#a1a1aa'),
                    boxShadow: theme === 'light' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                  }}
                  onClick={() => handleThemeChange('light')}
                >
                  ☀️ 浅色
                </button>
                <button
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: theme === 'dark' ? (isLight ? '#2563eb' : '#3b82f6') : (isLight ? '#f1f5f9' : 'rgba(255,255,255,0.05)'),
                    color: theme === 'dark' ? 'white' : (isLight ? '#64748b' : '#a1a1aa'),
                    boxShadow: theme === 'dark' ? '0 4px 12px rgba(37, 99, 235, 0.3)' : 'none',
                  }}
                  onClick={() => handleThemeChange('dark')}
                >
                  🌙 深色
                </button>
              </div>
            </div>
          </div>

          {/* 音效设置 */}
          <div className="space-y-4">
            <h3 
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: isLight ? '#64748b' : '#a1a1aa' }}
            >
              🔊 音效
            </h3>
            
            {/* 主音量 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span style={{ color: isLight ? '#1e293b' : 'white' }}>主音量</span>
                <span className="text-sm w-12 text-right" style={{ color: isLight ? '#64748b' : '#a1a1aa' }}>{masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => handleMasterVolumeChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${isLight ? '#2563eb' : '#3b82f6'} 0%, ${isLight ? '#2563eb' : '#3b82f6'} ${masterVolume}%, ${isLight ? '#e2e8f0' : '#27272a'} ${masterVolume}%, ${isLight ? '#e2e8f0' : '#27272a'} 100%)`,
                }}
              />
            </div>

            {/* 音效音量 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span style={{ color: isLight ? '#1e293b' : 'white' }}>音效音量</span>
                <span className="text-sm w-12 text-right" style={{ color: isLight ? '#64748b' : '#a1a1aa' }}>{sfxVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVolume}
                onChange={(e) => handleSfxVolumeChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${isLight ? '#2563eb' : '#3b82f6'} 0%, ${isLight ? '#2563eb' : '#3b82f6'} ${sfxVolume}%, ${isLight ? '#e2e8f0' : '#27272a'} ${sfxVolume}%, ${isLight ? '#e2e8f0' : '#27272a'} 100%)`,
                }}
              />
            </div>

            {/* UI音效音量 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span style={{ color: isLight ? '#1e293b' : 'white' }}>界面音效</span>
                <span className="text-sm w-12 text-right" style={{ color: isLight ? '#64748b' : '#a1a1aa' }}>{uiVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={uiVolume}
                onChange={(e) => handleUiVolumeChange(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${isLight ? '#2563eb' : '#3b82f6'} 0%, ${isLight ? '#2563eb' : '#3b82f6'} ${uiVolume}%, ${isLight ? '#e2e8f0' : '#27272a'} ${uiVolume}%, ${isLight ? '#e2e8f0' : '#27272a'} 100%)`,
                }}
              />
            </div>
          </div>

          {/* 游戏设置 */}
          <div className="space-y-4">
            <h3 
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: isLight ? '#64748b' : '#a1a1aa' }}
            >
              🎮 游戏
            </h3>
            
            {/* 默认游戏速度 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: isLight ? '#1e293b' : 'white' }}>默认游戏速度</div>
                <div className="text-sm" style={{ color: isLight ? '#64748b' : '#71717a' }}>游戏启动时的初始速度</div>
              </div>
              <CustomSelect
                value={settings.gameSpeed}
                onChange={(v) => handleSettingChange('gameSpeed', Number(v))}
                options={[
                  { value: '1', label: '1x 正常' },
                  { value: '2', label: '2x 加速' },
                  { value: '4', label: '4x 快速' },
                  { value: '8', label: '8x 极速' },
                ]}
              />
            </div>

            {/* 自动存档 */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: isLight ? '#1e293b' : 'white' }}>自动存档</div>
                <div className="text-sm" style={{ color: isLight ? '#64748b' : '#71717a' }}>定期自动保存游戏进度</div>
              </div>
              <button
                className="w-12 h-7 rounded-full transition-all relative"
                style={{
                  backgroundColor: settings.autoSave 
                    ? (isLight ? '#2563eb' : '#3b82f6') 
                    : (isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'),
                }}
                onClick={() => {
                  handleSettingChange('autoSave', !settings.autoSave);
                  soundManager.playClick();
                }}
              >
                <div
                  className="absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform"
                  style={{
                    transform: settings.autoSave ? 'translateX(24px)' : 'translateX(4px)',
                  }}
                />
              </button>
            </div>
          </div>

          {/* 语言设置 */}
          <div className="space-y-4">
            <h3 
              className="text-sm font-medium uppercase tracking-wider"
              style={{ color: isLight ? '#64748b' : '#a1a1aa' }}
            >
              🌐 语言
            </h3>
            
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium" style={{ color: isLight ? '#1e293b' : 'white' }}>界面语言</div>
                <div className="text-sm" style={{ color: isLight ? '#64748b' : '#71717a' }}>选择游戏界面语言</div>
              </div>
              <CustomSelect
                value={settings.language}
                onChange={(v) => handleSettingChange('language', v)}
                options={[
                  { value: 'zh-CN', label: '简体中文' },
                  { value: 'en-US', label: 'English' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* 底部按钮 */}
        <div
          className="px-6 py-4 flex justify-end"
          style={{ borderTop: `1px solid ${isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255, 255, 255, 0.1)'}` }}
        >
          <button
            className="px-6 py-2.5 rounded-lg text-white font-medium transition-colors"
            style={{
              backgroundColor: isLight ? '#2563eb' : '#3b82f6',
              boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = isLight ? '#1d4ed8' : '#60a5fa';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = isLight ? '#2563eb' : '#3b82f6';
            }}
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsDialog;
