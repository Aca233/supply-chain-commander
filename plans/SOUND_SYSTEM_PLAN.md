# 音效系统设计计划

## 概述

为供应链指挥官游戏添加全套音效系统，包括UI交互音效、交易音效、建筑音效和通知音效。使用免费CDN资源，并提供完整的音量控制功能。

## 架构设计

```
┌─────────────────────────────────────────────────────────────────┐
│                         SoundManager                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │ AudioPool   │  │ VolumeCtrl  │  │ SoundConfig             │  │
│  │ - preload   │  │ - master    │  │ - UI sounds URLs        │  │
│  │ - cache     │  │ - sfx       │  │ - Trade sounds URLs     │  │
│  │ - play      │  │ - mute      │  │ - Building sounds URLs  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
        ▼                    ▼                    ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────────────┐
│   useSound    │   │ gameStore    │   │  ToastContext         │
│   Hook        │   │ integration  │   │  integration          │
│ - playClick   │   │ - onTrade    │   │ - onSuccess          │
│ - playHover   │   │ - onBuild    │   │ - onError            │
└───────────────┘   └───────────────┘   └───────────────────────┘
```

## 文件结构

```
src/
├── core/
│   └── sound/
│       ├── index.ts           # 模块导出
│       ├── SoundManager.ts    # 核心音效管理器
│       └── SoundConfig.ts     # 音效资源配置和CDN URLs
├── ui/
│   ├── hooks/
│   │   └── useSound.ts        # 音效触发 React Hook
│   └── components/
│       └── Sound/
│           └── SoundSettingsPanel.tsx  # 音效设置面板组件
```

## 音效资源配置 (使用 Mixkit CDN)

### 1. UI交互音效
| 音效名称 | 用途 | 时长 | CDN URL |
|---------|------|------|---------|
| click | 按钮点击 | ~0.1s | https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3 |
| hover | 悬停反馈 | ~0.05s | https://assets.mixkit.co/active_storage/sfx/2572/2572-preview.mp3 |
| toggle | 开关切换 | ~0.1s | https://assets.mixkit.co/active_storage/sfx/2205/2205-preview.mp3 |
| tab | 标签切换 | ~0.1s | https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3 |
| modal_open | 弹窗打开 | ~0.2s | https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3 |
| modal_close | 弹窗关闭 | ~0.2s | https://assets.mixkit.co/active_storage/sfx/2570/2570-preview.mp3 |

### 2. 交易音效
| 音效名称 | 用途 | 时长 | CDN URL |
|---------|------|------|---------|
| trade_success | 交易成功 | ~0.5s | https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3 |
| trade_fail | 交易失败 | ~0.3s | https://assets.mixkit.co/active_storage/sfx/2020/2020-preview.mp3 |
| order_place | 下单 | ~0.3s | https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3 |
| order_cancel | 取消订单 | ~0.2s | https://assets.mixkit.co/active_storage/sfx/2017/2017-preview.mp3 |
| coin | 金钱音效 | ~0.3s | https://assets.mixkit.co/active_storage/sfx/888/888-preview.mp3 |

### 3. 建筑音效
| 音效名称 | 用途 | 时长 | CDN URL |
|---------|------|------|---------|
| build_complete | 建造完成 | ~1s | https://assets.mixkit.co/active_storage/sfx/2001/2001-preview.mp3 |
| upgrade | 升级成功 | ~0.5s | https://assets.mixkit.co/active_storage/sfx/1435/1435-preview.mp3 |
| production | 生产完成 | ~0.3s | https://assets.mixkit.co/active_storage/sfx/2002/2002-preview.mp3 |

### 4. 通知音效
| 音效名称 | 用途 | 时长 | CDN URL |
|---------|------|------|---------|
| notify_success | 成功通知 | ~0.3s | https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3 |
| notify_warning | 警告通知 | ~0.4s | https://assets.mixkit.co/active_storage/sfx/2003/2003-preview.mp3 |
| notify_error | 错误通知 | ~0.3s | https://assets.mixkit.co/active_storage/sfx/2004/2004-preview.mp3 |
| notify_info | 信息通知 | ~0.2s | https://assets.mixkit.co/active_storage/sfx/2005/2005-preview.mp3 |

## 核心模块设计

### 1. SoundManager 类

```typescript
class SoundManager {
  private audioPool: Map<string, HTMLAudioElement[]>;
  private settings: SoundSettings;
  private loaded: Set<string>;
  
  // 单例模式
  static getInstance(): SoundManager;
  
  // 初始化和预加载
  async init(): Promise<void>;
  async preload(sounds: string[]): Promise<void>;
  
  // 播放控制
  play(soundId: SoundId, options?: PlayOptions): void;
  stop(soundId?: SoundId): void;
  
  // 音量控制
  setMasterVolume(volume: number): void;
  setSFXVolume(volume: number): void;
  setMuted(muted: boolean): void;
  
  // 设置持久化
  saveSettings(): void;
  loadSettings(): SoundSettings;
}
```

### 2. 音效播放池

使用对象池模式管理 `HTMLAudioElement` 实例，避免频繁创建和销毁：

```typescript
interface AudioPoolConfig {
  maxInstances: number;  // 每种音效最大实例数
  reuseDelay: number;    // 复用延迟(ms)
}

// 默认配置
const DEFAULT_POOL_CONFIG: AudioPoolConfig = {
  maxInstances: 3,
  reuseDelay: 50
};
```

### 3. useSound Hook

```typescript
function useSound() {
  const play = (soundId: SoundId, options?: PlayOptions) => void;
  const playClick = () => void;
  const playHover = () => void;
  const playSuccess = () => void;
  const playError = () => void;
  const playTrade = (success: boolean) => void;
  const playBuild = () => void;
  
  return { play, playClick, playHover, ... };
}
```

## 集成点

### 1. Toast通知系统集成

修改 `ToastContext.tsx`：

```typescript
function ToastProvider({ children, maxToasts = 5 }: ToastProviderProps) {
  // 导入音效管理器
  const sound = soundManager.getInstance();
  
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    // ... 现有逻辑
    
    // 根据toast类型播放对应音效
    switch(toast.type) {
      case 'success': sound.play('notify_success'); break;
      case 'error': sound.play('notify_error'); break;
      case 'warning': sound.play('notify_warning'); break;
      case 'info': sound.play('notify_info'); break;
    }
    
    // ... 返回id
  }, []);
}
```

### 2. gameStore 交易集成

修改 `gameStore.ts` 中的交易和建筑操作：

```typescript
placeBuyOrder: (goodsId, quantity, price) => {
  // ... 现有逻辑
  if (orderId !== null) {
    soundManager.play('order_place');
    // ...
  } else {
    soundManager.play('trade_fail');
  }
},

buildBuilding: (buildingTypeId, recipeId) => {
  // ... 现有逻辑
  try {
    const buildingId = addBuilding(...);
    soundManager.play('build_complete');
    // ...
  } catch (e) {
    soundManager.play('trade_fail');
  }
},
```

### 3. Settings页面集成

在 `Settings.tsx` 现有的音效设置区域添加完整的控制：

```tsx
<SoundSettingsPanel 
  enabled={settings.soundEnabled}
  masterVolume={settings.masterVolume}
  sfxVolume={settings.sfxVolume}
  onToggle={(enabled) => handleSettingChange('soundEnabled', enabled)}
  onMasterVolumeChange={(vol) => handleSettingChange('masterVolume', vol)}
  onSFXVolumeChange={(vol) => handleSettingChange('sfxVolume', vol)}
/>
```

## 设置数据结构

更新 `SaveManager.ts` 中的 `GameSettings` 接口：

```typescript
interface GameSettings {
  gameSpeed: number;
  soundEnabled: boolean;
  musicEnabled: boolean;
  masterVolume: number;      // 0-1
  sfxVolume: number;         // 0-1
  autoSave: boolean;
  autoSaveInterval: number;
  language: string;
}
```

## 实现步骤

### Phase 1: 核心模块
1. 创建 `src/core/sound/SoundConfig.ts` - 定义音效资源配置
2. 创建 `src/core/sound/SoundManager.ts` - 实现核心管理器
3. 创建 `src/core/sound/index.ts` - 模块导出
4. 更新 `SaveManager.ts` - 添加音量设置字段

### Phase 2: React集成
5. 创建 `src/ui/hooks/useSound.ts` - React Hook
6. 创建音效设置面板组件

### Phase 3: 系统集成
7. 修改 `ToastContext.tsx` - 集成通知音效
8. 修改 `gameStore.ts` - 集成交易/建筑音效
9. 更新 `Settings.tsx` - 添加完整音效控制面板

### Phase 4: 优化
10. 添加音效预加载
11. 实现播放池优化
12. 测试和性能调优

## 技术考虑

### 浏览器兼容性
- 使用 Web Audio API 作为后备
- 处理自动播放策略（需要用户交互后才能播放）

### 性能优化
- 预加载常用音效
- 使用对象池避免频繁创建 Audio 实例
- 限制同时播放的音效数量
- 音效文件压缩（使用较低比特率的MP3）

### 用户体验
- 首次交互后初始化音效系统
- 静音时跳过播放逻辑
- 音量变化时提供预览