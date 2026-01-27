/**
 * 设置页面
 * 游戏设置、存档管理、性能监控和系统信息
 */

import React, { useState, useEffect, lazy, Suspense, useRef } from 'react';
import { useGameStore } from '@/stores/gameStore';
import { saveManager, SaveMetadata, GameSettings } from '@/core/save/SaveManager';
import { SoundSettingsPanel } from '@/ui/components/Sound/SoundSettingsPanel';
import { formatGameDate } from '@/core/world/GameWorld';

// 懒加载性能监控面板（避免影响初始加载）
const PerformanceDashboard = lazy(() => import('@/ui/components/Performance/PerformanceDashboard'));

export const Settings: React.FC = () => {
  const { getWorld, ui, toggleTheme, tick } = useGameStore();
  const world = getWorld();
  const theme = ui.theme;
  const [saves, setSaves] = useState<SaveMetadata[]>([]);
  const [settings, setSettings] = useState<GameSettings>(() => saveManager.loadSettings());
  const [storageUsage, setStorageUsage] = useState({ used: 0, total: 0, percent: 0 });
  const [saveName, setSaveName] = useState('');
  const [activeTab, setActiveTab] = useState<'game' | 'save' | 'performance' | 'about'>('game');
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // 加载存档列表
  useEffect(() => {
    setSaves(saveManager.listSaves());
    setStorageUsage(saveManager.getStorageUsage());
  }, []);
  
  // 自动保存功能
  useEffect(() => {
    // 清除之前的定时器
    if (autoSaveTimerRef.current) {
      clearInterval(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    
    // 如果启用了自动保存，设置定时器
    if (settings.autoSave && world) {
      autoSaveTimerRef.current = setInterval(() => {
        const currentWorld = getWorld();
        if (currentWorld) {
          const existingSaves = saveManager.listSaves();
          const maxAutoSaves = settings.maxAutoSaves || 5;
          
          // 获取所有自动存档（按时间排序，最新的在前）
          const autoSaves = existingSaves
            .filter(s => s.name.startsWith('自动存档'))
            .sort((a, b) => b.timestamp - a.timestamp);
          
          // 如果自动存档数量达到上限，删除最旧的
          while (autoSaves.length >= maxAutoSaves) {
            const oldestSave = autoSaves.pop();
            if (oldestSave) {
              saveManager.deleteSave(oldestSave.id);
            }
          }
          
          // 创建新的自动存档（带编号）
          const saveIndex = (autoSaves.length > 0
            ? parseInt(autoSaves[0].name.replace('自动存档 #', '') || '0') + 1
            : 1);
          saveManager.save(currentWorld, currentWorld.tick, Date.now(), `自动存档 #${saveIndex}`);
          setSaves(saveManager.listSaves());
          setStorageUsage(saveManager.getStorageUsage());
          console.log(`[自动存档] 已保存 #${saveIndex}`);
        }
      }, settings.autoSaveInterval || 60000); // 默认1分钟
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
  
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-white">设置</h1>
      
      {/* 标签页切换 */}
      <div className="flex gap-2 border-b border-slate-700 pb-2">
        {[
          { key: 'game', label: '游戏设置' },
          { key: 'save', label: '存档管理' },
          { key: 'performance', label: '性能监控' },
          { key: 'about', label: '关于游戏' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* 游戏设置 */}
      {activeTab === 'game' && (
        <div className="space-y-6">
          {/* 游戏速度 */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">游戏选项</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white">默认游戏速度</div>
                  <div className="text-sm text-slate-400">设置游戏启动时的默认速度</div>
                </div>
                <select
                  value={settings.gameSpeed}
                  onChange={e => handleSettingChange('gameSpeed', Number(e.target.value))}
                  className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600"
                >
                  <option value={1}>1x 正常</option>
                  <option value={2}>2x 加速</option>
                  <option value={4}>4x 快速</option>
                  <option value={8}>8x 极速</option>
                </select>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white">自动存档</div>
                  <div className="text-sm text-slate-400">定期自动保存游戏进度</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.autoSave}
                    onChange={e => handleSettingChange('autoSave', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              {settings.autoSave && (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white">自动存档间隔</div>
                      <div className="text-sm text-slate-400">每隔多长时间自动保存一次</div>
                    </div>
                    <select
                      value={settings.autoSaveInterval || 60000}
                      onChange={e => handleSettingChange('autoSaveInterval', Number(e.target.value))}
                      className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600"
                    >
                      <option value={30000}>30秒</option>
                      <option value={60000}>1分钟</option>
                      <option value={120000}>2分钟</option>
                      <option value={300000}>5分钟</option>
                      <option value={600000}>10分钟</option>
                    </select>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-white">最大自动存档数</div>
                      <div className="text-sm text-slate-400">超过此数量后删除最旧的存档</div>
                    </div>
                    <select
                      value={settings.maxAutoSaves || 5}
                      onChange={e => handleSettingChange('maxAutoSaves', Number(e.target.value))}
                      className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600"
                    >
                      <option value={1}>1个</option>
                      <option value={3}>3个</option>
                      <option value={5}>5个</option>
                      <option value={10}>10个</option>
                      <option value={20}>20个</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* 主题设置 */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">外观设置</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white">主题模式</div>
                  <div className="text-sm text-slate-400">切换深色/浅色主题</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (theme !== 'light') toggleTheme();
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      theme === 'light'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    ☀️ 浅色
                  </button>
                  <button
                    onClick={() => {
                      if (theme !== 'dark') toggleTheme();
                    }}
                    className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                      theme === 'dark'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    🌙 深色
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {/* 音效设置 - 使用完整的音效设置面板 */}
          <SoundSettingsPanel />
          
          {/* 语言设置 */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">语言设置</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white">界面语言</div>
                <div className="text-sm text-slate-400">选择游戏界面语言</div>
              </div>
              <select
                value={settings.language}
                onChange={e => handleSettingChange('language', e.target.value)}
                className="bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600"
              >
                <option value="zh-CN">简体中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </div>
      )}
      
      {/* 存档管理 */}
      {activeTab === 'save' && (
        <div className="space-y-6">
          {/* 创建存档 */}
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">创建存档</h3>
            <div className="flex gap-4">
              <input
                type="text"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                placeholder="存档名称（可选）"
                className="flex-1 bg-slate-700 text-white px-4 py-2 rounded-lg border border-slate-600 focus:border-blue-500 focus:outline-none"
              />
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                保存游戏
              </button>
              <button
                onClick={() => {
                  if (world) {
                    saveManager.quickSave(world, world.tick, Date.now());
                    setSaves(saveManager.listSaves());
                    setStorageUsage(saveManager.getStorageUsage());
                  }
                }}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                快速存档
              </button>
            </div>
          </div>
          
          {/* 存档列表 */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-white">存档列表</h3>
              <div className="text-sm text-slate-400">
                存储使用: {formatBytes(storageUsage.used)} / {formatBytes(storageUsage.total)} ({storageUsage.percent.toFixed(1)}%)
              </div>
            </div>
            {saves.length > 0 ? (
              <table className="w-full">
                <thead className="bg-slate-700/50">
                  <tr>
                    <th className="text-left p-3 text-slate-300">存档名称</th>
                    <th className="text-right p-3 text-slate-300">保存时间</th>
                    <th className="text-right p-3 text-slate-300">游戏时间</th>
                    <th className="text-right p-3 text-slate-300">现金</th>
                    <th className="text-center p-3 text-slate-300">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {saves.map(save => (
                    <tr key={save.id} className="hover:bg-slate-700/30">
                      <td className="p-3">
                        <div className="text-white font-medium">{save.name}</div>
                        <div className="text-xs text-slate-400">v{save.version}</div>
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {formatDate(save.timestamp)}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {formatGameDate(save.playTime)}
                      </td>
                      <td className="p-3 text-right text-green-400">
                        ¥{(save.playerCash / 1000000).toFixed(2)}M
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleLoad(save.id)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            加载
                          </button>
                          <button
                            onClick={() => handleDelete(save.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-slate-400">
                暂无存档记录
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* 性能监控 */}
      {activeTab === 'performance' && (
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="text-slate-400">加载性能监控面板...</div>
          </div>
        }>
          <PerformanceDashboard />
        </Suspense>
      )}
      
      {/* 关于游戏 */}
      {activeTab === 'about' && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
            <div className="text-center mb-6">
              <div className="text-4xl font-bold text-blue-400 mb-2">供应链指挥官</div>
              <div className="text-slate-400">Supply Chain Commander</div>
              <div className="text-sm text-slate-500 mt-2">版本 1.0.0</div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">104</div>
                <div className="text-sm text-slate-400">商品种类</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">40</div>
                <div className="text-sm text-slate-400">建筑类型</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">63</div>
                <div className="text-sm text-slate-400">生产配方</div>
              </div>
              <div className="bg-slate-700/50 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-white">8</div>
                <div className="text-sm text-slate-400">AI人格类型</div>
              </div>
            </div>
            
            <div className="space-y-4 text-slate-300">
              <p>
                <strong className="text-white">供应链指挥官</strong>是一款深度模拟市场经济的企业经营游戏。
                玩家扮演企业家，在动态的经济环境中建立和发展自己的商业帝国。
              </p>
              <p>
                游戏特色：
              </p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>真实经济模拟：瓦尔拉斯均衡价格发现机制</li>
                <li>多层产业链：从原材料到最终产品的完整生产链</li>
                <li>智能AI对手：8种人格类型的AI公司</li>
                <li>完整金融系统：股票交易、银行信贷、企业并购</li>
                <li>宏观经济周期：繁荣、衰退、萧条、复苏</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h3 className="text-lg font-semibold text-white mb-4">技术信息</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">前端框架</span>
                <span className="text-white">React 18 + TypeScript</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">构建工具</span>
                <span className="text-white">Vite</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">样式框架</span>
                <span className="text-white">Tailwind CSS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">图表库</span>
                <span className="text-white">ECharts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">状态管理</span>
                <span className="text-white">Zustand</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">数据结构</span>
                <span className="text-white">SoA (TypedArray)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;