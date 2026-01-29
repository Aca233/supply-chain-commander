/**
 * 设置页面
 * 游戏设置、存档管理、性能监控和系统信息
 * 使用新设计系统组件重构
 */

import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { saveManager, SaveMetadata, GameSettings } from '@/core/save/SaveManager';
import { SoundSettingsPanel } from '@/ui/components/Sound/SoundSettingsPanel';
import { formatGameDate } from '@/core/world/GameWorld';
import { useMobile } from '@/ui/hooks/useMobile';

// 设计系统组件
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  Switch,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  DataTable,
  Badge,
  ProgressBar,
  type Column,
} from '@/ui/design-system';

// 懒加载性能监控面板
const PerformanceDashboard = lazy(() => import('@/ui/components/Performance/PerformanceDashboard'));

export const Settings: React.FC = () => {
  const { isMobile, isTablet } = useMobile();
  const { getWorld, ui, toggleTheme, tick } = useGameStore();
  const world = getWorld();
  const theme = ui.theme;
  const [saves, setSaves] = useState<SaveMetadata[]>([]);
  const [settings, setSettings] = useState<GameSettings>(() => saveManager.loadSettings());
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percent: 0 });
  const [saveName, setSaveName] = useState('');
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 加载存档列表
  useEffect(() => {
    setSaves(saveManager.listSaves());
    setStorageUsage(saveManager.getStorageUsage());
  }, []);

  // 自动保存功能
  useEffect(() => {
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    if (settings.autoSave && world) {
      autoSaveTimerRef.current = setInterval(() => {
        const currentWorld = getWorld();
        if (currentWorld) {
          const existingSaves = saveManager.listSaves();
          const maxAutoSaves = settings.maxAutoSaves || 5;

          const autoSaves = existingSaves
            .filter(s => s.name.startsWith('自动存档'))
            .sort((a, b) => b.timestamp - a.timestamp);

          while (autoSaves.length >= maxAutoSaves) {
            const oldestSave = autoSaves.pop();
            if (oldestSave) {
              saveManager.deleteSave(oldestSave.id);
            }
          }

          const saveIndex = (autoSaves.length > 0
            ? parseInt(autoSaves[0].name.replace('自动存档 #', '') || '0') + 1
            : 1);
          saveManager.save(currentWorld, currentWorld.tick, Date.now(), `自动存档 #${saveIndex}`);
          setSaves(saveManager.listSaves());
          setStorageUsage(saveManager.getStorageUsage());
        }
      }, settings.autoSaveInterval || 60000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current);
      }
    };
  }, [settings.autoSave, settings.autoSaveInterval, world, getWorld]);

  // 保存设置
  const handleSettingChange = (key: keyof GameSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    saveManager.saveSettings(newSettings);
  };

  // 创建存档
  const handleSave = () => {
    if (!world) return;
    const name = saveName.trim() || undefined;
    saveManager.save(world, world.tick, Date.now(), name);
    setSaves(saveManager.listSaves());
    setSaveName('');
    setStorageUsage(saveManager.getStorageUsage());
  };

  // 删除存档
  const handleDelete = (saveId: string) => {
    if (confirm('确定要删除这个存档吗？')) {
      saveManager.deleteSave(saveId);
      setSaves(saveManager.listSaves());
      setStorageUsage(saveManager.getStorageUsage());
    }
  };

  // 加载存档
  const handleLoad = (saveId: string) => {
    if (!world) return;
    if (confirm('加载存档将覆盖当前进度，确定继续吗？')) {
      saveManager.load(saveId, world);
      alert('存档加载成功！');
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${bytes} B`;
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN');
  };

  // 存档表格列定义
  const saveColumns: Column<SaveMetadata>[] = [
    {
      key: 'name',
      title: '存档名称',
      render: (_, save) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{save.name}</div>
          <div className="text-xs text-[var(--text-muted)]">v{save.version}</div>
        </div>
      ),
    },
    {
      key: 'timestamp',
      title: '保存时间',
      align: 'right',
      render: (value) => formatDate(value),
    },
    {
      key: 'playTime',
      title: '游戏时间',
      align: 'right',
      render: (value) => formatGameDate(value),
    },
    {
      key: 'playerCash',
      title: '现金',
      align: 'right',
      render: (value) => (
        <span className="text-[var(--success)]">
          ¥{(value / 1000000).toFixed(2)}M
        </span>
      ),
    },
    {
      key: 'id',
      title: '操作',
      align: 'center',
      render: (_, save) => (
        <div className="flex justify-center gap-2">
          <Button size="xs" onClick={() => handleLoad(save.id)}>
            加载
          </Button>
          <Button size="xs" variant="danger" onClick={() => handleDelete(save.id)}>
            删除
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className={`space-y-4 ${isMobile ? 'pb-4' : isTablet ? 'p-4' : 'p-6'}`}>
      <h1 className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>⚙️ 设置</h1>

      <Tabs defaultValue="game">
        <TabsList 
          variant="game" 
          className={isMobile ? 'w-full grid grid-cols-4 gap-1 p-1' : ''}
        >
          <TabsTrigger 
            value="game" 
            variant="game" 
            className={isMobile ? 'flex-col gap-0.5 py-2 px-1 text-[10px]' : ''}
          >
            <span className={isMobile ? 'text-lg' : ''}>🎮</span>
            <span className={isMobile ? '' : 'ml-1'}>游戏</span>
          </TabsTrigger>
          <TabsTrigger 
            value="save" 
            variant="game" 
            className={isMobile ? 'flex-col gap-0.5 py-2 px-1 text-[10px]' : ''}
          >
            <span className={isMobile ? 'text-lg' : ''}>💾</span>
            <span className={isMobile ? '' : 'ml-1'}>存档</span>
          </TabsTrigger>
          <TabsTrigger 
            value="performance" 
            variant="game" 
            className={isMobile ? 'flex-col gap-0.5 py-2 px-1 text-[10px]' : ''}
          >
            <span className={isMobile ? 'text-lg' : ''}>📊</span>
            <span className={isMobile ? '' : 'ml-1'}>性能</span>
          </TabsTrigger>
          <TabsTrigger 
            value="about" 
            variant="game" 
            className={isMobile ? 'flex-col gap-0.5 py-2 px-1 text-[10px]' : ''}
          >
            <span className={isMobile ? 'text-lg' : ''}>ℹ️</span>
            <span className={isMobile ? '' : 'ml-1'}>关于</span>
          </TabsTrigger>
        </TabsList>

        {/* 游戏设置 */}
        <TabsContent value="game" className="space-y-6">
          {/* 游戏选项 */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🎯 游戏选项</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 默认游戏速度 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[var(--text-primary)] font-medium">默认游戏速度</div>
                  <div className="text-sm text-[var(--text-muted)]">设置游戏启动时的默认速度</div>
                </div>
                <Select
                  value={String(settings.gameSpeed)}
                  onValueChange={(v) => handleSettingChange('gameSpeed', Number(v))}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1x 正常</SelectItem>
                    <SelectItem value="2">2x 加速</SelectItem>
                    <SelectItem value="4">4x 快速</SelectItem>
                    <SelectItem value="8">8x 极速</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* 自动存档 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[var(--text-primary)] font-medium">自动存档</div>
                  <div className="text-sm text-[var(--text-muted)]">定期自动保存游戏进度</div>
                </div>
                <Switch
                  checked={settings.autoSave}
                  onCheckedChange={(checked) => handleSettingChange('autoSave', checked)}
                  variant="game"
                />
              </div>

              {settings.autoSave && (
                <>
                  {/* 自动存档间隔 */}
                  <div className="flex items-center justify-between pl-4 border-l-2 border-[var(--accent)]">
                    <div>
                      <div className="text-[var(--text-primary)]">自动存档间隔</div>
                      <div className="text-sm text-[var(--text-muted)]">每隔多长时间自动保存一次</div>
                    </div>
                    <Select
                      value={String(settings.autoSaveInterval || 60000)}
                      onValueChange={(v) => handleSettingChange('autoSaveInterval', Number(v))}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30000">30秒</SelectItem>
                        <SelectItem value="60000">1分钟</SelectItem>
                        <SelectItem value="120000">2分钟</SelectItem>
                        <SelectItem value="300000">5分钟</SelectItem>
                        <SelectItem value="600000">10分钟</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 最大自动存档数 */}
                  <div className="flex items-center justify-between pl-4 border-l-2 border-[var(--accent)]">
                    <div>
                      <div className="text-[var(--text-primary)]">最大自动存档数</div>
                      <div className="text-sm text-[var(--text-muted)]">超过此数量后删除最旧的存档</div>
                    </div>
                    <Select
                      value={String(settings.maxAutoSaves || 5)}
                      onValueChange={(v) => handleSettingChange('maxAutoSaves', Number(v))}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1个</SelectItem>
                        <SelectItem value="3">3个</SelectItem>
                        <SelectItem value="5">5个</SelectItem>
                        <SelectItem value="10">10个</SelectItem>
                        <SelectItem value="20">20个</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* 外观设置 */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🎨 外观设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[var(--text-primary)] font-medium">主题模式</div>
                  <div className="text-sm text-[var(--text-muted)]">切换深色/浅色主题</div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={theme === 'light' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => theme !== 'light' && toggleTheme()}
                  >
                    ☀️ 浅色
                  </Button>
                  <Button
                    variant={theme === 'dark' ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => theme !== 'dark' && toggleTheme()}
                  >
                    🌙 深色
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 音效设置 */}
          <SoundSettingsPanel />

          {/* 语言设置 */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🌐 语言设置</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[var(--text-primary)] font-medium">界面语言</div>
                  <div className="text-sm text-[var(--text-muted)]">选择游戏界面语言</div>
                </div>
                <Select
                  value={settings.language}
                  onValueChange={(v) => handleSettingChange('language', v)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="zh-CN">简体中文</SelectItem>
                    <SelectItem value="en-US">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 存档管理 */}
        <TabsContent value="save" className="space-y-6">
          {/* 创建存档 */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>📝 创建存档</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="存档名称（可选）"
                  className="flex-1"
                />
                <Button onClick={handleSave}>
                  💾 保存游戏
                </Button>
                <Button
                  variant="success"
                  onClick={() => {
                    if (world) {
                      saveManager.quickSave(world, world.tick, Date.now());
                      setSaves(saveManager.listSaves());
                      setStorageUsage(saveManager.getStorageUsage());
                    }
                  }}
                >
                  ⚡ 快速存档
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 存档列表 */}
          <Card variant="elevated">
            <CardHeader>
              <div className="flex justify-between items-center w-full">
                <CardTitle>📂 存档列表</CardTitle>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-[var(--text-muted)]">
                    存储使用: {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.total)}
                  </span>
                  <div className="w-24">
                    <ProgressBar
                      value={storageUsage.percent}
                      size="sm"
                      color={storageUsage.percent > 80 ? 'error' : storageUsage.percent > 50 ? 'warning' : 'success'}
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                data={saves}
                columns={saveColumns}
                rowKey="id"
                variant="game"
                hoverable
                emptyText="暂无存档记录"
                emptyIcon="📭"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* 性能监控 */}
        <TabsContent value="performance">
          <Suspense
            fallback={
              <Card variant="elevated" padding="lg">
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <div className="animate-spin w-10 h-10 border-3 border-[var(--accent)] border-t-transparent rounded-full" />
                  <div className="text-[var(--text-muted)]">加载性能监控面板...</div>
                </div>
              </Card>
            }
          >
            <PerformanceDashboard />
          </Suspense>
        </TabsContent>

        {/* 关于游戏 */}
        <TabsContent value="about" className="space-y-6">
          <Card variant="game" padding="lg">
            <div className="text-center mb-8">
              <div className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent mb-2">
                供应链指挥官
              </div>
              <div className="text-[var(--text-muted)]">Supply Chain Commander</div>
              <Badge variant="primary" className="mt-2">版本 1.0.0</Badge>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { value: '104', label: '商品种类', icon: '📦' },
                { value: '40', label: '建筑类型', icon: '🏭' },
                { value: '63', label: '生产配方', icon: '📋' },
                { value: '8', label: 'AI人格类型', icon: '🤖' },
              ].map((stat) => (
                <Card key={stat.label} variant="elevated" padding="md" className="text-center">
                  <div className="text-2xl mb-1">{stat.icon}</div>
                  <div className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</div>
                  <div className="text-sm text-[var(--text-muted)]">{stat.label}</div>
                </Card>
              ))}
            </div>

            <div className="space-y-4 text-[var(--text-secondary)]">
              <p>
                <strong className="text-[var(--text-primary)]">供应链指挥官</strong>是一款深度模拟市场经济的企业经营游戏。
                玩家扮演企业家，在动态的经济环境中建立和发展自己的商业帝国。
              </p>
              <p className="font-medium text-[var(--text-primary)]">游戏特色：</p>
              <ul className="space-y-2 ml-4">
                {[
                  { icon: '📈', text: '真实经济模拟：瓦尔拉斯均衡价格发现机制' },
                  { icon: '🔗', text: '多层产业链：从原材料到最终产品的完整生产链' },
                  { icon: '🤖', text: '智能AI对手：8种人格类型的AI公司' },
                  { icon: '💰', text: '完整金融系统：股票交易、银行信贷、企业并购' },
                  { icon: '🌊', text: '宏观经济周期：繁荣、衰退、萧条、复苏' },
                ].map((item) => (
                  <li key={item.text} className="flex items-center gap-2">
                    <span>{item.icon}</span>
                    <span>{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card variant="elevated">
            <CardHeader>
              <CardTitle>🛠️ 技术信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: '前端框架', value: 'React 18 + TypeScript' },
                  { label: '构建工具', value: 'Vite' },
                  { label: '样式框架', value: 'Tailwind CSS' },
                  { label: '图表库', value: 'ECharts' },
                  { label: '状态管理', value: 'Zustand' },
                  { label: '数据结构', value: 'SoA (TypedArray)' },
                  { label: 'UI组件', value: 'Radix UI + CVA' },
                  { label: '设计系统', value: 'Custom Design System' },
                ].map((item) => (
                  <div key={item.label} className="flex justify-between">
                    <span className="text-[var(--text-muted)]">{item.label}</span>
                    <span className="text-[var(--text-primary)]">{item.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
