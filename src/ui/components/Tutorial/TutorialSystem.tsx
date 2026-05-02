/**
 * 新手教程系统
 * 提供游戏引导和教程功能
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useGameStore } from '@/stores/gameStore';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
} from '@/ui/design-system';
import {
  createDefaultTutorialState,
  dismissTutorialWelcome,
  startTutorialFlow,
  TUTORIAL_STORAGE_KEY,
  type TutorialState,
} from './tutorialState';

// ============ 教程步骤定义 ============

export interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetPage?: string; // 目标页面
  targetElement?: string; // 目标元素选择器（用于高亮）
  action?: 'navigate' | 'click' | 'build' | 'trade' | 'info';
  condition?: () => boolean; // 完成条件
  tips?: string[];
}

export interface TutorialChapter {
  id: string;
  title: string;
  description: string;
  icon: string;
  steps: TutorialStep[];
  reward?: string;
}

// 教程章节
const TUTORIAL_CHAPTERS: TutorialChapter[] = [
  {
    id: 'basics',
    title: '游戏基础',
    description: '了解游戏的基本操作和界面',
    icon: '📚',
    steps: [
      {
        id: 'welcome',
        title: '欢迎来到供应链指挥官',
        content: '在这个游戏中，你将扮演一家公司的CEO，通过生产、交易和投资来建立你的商业帝国。让我们开始学习基础操作吧！',
        action: 'info',
        tips: ['按空格键可以暂停/继续游戏', '使用数字键1-4可以调整游戏速度'],
      },
      {
        id: 'dashboard',
        title: '了解仪表盘',
        content: '仪表盘显示了你公司的关键信息：现金余额、资产状况和市场动态。这是你了解公司状况的第一站。',
        targetPage: 'dashboard',
        action: 'navigate',
        tips: ['现金余额显示你当前可用的资金', '资产价值包括建筑、库存和现金'],
      },
      {
        id: 'speed_control',
        title: '控制游戏速度',
        content: '游戏右上角有速度控制按钮。你可以暂停游戏仔细思考策略，或者加速推进游戏进度。',
        action: 'info',
        tips: ['暂停时可以自由查看信息和下达指令', '加速可以快速积累资源'],
      },
    ],
    reward: '🎓 基础操作徽章',
  },
  {
    id: 'production',
    title: '生产系统',
    description: '学习如何建造和管理生产建筑',
    icon: '🏭',
    steps: [
      {
        id: 'production_intro',
        title: '生产页面介绍',
        content: '生产页面是管理你所有建筑的地方。在这里你可以建造新建筑、升级现有建筑和管理生产配方。',
        targetPage: 'production',
        action: 'navigate',
      },
      {
        id: 'build_first',
        title: '建造你的第一座建筑',
        content: '点击"新建建筑"按钮，选择一个基础建筑（如采矿场或农场）来开始生产原材料。',
        action: 'build',
        tips: ['初期建议建造原材料生产建筑', '建筑需要时间和材料来完成建造'],
      },
      {
        id: 'production_chain',
        title: '理解生产链',
        content: '游戏中的商品有生产链关系。原材料→加工品→成品。例如：铁矿石→钢铁→机械。规划好生产链可以获得更高利润。',
        action: 'info',
        tips: ['垂直整合可以减少对市场的依赖', '专精某个产业链可以获得规模效应'],
      },
    ],
    reward: '🏗️ 生产新手徽章',
  },
  {
    id: 'trading',
    title: '市场交易',
    description: '学习如何在市场上买卖商品',
    icon: '📊',
    steps: [
      {
        id: 'market_intro',
        title: '市场页面介绍',
        content: '市场页面显示所有可交易商品的价格和供需情况。你可以在这里买入原材料或卖出产品。',
        targetPage: 'market',
        action: 'navigate',
      },
      {
        id: 'price_reading',
        title: '阅读价格信息',
        content: '每种商品都有当前价格、涨跌幅和成交量。绿色表示价格上涨，红色表示下跌。',
        action: 'info',
        tips: ['关注价格趋势，低买高卖', '成交量大的商品流动性更好'],
      },
      {
        id: 'place_order',
        title: '下单交易',
        content: '点击商品后可以下买单或卖单。设置价格和数量后提交订单，系统会自动撮合交易。',
        action: 'trade',
        tips: ['限价单可以等待更好的价格', '市价单可以立即成交'],
      },
    ],
    reward: '💹 交易新手徽章',
  },
  {
    id: 'finance',
    title: '财务管理',
    description: '学习如何管理公司财务',
    icon: '💰',
    steps: [
      {
        id: 'finance_intro',
        title: '财务页面介绍',
        content: '财务页面显示你公司的损益情况、资产分布和贷款信息。',
        targetPage: 'finance',
        action: 'navigate',
      },
      {
        id: 'cash_flow',
        title: '管理现金流',
        content: '保持健康的现金流是生存的关键。收入来自销售产品，支出包括采购、维护和贷款利息。',
        action: 'info',
        tips: ['保持一定的现金储备应对突发情况', '贷款可以帮助扩张但会产生利息'],
      },
      {
        id: 'loan_system',
        title: '贷款系统',
        content: '如果需要资金扩张，可以申请贷款。不同类型的贷款有不同的利率和期限。',
        action: 'info',
        tips: ['信用评级会影响贷款利率', '抵押品可以降低利率'],
      },
    ],
    reward: '🏦 财务新手徽章',
  },
  {
    id: 'investment',
    title: '投资与竞争',
    description: '学习股票投资和公司竞争',
    icon: '📈',
    steps: [
      {
        id: 'investment_intro',
        title: '竞争与投资页面',
        content: '这里你可以查看竞争对手的情况，买卖其他公司的股票，甚至收购其他公司。',
        targetPage: 'investment',
        action: 'navigate',
      },
      {
        id: 'stock_trading',
        title: '股票交易',
        content: '你可以买入AI公司的股票来获取投资收益，或者通过持股获得公司控制权。',
        action: 'info',
        tips: ['持股超过50%可以控股一家公司', '关注公司业绩选择投资标的'],
      },
      {
        id: 'ipo',
        title: '公司上市',
        content: '当你的公司发展到一定规模，可以通过IPO上市，向公众出售股份来获得融资。',
        action: 'info',
        tips: ['IPO可以获得大量资金', '上市后股票可以自由交易'],
      },
    ],
    reward: '🎯 投资新手徽章',
  },
];

// ============ 教程状态管理 ============

function loadTutorialState(): TutorialState {
  try {
    const saved = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load tutorial state:', e);
  }
  
  return createDefaultTutorialState();
}

function saveTutorialState(state: TutorialState): void {
  try {
    localStorage.setItem(TUTORIAL_STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save tutorial state:', e);
  }
}

// ============ 教程上下文 ============

interface TutorialContextValue {
  state: TutorialState;
  startTutorial: () => void;
  dismissWelcome: () => void;
  nextStep: () => void;
  prevStep: () => void;
  skipChapter: () => void;
  exitTutorial: () => void;
  resetTutorial: () => void;
  currentChapter: TutorialChapter | null;
  currentStep: TutorialStep | null;
  progress: number;
}

const TutorialContext = React.createContext<TutorialContextValue | null>(null);

export function useTutorial() {
  const context = React.useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within TutorialProvider');
  }
  return context;
}

// ============ 教程提供者组件 ============

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<TutorialState>(loadTutorialState);
  const { setCurrentPage } = useGameStore();
  
  // 保存状态
  useEffect(() => {
    saveTutorialState(state);
  }, [state]);
  
  // 当前章节和步骤
  const currentChapter = useMemo(() => {
    if (!state.isActive) return null;
    return TUTORIAL_CHAPTERS[state.currentChapterIndex] || null;
  }, [state.isActive, state.currentChapterIndex]);
  
  const currentStep = useMemo(() => {
    if (!currentChapter) return null;
    return currentChapter.steps[state.currentStepIndex] || null;
  }, [currentChapter, state.currentStepIndex]);
  
  // 计算总进度
  const progress = useMemo(() => {
    const totalSteps = TUTORIAL_CHAPTERS.reduce((sum, ch) => sum + ch.steps.length, 0);
    return totalSteps > 0 ? (state.completedSteps.length / totalSteps) * 100 : 0;
  }, [state.completedSteps]);
  
  // 开始教程
  const startTutorial = useCallback(() => {
    setState(prev => startTutorialFlow(prev));
  }, []);

  const dismissWelcome = useCallback(() => {
    setState(prev => dismissTutorialWelcome(prev));
  }, []);
  
  // 下一步
  const nextStep = useCallback(() => {
    setState(prev => {
      const chapter = TUTORIAL_CHAPTERS[prev.currentChapterIndex];
      if (!chapter) return prev;
      
      const step = chapter.steps[prev.currentStepIndex];
      const newCompletedSteps = step && !prev.completedSteps.includes(step.id)
        ? [...prev.completedSteps, step.id]
        : prev.completedSteps;
      
      // 检查是否到达章节末尾
      if (prev.currentStepIndex >= chapter.steps.length - 1) {
        // 检查是否到达教程末尾
        if (prev.currentChapterIndex >= TUTORIAL_CHAPTERS.length - 1) {
          return {
            ...prev,
            isActive: false,
            completedSteps: newCompletedSteps,
            completedChapters: [...prev.completedChapters, chapter.id],
          };
        }
        
        // 进入下一章节
        const nextChapter = TUTORIAL_CHAPTERS[prev.currentChapterIndex + 1];
        if (nextChapter?.steps[0]?.targetPage) {
          setCurrentPage(nextChapter.steps[0].targetPage as any);
        }
        
        return {
          ...prev,
          currentChapterIndex: prev.currentChapterIndex + 1,
          currentStepIndex: 0,
          completedSteps: newCompletedSteps,
          completedChapters: [...prev.completedChapters, chapter.id],
        };
      }
      
      // 进入下一步
      const nextStep = chapter.steps[prev.currentStepIndex + 1];
      if (nextStep?.targetPage) {
        setCurrentPage(nextStep.targetPage as any);
      }
      
      return {
        ...prev,
        currentStepIndex: prev.currentStepIndex + 1,
        completedSteps: newCompletedSteps,
      };
    });
  }, [setCurrentPage]);
  
  // 上一步
  const prevStep = useCallback(() => {
    setState(prev => {
      if (prev.currentStepIndex > 0) {
        return { ...prev, currentStepIndex: prev.currentStepIndex - 1 };
      }
      if (prev.currentChapterIndex > 0) {
        const prevChapter = TUTORIAL_CHAPTERS[prev.currentChapterIndex - 1];
        return {
          ...prev,
          currentChapterIndex: prev.currentChapterIndex - 1,
          currentStepIndex: prevChapter.steps.length - 1,
        };
      }
      return prev;
    });
  }, []);
  
  // 跳过章节
  const skipChapter = useCallback(() => {
    setState(prev => {
      if (prev.currentChapterIndex >= TUTORIAL_CHAPTERS.length - 1) {
        return { ...prev, isActive: false };
      }
      return {
        ...prev,
        currentChapterIndex: prev.currentChapterIndex + 1,
        currentStepIndex: 0,
      };
    });
  }, []);
  
  // 退出教程
  const exitTutorial = useCallback(() => {
    setState(prev => ({ ...prev, isActive: false }));
  }, []);
  
  // 重置教程
  const resetTutorial = useCallback(() => {
    setState(createDefaultTutorialState());
  }, []);
  
  const value: TutorialContextValue = {
    state,
    startTutorial,
    dismissWelcome,
    nextStep,
    prevStep,
    skipChapter,
    exitTutorial,
    resetTutorial,
    currentChapter,
    currentStep,
    progress,
  };
  
  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
};

// ============ 教程弹窗组件 ============

export const TutorialDialog: React.FC = () => {
  const { state, currentChapter, currentStep, nextStep, prevStep, skipChapter, exitTutorial, progress } = useTutorial();
  
  if (!state.isActive || !currentChapter || !currentStep) {
    return null;
  }
  
  const isFirstStep = state.currentChapterIndex === 0 && state.currentStepIndex === 0;
  const isLastStep = 
    state.currentChapterIndex === TUTORIAL_CHAPTERS.length - 1 &&
    state.currentStepIndex === currentChapter.steps.length - 1;
  
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 pointer-events-none">
      <Card 
        variant="game" 
        className="w-full max-w-lg pointer-events-auto shadow-2xl"
        padding="none"
      >
        {/* 进度条 */}
        <div className="h-1 bg-[var(--bg-muted)]">
          <div 
            className="h-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <CardHeader>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{currentChapter.icon}</span>
              <div>
                <Badge variant="outline" size="sm">{currentChapter.title}</Badge>
                <h3 className="text-lg font-bold text-[var(--text-primary)] mt-1">
                  {currentStep.title}
                </h3>
              </div>
            </div>
            <Button variant="ghost" size="xs" onClick={exitTutorial}>
              ✕
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-[var(--text-secondary)]">{currentStep.content}</p>
          
          {currentStep.tips && currentStep.tips.length > 0 && (
            <div className="bg-[var(--bg-muted)] rounded-lg p-3 space-y-1">
              <p className="text-xs font-medium text-[var(--text-muted)]">💡 小贴士</p>
              {currentStep.tips.map((tip, i) => (
                <p key={i} className="text-sm text-[var(--text-secondary)]">• {tip}</p>
              ))}
            </div>
          )}
          
          {/* 步骤指示器 */}
          <div className="flex items-center justify-center gap-1.5">
            {currentChapter.steps.map((step, i) => (
              <div 
                key={step.id}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === state.currentStepIndex 
                    ? 'bg-[var(--accent)]' 
                    : i < state.currentStepIndex 
                      ? 'bg-[var(--success)]'
                      : 'bg-[var(--border-muted)]'
                }`}
              />
            ))}
          </div>
        </CardContent>
        
        {/* 按钮区域 */}
        <div className="flex justify-between items-center px-4 py-3 border-t border-[var(--border-muted)]">
          <div className="flex gap-2">
            {!isFirstStep && (
              <Button variant="ghost" size="sm" onClick={prevStep}>
                ← 上一步
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={skipChapter}>
              跳过章节
            </Button>
          </div>
          <Button variant="gradient" size="sm" onClick={nextStep}>
            {isLastStep ? '完成教程 🎉' : '下一步 →'}
          </Button>
        </div>
      </Card>
    </div>
  );
};

// ============ 欢迎对话框 ============

export const TutorialWelcomeDialog: React.FC = () => {
  const { state, startTutorial, dismissWelcome } = useTutorial();

  const handleStart = () => {
    startTutorial();
  };
  
  const handleSkip = () => {
    dismissWelcome();
  };
  
  return (
    <Dialog
      open={state.showWelcome}
      onOpenChange={(open) => {
        if (!open) {
          dismissWelcome();
        }
      }}
    >
      <DialogContent size="md" variant="game">
        <DialogHeader>
          <DialogTitle className="text-2xl">🎮 欢迎来到供应链指挥官！</DialogTitle>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            这是一款经济模拟游戏，你将经营一家公司，通过生产、交易和投资来扩展你的商业帝国。
          </p>
          
          <div className="grid grid-cols-2 gap-3">
            {TUTORIAL_CHAPTERS.slice(0, 4).map((chapter) => (
              <Card key={chapter.id} variant="elevated" padding="sm">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{chapter.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{chapter.title}</p>
                    <p className="text-xs text-[var(--text-muted)]">{chapter.description}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          
          <p className="text-sm text-[var(--text-muted)] text-center">
            教程将引导你了解游戏的各个系统
          </p>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={handleSkip}>
            我已了解，跳过教程
          </Button>
          <Button variant="gradient" onClick={handleStart}>
            开始教程 🚀
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============ 教程章节列表组件 ============

export const TutorialChapterList: React.FC = () => {
  const { state, startTutorial, resetTutorial } = useTutorial();
  
  return (
    <Card variant="elevated">
      <CardHeader>
        <div className="flex justify-between items-center w-full">
          <CardTitle>📖 新手教程</CardTitle>
          <div className="flex gap-2">
            {state.completedChapters.length > 0 && (
              <Button variant="ghost" size="xs" onClick={resetTutorial}>
                重置进度
              </Button>
            )}
            <Button variant="gradient" size="sm" onClick={startTutorial}>
              开始教程
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {TUTORIAL_CHAPTERS.map((chapter, index) => {
          const isCompleted = state.completedChapters.includes(chapter.id);
          const completedSteps = chapter.steps.filter(s => state.completedSteps.includes(s.id)).length;
          const progress = (completedSteps / chapter.steps.length) * 100;
          
          return (
            <div 
              key={chapter.id}
              className={`p-3 rounded-lg border ${
                isCompleted 
                  ? 'border-[var(--success)]/30 bg-[var(--success)]/5' 
                  : 'border-[var(--border-muted)] bg-[var(--bg-muted)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{chapter.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">{chapter.title}</span>
                      {isCompleted && <Badge variant="success" size="sm">已完成</Badge>}
                    </div>
                    <p className="text-sm text-[var(--text-muted)]">{chapter.description}</p>
                  </div>
                </div>
                {chapter.reward && isCompleted && (
                  <span className="text-sm">{chapter.reward}</span>
                )}
              </div>
              
              {/* 进度条 */}
              {!isCompleted && progress > 0 && (
                <div className="mt-2 h-1 bg-[var(--border-muted)] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[var(--accent)] transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default TutorialProvider;
