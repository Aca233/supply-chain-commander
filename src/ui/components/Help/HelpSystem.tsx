/**
 * HelpSystem.tsx - 上下文帮助系统
 * 
 * 提供游戏各功能的详细帮助文档和上下文提示
 */

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/ui/design-system/components/Dialog';
import { Button } from '@/ui/design-system/components/Button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/ui/design-system/components/Card';
import { Badge } from '@/ui/design-system/components/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/ui/design-system/components/Tabs';
import { cn } from '@/ui/design-system/utils/cn';

// ==================== 帮助主题定义 ====================

export type HelpTopicCategory = 
  | 'basics'        // 基础概念
  | 'production'    // 生产系统
  | 'trading'       // 交易市场
  | 'finance'       // 财务管理
  | 'investment'    // 投资与收购
  | 'strategy';     // 策略技巧

export interface HelpTopic {
  id: string;
  title: string;
  category: HelpTopicCategory;
  icon: string;
  summary: string;
  content: HelpSection[];
  relatedTopics?: string[];
  keywords?: string[];
}

export interface HelpSection {
  title: string;
  content: string;
  tips?: string[];
  warnings?: string[];
}

// ==================== 帮助内容定义 ====================

const HELP_TOPICS: HelpTopic[] = [
  // 基础概念
  {
    id: 'game_overview',
    title: '游戏概述',
    category: 'basics',
    icon: '🎮',
    summary: '了解供应链指挥官的核心玩法',
    content: [
      {
        title: '游戏目标',
        content: '在供应链指挥官中，你将经营一家公司，通过建设生产设施、交易商品、投资金融市场来扩大你的商业帝国。最终目标是成为最富有的企业家。',
        tips: ['从小规模开始，逐步扩张', '关注市场需求，生产有利可图的商品']
      },
      {
        title: '游戏时间',
        content: '游戏采用按天推进的模拟时间系统，1个游戏日 = 1个tick。你可以调整游戏速度（1x/2x/4x/8x）或暂停游戏进行规划。',
        tips: ['在关键决策时暂停游戏思考', '高速运行时注意监控财务状况']
      }
    ],
    relatedTopics: ['cash_management', 'first_building'],
    keywords: ['开始', '新手', '入门', '目标']
  },
  {
    id: 'cash_management',
    title: '现金管理',
    category: 'basics',
    icon: '💵',
    summary: '学习如何管理你的资金流',
    content: [
      {
        title: '现金的重要性',
        content: '现金是你经营活动的基础。建造设施、购买材料、支付维护费用都需要现金。保持健康的现金流是成功的关键。',
        warnings: ['现金耗尽会导致无法维护建筑，生产停滞']
      },
      {
        title: '收入来源',
        content: '主要收入来源包括：\n• 在市场出售商品\n• 零售店销售\n• 投资分红\n• 贷款（需要还款）',
        tips: ['多样化收入来源以降低风险']
      },
      {
        title: '支出控制',
        content: '主要支出包括：\n• 建筑维护费\n• 劳动力成本\n• 原材料采购\n• 贷款利息\n\n控制支出是保持盈利的关键。',
        tips: ['关闭不盈利的设施可以节省维护费']
      }
    ],
    relatedTopics: ['loans', 'trading_basics'],
    keywords: ['钱', '资金', '现金', '收入', '支出']
  },
  
  // 生产系统
  {
    id: 'first_building',
    title: '建造第一座设施',
    category: 'production',
    icon: '🏭',
    summary: '学习如何建造和管理生产设施',
    content: [
      {
        title: '选择建筑类型',
        content: '游戏中有多种建筑类型：\n• 采掘类：开采原材料（矿山、农场等）\n• 加工类：将原材料加工成中间产品\n• 制造类：生产最终商品\n• 零售类：直接向消费者销售商品',
        tips: ['新手建议从农场或矿山开始', '采掘类建筑不需要原材料投入']
      },
      {
        title: '建造流程',
        content: '1. 在生产页面点击"新建建筑"\n2. 选择建筑类型\n3. 选择生产配方（决定产出什么商品）\n4. 确认建造\n\n建造需要时间和材料，完成后自动开始生产。',
        tips: ['建造期间会自动采购缺少的材料']
      },
      {
        title: '升级建筑',
        content: '建筑可以升级以提高产能。每级升级：\n• 增加产出数量\n• 可能解锁新的生产方式\n• 增加附属建筑槽位\n\n升级需要花费资金和材料。',
        tips: ['优先升级盈利最高的建筑']
      }
    ],
    relatedTopics: ['production_methods', 'supply_chain'],
    keywords: ['建筑', '设施', '建造', '升级', '工厂']
  },
  {
    id: 'production_methods',
    title: '生产方式',
    category: 'production',
    icon: '⚙️',
    summary: '了解如何优化生产效率',
    content: [
      {
        title: '什么是生产方式',
        content: '每座建筑有多个生产槽位，每个槽位可以选择不同的生产方式。生产方式影响：\n• 产出效率\n• 资源消耗\n• 品质等级\n• 能源消耗',
        tips: ['不同生产方式需要不同的建筑等级解锁']
      },
      {
        title: '选择策略',
        content: '根据市场情况选择合适的生产方式：\n• 原材料便宜时：使用高消耗高产出方式\n• 追求品质时：使用精密生产方式\n• 节约成本时：使用节能生产方式',
        tips: ['切换生产方式需要花费资金', '频繁切换会降低效率']
      }
    ],
    relatedTopics: ['first_building', 'quality_system'],
    keywords: ['生产', '方式', '槽位', '效率']
  },
  {
    id: 'supply_chain',
    title: '供应链管理',
    category: 'production',
    icon: '🔗',
    summary: '建立高效的供应链体系',
    content: [
      {
        title: '垂直整合',
        content: '垂直整合意味着自己生产所需的原材料。例如：\n• 拥有农场生产小麦\n• 拥有面粉厂加工面粉\n• 拥有面包厂生产面包\n\n这样可以减少对市场的依赖，降低成本。',
        tips: ['完整的供应链可以获得成就', '注意各环节的产能平衡']
      },
      {
        title: '市场采购',
        content: '也可以选择从市场采购原材料，专注于高附加值的最终产品生产。这需要：\n• 关注市场价格波动\n• 在低价时囤积原材料\n• 保持足够的库存缓冲',
        warnings: ['市场价格波动可能影响利润']
      }
    ],
    relatedTopics: ['trading_basics', 'first_building'],
    keywords: ['供应链', '整合', '原材料', '采购']
  },
  
  // 交易市场
  {
    id: 'trading_basics',
    title: '交易入门',
    category: 'trading',
    icon: '📈',
    summary: '学习市场交易的基础知识',
    content: [
      {
        title: '市场机制',
        content: '游戏采用订单簿交易系统：\n• 买单：指定价格和数量购买商品\n• 卖单：指定价格和数量出售商品\n• 当买卖价格匹配时自动成交',
        tips: ['观察当前买卖价差了解市场流动性']
      },
      {
        title: '价格波动',
        content: '商品价格受供需关系影响：\n• 供大于求：价格下跌\n• 供不应求：价格上涨\n• 季节性需求会造成周期性波动',
        tips: ['在价格低点买入，高点卖出']
      },
      {
        title: '交易策略',
        content: '常见策略包括：\n• 套利：利用价格差异获利\n• 囤积：低价买入等待涨价\n• 做市：同时挂买卖单赚取价差',
        warnings: ['囤积商品会占用资金和仓储']
      }
    ],
    relatedTopics: ['price_analysis', 'order_types'],
    keywords: ['交易', '市场', '买卖', '价格']
  },
  {
    id: 'price_analysis',
    title: '价格分析',
    category: 'trading',
    icon: '📊',
    summary: '如何分析和预测价格走势',
    content: [
      {
        title: '价格趋势',
        content: '关注以下指标判断趋势：\n• 价格变化百分比\n• 成交量变化\n• 供需比例\n\n上涨趋势：持续正向变化\n下跌趋势：持续负向变化',
        tips: ['结合多个指标做出判断']
      },
      {
        title: '供需分析',
        content: '供需影响价格的核心因素：\n• 生产者数量和产能\n• 消费者需求量\n• 库存水平\n\n供需失衡会导致价格剧烈波动。',
        tips: ['关注AI公司的生产动向']
      }
    ],
    relatedTopics: ['trading_basics', 'supply_chain'],
    keywords: ['价格', '分析', '趋势', '预测']
  },
  
  // 财务管理
  {
    id: 'loans',
    title: '贷款系统',
    category: 'finance',
    icon: '🏦',
    summary: '了解如何利用贷款扩张',
    content: [
      {
        title: '贷款类型',
        content: '游戏提供多种贷款：\n• 短期贷款：期限短，利率低\n• 长期贷款：期限长，额度大\n• 信用贷款：无需抵押，但利率较高',
        tips: ['根据资金需求选择合适的贷款类型']
      },
      {
        title: '信用评级',
        content: '你的信用评级影响：\n• 可贷款额度\n• 贷款利率\n• 审批通过率\n\n按时还款可以提高信用评级。',
        warnings: ['逾期还款会严重损害信用']
      },
      {
        title: '还款策略',
        content: '• 按月还款：每月自动扣除\n• 提前还款：可能有违约金\n• 展期：延长还款期限（需要额外利息）',
        tips: ['资金充裕时考虑提前还款节省利息']
      }
    ],
    relatedTopics: ['cash_management', 'financial_planning'],
    keywords: ['贷款', '借款', '利率', '还款', '信用']
  },
  {
    id: 'financial_planning',
    title: '财务规划',
    category: 'finance',
    icon: '📋',
    summary: '制定长期财务计划',
    content: [
      {
        title: '现金流预测',
        content: '规划未来收支：\n• 预期收入（销售、分红等）\n• 固定支出（维护、人工等）\n• 可变支出（采购、投资等）\n\n确保现金流始终为正。',
        tips: ['保持至少7天运营费用的现金储备']
      },
      {
        title: '投资回报分析',
        content: '评估投资决策：\n• 投资回收期\n• 预期年化回报率\n• 风险评估\n\n优先选择回报高、风险低的投资。',
        tips: ['不要把所有资金投入单一项目']
      }
    ],
    relatedTopics: ['loans', 'stock_market'],
    keywords: ['财务', '规划', '预算', '现金流']
  },
  
  // 投资与收购
  {
    id: 'stock_market',
    title: '股票市场',
    category: 'investment',
    icon: '📈',
    summary: '通过股票投资获取被动收入',
    content: [
      {
        title: '股票交易',
        content: '你可以买卖其他公司的股票：\n• 市价单：按当前价格立即成交\n• 限价单：指定价格等待成交\n\n持有股票可以获得分红和资本增值。',
        tips: ['分散投资降低风险']
      },
      {
        title: '公司上市（IPO）',
        content: '当你的公司达到一定规模后，可以选择上市：\n• 设定发行股数和价格\n• 获得大量现金用于扩张\n• 但会稀释你的控制权',
        warnings: ['上市后需要向股东负责']
      },
      {
        title: '持股控制',
        content: '持有其他公司足够的股份可以获得控制权：\n• 10%+：信息披露权\n• 25%+：重大事项否决权\n• 51%+：控股权\n• 90%+：全面收购权',
        tips: ['控股公司可以协调生产和定价']
      }
    ],
    relatedTopics: ['acquisition', 'financial_planning'],
    keywords: ['股票', 'IPO', '上市', '投资', '分红']
  },
  {
    id: 'acquisition',
    title: '公司收购',
    category: 'investment',
    icon: '🏢',
    summary: '通过收购扩大商业版图',
    content: [
      {
        title: '收购方式',
        content: '收购其他公司的方式：\n• 友好收购：与目标公司协商\n• 敌意收购：直接向股东报价\n• 资产收购：只购买特定资产',
        tips: ['友好收购成功率更高']
      },
      {
        title: '估值方法',
        content: '评估目标公司价值：\n• 账面价值：资产减负债\n• 市场价值：股票市值\n• 企业价值：考虑债务和现金',
        tips: ['不要支付过高的溢价']
      },
      {
        title: '整合管理',
        content: '收购完成后需要整合：\n• 设定经营策略\n• 协调生产计划\n• 优化资源配置',
        tips: ['收购后可以转移资产']
      }
    ],
    relatedTopics: ['stock_market', 'strategy_expansion'],
    keywords: ['收购', '并购', '整合', '控股']
  },
  
  // 策略技巧
  {
    id: 'strategy_basics',
    title: '基础策略',
    category: 'strategy',
    icon: '💡',
    summary: '新手必知的成功策略',
    content: [
      {
        title: '起步策略',
        content: '1. 建造1-2座采掘设施\n2. 出售原材料获得收入\n3. 积累资金后扩建\n4. 逐步向下游延伸',
        tips: ['不要急于扩张', '保持正现金流']
      },
      {
        title: '风险管理',
        content: '• 分散投资多种商品\n• 保持现金储备\n• 避免过度负债\n• 关注市场变化',
        warnings: ['不要把所有鸡蛋放在一个篮子里']
      }
    ],
    relatedTopics: ['cash_management', 'first_building'],
    keywords: ['策略', '入门', '新手', '技巧']
  },
  {
    id: 'strategy_expansion',
    title: '扩张策略',
    category: 'strategy',
    icon: '🚀',
    summary: '如何有效扩大商业帝国',
    content: [
      {
        title: '有机增长',
        content: '通过建设新设施扩张：\n• 优点：成本可控，风险低\n• 缺点：速度较慢\n\n适合稳健型玩家。',
        tips: ['确保每次扩张都能盈利']
      },
      {
        title: '并购增长',
        content: '通过收购其他公司扩张：\n• 优点：快速获得产能\n• 缺点：成本高，整合难\n\n适合激进型玩家。',
        tips: ['选择经营不善但资产优质的目标']
      },
      {
        title: '多元化',
        content: '进入多个行业分散风险：\n• 横向多元化：同类产品\n• 纵向整合：上下游产业\n• 混合多元化：不相关行业',
        tips: ['专注核心业务的同时适度多元化']
      }
    ],
    relatedTopics: ['acquisition', 'supply_chain'],
    keywords: ['扩张', '增长', '多元化', '发展']
  }
];

// ==================== 工具函数 ====================

const getCategoryLabel = (category: HelpTopicCategory): string => {
  switch (category) {
    case 'basics': return '基础概念';
    case 'production': return '生产系统';
    case 'trading': return '交易市场';
    case 'finance': return '财务管理';
    case 'investment': return '投资收购';
    case 'strategy': return '策略技巧';
    default: return category;
  }
};

const getCategoryIcon = (category: HelpTopicCategory): string => {
  switch (category) {
    case 'basics': return '📚';
    case 'production': return '🏭';
    case 'trading': return '📈';
    case 'finance': return '💰';
    case 'investment': return '🏢';
    case 'strategy': return '💡';
    default: return '📋';
  }
};

// ==================== Context ====================

interface HelpContextType {
  topics: HelpTopic[];
  showHelp: (topicId?: string) => void;
  hideHelp: () => void;
  searchTopics: (query: string) => HelpTopic[];
  getTopicById: (topicId: string) => HelpTopic | undefined;
  getRelatedTopics: (topicId: string) => HelpTopic[];
}

const HelpContext = createContext<HelpContextType | null>(null);

export const useHelp = () => {
  const context = useContext(HelpContext);
  if (!context) {
    throw new Error('useHelp must be used within a HelpProvider');
  }
  return context;
};

// ==================== Provider ====================

export const HelpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState<string | null>(null);

  const showHelp = useCallback((topicId?: string) => {
    setActiveTopicId(topicId || null);
    setIsOpen(true);
  }, []);

  const hideHelp = useCallback(() => {
    setIsOpen(false);
  }, []);

  const searchTopics = useCallback((query: string): HelpTopic[] => {
    const lowerQuery = query.toLowerCase();
    return HELP_TOPICS.filter(topic => 
      topic.title.toLowerCase().includes(lowerQuery) ||
      topic.summary.toLowerCase().includes(lowerQuery) ||
      topic.keywords?.some(k => k.includes(lowerQuery))
    );
  }, []);

  const getTopicById = useCallback((topicId: string) => {
    return HELP_TOPICS.find(t => t.id === topicId);
  }, []);

  const getRelatedTopics = useCallback((topicId: string): HelpTopic[] => {
    const topic = HELP_TOPICS.find(t => t.id === topicId);
    if (!topic?.relatedTopics) return [];
    return topic.relatedTopics
      .map(id => HELP_TOPICS.find(t => t.id === id))
      .filter(Boolean) as HelpTopic[];
  }, []);

  const value: HelpContextType = {
    topics: HELP_TOPICS,
    showHelp,
    hideHelp,
    searchTopics,
    getTopicById,
    getRelatedTopics
  };

  return (
    <HelpContext.Provider value={value}>
      {children}
      <HelpDialog 
        open={isOpen} 
        onOpenChange={setIsOpen}
        initialTopicId={activeTopicId}
      />
    </HelpContext.Provider>
  );
};

// ==================== 帮助对话框 ====================

interface HelpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTopicId: string | null;
}

const HelpDialog: React.FC<HelpDialogProps> = ({
  open,
  onOpenChange,
  initialTopicId
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(initialTopicId);
  const [activeCategory, setActiveCategory] = useState<HelpTopicCategory | 'all'>('all');

  // 当初始主题ID变化时更新
  React.useEffect(() => {
    if (initialTopicId) {
      setSelectedTopicId(initialTopicId);
      const topic = HELP_TOPICS.find(t => t.id === initialTopicId);
      if (topic) {
        setActiveCategory(topic.category);
      }
    }
  }, [initialTopicId]);

  const filteredTopics = useMemo(() => {
    let topics = HELP_TOPICS;
    
    if (activeCategory !== 'all') {
      topics = topics.filter(t => t.category === activeCategory);
    }
    
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      topics = topics.filter(t => 
        t.title.toLowerCase().includes(lowerQuery) ||
        t.summary.toLowerCase().includes(lowerQuery) ||
        t.keywords?.some(k => k.includes(lowerQuery))
      );
    }
    
    return topics;
  }, [activeCategory, searchQuery]);

  const selectedTopic = useMemo(() => {
    return selectedTopicId ? HELP_TOPICS.find(t => t.id === selectedTopicId) : null;
  }, [selectedTopicId]);

  const relatedTopics = useMemo(() => {
    if (!selectedTopic?.relatedTopics) return [];
    return selectedTopic.relatedTopics
      .map(id => HELP_TOPICS.find(t => t.id === id))
      .filter(Boolean) as HelpTopic[];
  }, [selectedTopic]);

  const categories: Array<HelpTopicCategory | 'all'> = [
    'all', 'basics', 'production', 'trading', 'finance', 'investment', 'strategy'
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ❓ 帮助中心
          </DialogTitle>
          <DialogDescription>
            查找游戏功能的详细说明和使用技巧
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex gap-4">
          {/* 左侧：主题列表 */}
          <div className="w-1/3 flex flex-col overflow-hidden border-r border-border pr-4">
            {/* 搜索框 */}
            <div className="mb-3">
              <input
                type="text"
                placeholder="搜索帮助主题..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-surface-alt border border-border rounded-md text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>

            {/* 分类标签 */}
            <div className="flex flex-wrap gap-1 mb-3">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    'px-2 py-1 text-xs rounded-md transition-colors',
                    activeCategory === cat
                      ? 'bg-brand text-white'
                      : 'bg-surface-alt text-text-secondary hover:bg-surface-alt/80'
                  )}
                >
                  {cat === 'all' ? '全部' : getCategoryLabel(cat as HelpTopicCategory)}
                </button>
              ))}
            </div>

            {/* 主题列表 */}
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredTopics.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={cn(
                    'w-full text-left p-2 rounded-md transition-colors',
                    selectedTopicId === topic.id
                      ? 'bg-brand/10 border border-brand/30'
                      : 'hover:bg-surface-alt'
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{topic.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-text-primary truncate">
                        {topic.title}
                      </div>
                      <div className="text-xs text-text-secondary truncate">
                        {topic.summary}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
              
              {filteredTopics.length === 0 && (
                <div className="text-center text-text-secondary py-8">
                  未找到相关主题
                </div>
              )}
            </div>
          </div>

          {/* 右侧：主题内容 */}
          <div className="flex-1 overflow-y-auto">
            {selectedTopic ? (
              <div className="space-y-4">
                {/* 标题 */}
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{selectedTopic.icon}</span>
                  <div>
                    <h2 className="text-xl font-bold text-text-primary">
                      {selectedTopic.title}
                    </h2>
                    <Badge variant="outline" className="text-xs">
                      {getCategoryIcon(selectedTopic.category)} {getCategoryLabel(selectedTopic.category)}
                    </Badge>
                  </div>
                </div>

                <p className="text-text-secondary">{selectedTopic.summary}</p>

                {/* 内容章节 */}
                {selectedTopic.content.map((section, idx) => (
                  <Card key={idx} className="bg-surface">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{section.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-text-secondary whitespace-pre-line">
                        {section.content}
                      </p>
                      
                      {section.tips && section.tips.length > 0 && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-md p-3">
                          <div className="text-xs font-semibold text-green-400 mb-1">💡 提示</div>
                          <ul className="text-xs text-green-300 space-y-1">
                            {section.tips.map((tip, i) => (
                              <li key={i}>• {tip}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      {section.warnings && section.warnings.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-md p-3">
                          <div className="text-xs font-semibold text-amber-400 mb-1">⚠️ 注意</div>
                          <ul className="text-xs text-amber-300 space-y-1">
                            {section.warnings.map((warning, i) => (
                              <li key={i}>• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}

                {/* 相关主题 */}
                {relatedTopics.length > 0 && (
                  <div className="pt-4 border-t border-border">
                    <h4 className="text-sm font-medium text-text-secondary mb-2">相关主题</h4>
                    <div className="flex flex-wrap gap-2">
                      {relatedTopics.map((topic) => (
                        <Button
                          key={topic.id}
                          variant="secondary"
                          size="sm"
                          onClick={() => setSelectedTopicId(topic.id)}
                        >
                          {topic.icon} {topic.title}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-text-secondary">
                <div className="text-center">
                  <div className="text-4xl mb-4">📖</div>
                  <p>选择左侧的主题查看详细内容</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ==================== 帮助按钮组件 ====================

interface HelpButtonProps {
  topicId?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const HelpButton: React.FC<HelpButtonProps> = ({
  topicId,
  className,
  size = 'md'
}) => {
  const { showHelp } = useHelp();
  
  const sizeClasses = {
    sm: 'w-4 h-4 text-xs',
    md: 'w-5 h-5 text-sm',
    lg: 'w-6 h-6 text-base'
  };

  return (
    <button
      onClick={() => showHelp(topicId)}
      className={cn(
        'inline-flex items-center justify-center rounded-full bg-surface-alt hover:bg-brand/20 text-text-secondary hover:text-brand transition-colors',
        sizeClasses[size],
        className
      )}
      title="点击查看帮助"
    >
      ?
    </button>
  );
};

// ==================== 快速帮助提示组件 ====================

interface QuickHelpProps {
  topicId: string;
  children: React.ReactNode;
}

export const QuickHelp: React.FC<QuickHelpProps> = ({ topicId, children }) => {
  const { getTopicById, showHelp } = useHelp();
  const topic = getTopicById(topicId);

  if (!topic) return <>{children}</>;

  return (
    <div className="group relative inline-block">
      {children}
      <div className="hidden group-hover:block absolute z-50 w-64 p-3 bg-surface border border-border rounded-lg shadow-xl -top-2 left-full ml-2">
        <div className="flex items-center gap-2 mb-2">
          <span>{topic.icon}</span>
          <span className="font-medium text-text-primary">{topic.title}</span>
        </div>
        <p className="text-xs text-text-secondary mb-2">{topic.summary}</p>
        <Button
          variant="link"
          size="sm"
          onClick={() => showHelp(topicId)}
          className="text-xs p-0 h-auto"
        >
          查看详细帮助 →
        </Button>
      </div>
    </div>
  );
};

// ==================== 帮助面板（用于设置页面） ====================

export const HelpPanel: React.FC = () => {
  const { topics, showHelp } = useHelp();

  const categorizedTopics = useMemo(() => {
    const categories: Record<HelpTopicCategory, HelpTopic[]> = {
      basics: [],
      production: [],
      trading: [],
      finance: [],
      investment: [],
      strategy: []
    };

    topics.forEach((topic) => {
      categories[topic.category].push(topic);
    });

    return categories;
  }, [topics]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>❓ 帮助</span>
          <Button variant="secondary" size="sm" onClick={() => showHelp()}>
            打开帮助中心
          </Button>
        </CardTitle>
        <CardDescription>
          查看游戏功能的详细说明
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(categorizedTopics).map(([category, categoryTopics]) => (
          <div key={category}>
            <h4 className="text-sm font-medium text-text-secondary mb-2 flex items-center gap-2">
              {getCategoryIcon(category as HelpTopicCategory)}
              {getCategoryLabel(category as HelpTopicCategory)}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryTopics.slice(0, 4).map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => showHelp(topic.id)}
                  className="text-left p-2 rounded-md bg-surface-alt hover:bg-surface-alt/80 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{topic.icon}</span>
                    <span className="text-sm text-text-primary truncate">{topic.title}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ==================== 帮助迷你按钮 ====================

export const HelpMini: React.FC = () => {
  const { showHelp } = useHelp();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => showHelp()}
      className="gap-1"
    >
      <span>❓</span>
      <span className="text-sm">帮助</span>
    </Button>
  );
};
