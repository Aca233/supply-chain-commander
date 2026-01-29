/**
 * 模板化新闻生成器
 * 当LLM不可用时使用模板生成新闻
 */

import { MonthlyStats, NewsArticle } from './types';

// ==================== 趣味标题模板 ====================

const HEADLINE_TEMPLATES = {
  growth: [
    '经济腾飞！{month}月GDP创新高，老板们笑得合不拢嘴 🚀',
    '钱袋子鼓起来了！{month}月经济数据亮眼 💰',
    '好日子来啦！{month}月市场一片繁荣 🎉',
    '牛市来临？{month}月经济指标全线飘红 📈',
    '暴富时代！{month}月赚钱效应爆表 🤑',
  ],
  decline: [
    '艰难时刻！{month}月经济遇冷，商家们瑟瑟发抖 ❄️',
    '钱包在哭泣…{month}月经济数据令人心碎 💔',
    '过冬模式启动！{month}月市场有点冷清 🥶',
    '熬一熬！{month}月经济有点难，但明天会更好 💪',
    '寒冬将至？{month}月经济指标不太乐观 📉',
  ],
  stable: [
    '稳如老狗！{month}月经济平稳运行 🐕',
    '无功无过的一个月，{month}月经济波澜不惊 😐',
    '一切按计划进行，{month}月没什么大新闻 📰',
    '岁月静好，{month}月经济温和发展 🌤️',
    '不温不火，{month}月市场保持稳定 ⚖️',
  ],
};

// 价格新闻模板
const PRICE_TEMPLATES = {
  surge: [
    '{goods}价格起飞！涨幅{percent}%，囤货党笑了 📈',
    '{goods}成了香饽饽，价格暴涨{percent}% 💎',
    '快来抢{goods}！涨了{percent}%还在涨 🔥',
    '卖{goods}的老板躺着数钱，涨了{percent}% 🤑',
    '{goods}一飞冲天！{percent}%涨幅创纪录 🚀',
  ],
  crash: [
    '{goods}价格崩盘！跌了{percent}%，卖家哭晕在厕所 📉',
    '{goods}不香了？价格暴跌{percent}% 😱',
    '抄底时机？{goods}跌了{percent}% 💸',
    '心痛！{goods}贬值{percent}%，库存都变废纸了 😭',
    '{goods}跌跌不休，本月暴跌{percent}% 🆘',
  ],
};

// 玩家新闻模板
const PLAYER_TEMPLATES = {
  profit: [
    '玩家大赚特赚！本月盈利{amount}，请收下我的膝盖 🙇',
    '财神爷附体！玩家本月进账{amount} 🎊',
    '股神附体？玩家本月赚了{amount} 📊',
    '人生赢家！玩家本月收益{amount}，羡煞旁人 👑',
    '躺着赚钱！玩家本月入账{amount} 💤💰',
  ],
  loss: [
    '玩家略有亏损…本月-{amount}，下个月加油！💪',
    '小亏怡情，玩家本月-{amount}，问题不大 😅',
    '交了点学费，玩家本月-{amount}，吸取教训 📚',
    '暂时回调，玩家本月-{amount}，东山再起 🌅',
    '市场教育了一课，本月-{amount} 🎓',
  ],
  building: [
    '玩家疯狂扩张！本月新建{count}座建筑 🏗️',
    '基建狂魔上线！玩家本月盖了{count}座楼 🏭',
    '扩张中！玩家新增{count}座建筑，版图扩大 🗺️',
    '买买买！玩家本月添置{count}座建筑 🏢',
  ],
  noBuilding: [
    '玩家本月专注运营，暂未扩张建筑 🎯',
    '稳扎稳打，玩家本月保持现有规模 🛡️',
  ],
};

// 公司新闻模板
const COMPANY_TEMPLATES = {
  richest: [
    '{name}稳坐首富宝座！身家¥{cash}M 🤑',
    '{name}依然是最有钱的AI，{cash}M在账上 💵',
    '谁是大佬？{name}以{cash}M傲视群雄 👑',
  ],
  mostBuildings: [
    '{name}成为建筑大亨，坐拥{count}座设施 🏰',
    '产业帝国！{name}拥有{count}座建筑 🏗️',
  ],
  bankrupt: [
    '悲报！{names}宣告破产 😢',
    '黯然离场，{names}本月破产 💀',
    'R.I.P.！{names}倒闭了 🪦',
  ],
  growth: [
    '{name}增长迅猛！本月增长{percent}% 🚀',
    '黑马出现！{name}增长{percent}% 🐴',
  ],
};

// 灾难新闻模板
const DISASTER_TEMPLATES: Record<string, string[]> = {
  earthquake: [
    '天摇地动！地震袭击市场 🌋',
    '大地的愤怒！地震造成重创 💥',
  ],
  flood: [
    '洪水肆虐！多处设施受损 🌊',
    '暴雨成灾！洪水淹没生产线 🌧️',
  ],
  fire: [
    '熊熊烈火！多座工厂遭殃 🔥',
    '大火无情！火灾席卷工业区 🧯',
  ],
  plague: [
    '疫情来袭！生产受到影响 🦠',
    '病毒蔓延！市场笼罩阴霾 😷',
  ],
  default: [
    '天灾降临！市场遭受冲击 ⚠️',
    '突发灾难！经济受到影响 🆘',
  ],
};

// 趣闻模板（虚构）
const TRIVIA_TEMPLATES = [
  '趣闻：据说某AI公司CEO最近迷上了炒股，把公司一半的钱都投进了股市 🤖💹',
  '八卦：市场上流传着一个神秘买家，专门在半夜下大单，没人知道他是谁 🕵️',
  '传言：有人看到一群AI公司老板在酒吧聚会，似乎在密谋什么大事 🍻',
  '趣事：本月最勤劳的工厂24小时不停工，工人们都快变成机器人了 🤖',
  '冷知识：如果把本月交易的所有商品堆在一起，可以绕地球{random}圈 🌍',
  '奇闻：某工厂的仓库里发现了一只流浪猫，它已经在那里住了三个月 🐱',
  '花絮：有AI公司老板表示，他的成功秘诀是每天喝三杯咖啡 ☕',
  '逸事：据可靠消息，某公司的会计把账本算错了，多算了一个零 📊',
  '趣谈：市场分析师预测下个月经济走势，结果预测全部落空 🔮',
  '轶事：有玩家声称自己是游戏里最帅的老板，但没人相信 🪞',
];

// 经济周期新闻模板
const CYCLE_TEMPLATES: Record<string, string[]> = {
  expansion: [
    '经济正在扩张，各行各业蓬勃发展 📈',
    '扩张期来临，投资机会增多 💡',
  ],
  peak: [
    '经济达到顶峰，市场热情高涨 🔝',
    '繁荣期顶点，需警惕回调风险 ⚠️',
  ],
  contraction: [
    '经济进入收缩期，市场趋于谨慎 📉',
    '收缩周期中，保守策略更稳妥 🛡️',
  ],
  trough: [
    '经济触底，复苏曙光初现 🌅',
    '低谷期正是布局良机 🎯',
  ],
};

// ==================== 生成函数 ====================

/**
 * 随机选择模板
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * 格式化金额
 */
function formatMoney(amount: number): string {
  if (Math.abs(amount) >= 1e9) {
    return `${(amount / 1e9).toFixed(2)}B`;
  } else if (Math.abs(amount) >= 1e6) {
    return `${(amount / 1e6).toFixed(2)}M`;
  } else if (Math.abs(amount) >= 1e3) {
    return `${(amount / 1e3).toFixed(1)}K`;
  }
  return amount.toFixed(0);
}

/**
 * 获取周期阶段文本
 */
function getPhaseText(phase: string): string {
  const map: Record<string, string> = {
    expansion: '扩张',
    peak: '顶峰',
    contraction: '收缩',
    trough: '低谷',
  };
  return map[phase] || phase;
}

/**
 * 生成头条新闻
 */
function generateHeadline(stats: MonthlyStats, month: number): NewsArticle {
  let templates: string[];
  
  if (stats.economy.gdpChange > 5) {
    templates = HEADLINE_TEMPLATES.growth;
  } else if (stats.economy.gdpChange < -5) {
    templates = HEADLINE_TEMPLATES.decline;
  } else {
    templates = HEADLINE_TEMPLATES.stable;
  }
  
  const template = pickRandom(templates);
  const title = template.replace('{month}', String(month));
  
  // 生成内容
  const changeText = stats.economy.gdpChange >= 0 ? '增长' : '下降';
  const content = `本月GDP${changeText}${Math.abs(stats.economy.gdpChange).toFixed(1)}%，` +
    `当前通胀率${(stats.economy.inflation * 100).toFixed(1)}%，` +
    `失业率${(stats.economy.unemployment * 100).toFixed(1)}%。` +
    `经济处于${getPhaseText(stats.economy.cyclePhase)}阶段。`;
  
  // 提取emoji
  const emojiMatch = title.match(/[\u{1F300}-\u{1F9FF}]/u);
  const emoji = emojiMatch ? emojiMatch[0] : '📰';
  
  return {
    id: `headline_${month}`,
    category: 'economy',
    importance: 'headline',
    title,
    content,
    emoji,
  };
}

/**
 * 生成价格新闻
 */
function generatePriceNews(stats: MonthlyStats): NewsArticle[] {
  const news: NewsArticle[] = [];
  
  stats.priceChanges.slice(0, 3).forEach((p, i) => {
    const templates = p.changePercent > 0 ? PRICE_TEMPLATES.surge : PRICE_TEMPLATES.crash;
    const template = pickRandom(templates);
    const title = template
      .replace('{goods}', p.goodsName)
      .replace('{percent}', Math.abs(p.changePercent).toFixed(0));
    
    news.push({
      id: `price_${i}`,
      category: 'market',
      importance: Math.abs(p.changePercent) > 20 ? 'major' : 'minor',
      title,
      content: `${p.goodsName}从¥${p.startPrice.toFixed(0)}变到¥${p.endPrice.toFixed(0)}，` +
        `变化幅度${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(1)}%`,
      emoji: p.changePercent > 0 ? '📈' : '📉',
    });
  });
  
  return news;
}

/**
 * 生成玩家新闻
 */
function generatePlayerNews(stats: MonthlyStats): NewsArticle[] {
  const news: NewsArticle[] = [];
  
  // 盈亏新闻
  const profitTemplates = stats.playerStats.cashChange >= 0 
    ? PLAYER_TEMPLATES.profit 
    : PLAYER_TEMPLATES.loss;
  const profitTemplate = pickRandom(profitTemplates);
  const amount = formatMoney(Math.abs(stats.playerStats.cashChange));
  
  news.push({
    id: 'player_profit',
    category: 'player',
    importance: 'major',
    title: profitTemplate.replace('{amount}', `¥${amount}`),
    content: `玩家本月资金变化${stats.playerStats.cashChangePercent >= 0 ? '+' : ''}${stats.playerStats.cashChangePercent.toFixed(1)}%，` +
      `完成${stats.playerStats.tradesCompleted}笔交易，总额¥${formatMoney(stats.playerStats.totalTradeValue)}`,
    emoji: stats.playerStats.cashChange >= 0 ? '💰' : '📉',
  });
  
  // 建筑新闻
  if (stats.playerStats.buildingsBuilt > 0) {
    const buildTemplate = pickRandom(PLAYER_TEMPLATES.building);
    news.push({
      id: 'player_building',
      category: 'player',
      importance: 'minor',
      title: buildTemplate.replace('{count}', String(stats.playerStats.buildingsBuilt)),
      content: `新建${stats.playerStats.buildingsBuilt}座，拆除${stats.playerStats.buildingsDemolished}座`,
      emoji: '🏗️',
    });
  }
  
  // 最大单笔交易
  if (stats.playerStats.largestTrade) {
    news.push({
      id: 'player_trade',
      category: 'player',
      importance: 'minor',
      title: `大手笔！玩家单笔交易¥${formatMoney(stats.playerStats.largestTrade.value)} 💎`,
      content: `玩家在${stats.playerStats.largestTrade.goodsName}上完成了一笔大额交易`,
      emoji: '💎',
    });
  }
  
  return news;
}

/**
 * 生成公司新闻
 */
function generateCompanyNews(stats: MonthlyStats): NewsArticle[] {
  const news: NewsArticle[] = [];
  
  // 最富有公司
  if (stats.companyRankings.richest.length > 0) {
    const top = stats.companyRankings.richest[0];
    const template = pickRandom(COMPANY_TEMPLATES.richest);
    news.push({
      id: 'company_richest',
      category: 'company',
      importance: 'minor',
      title: template
        .replace('{name}', top.name)
        .replace('{cash}', (top.cash / 1e6).toFixed(1)),
      content: `在众多AI公司中，${top.name}以雄厚的资金实力傲视群雄`,
      emoji: '🤑',
    });
  }
  
  // 建筑大亨
  if (stats.companyRankings.mostBuildings.length > 0) {
    const top = stats.companyRankings.mostBuildings[0];
    if (top.count >= 5) {
      const template = pickRandom(COMPANY_TEMPLATES.mostBuildings);
      news.push({
        id: 'company_buildings',
        category: 'company',
        importance: 'minor',
        title: template
          .replace('{name}', top.name)
          .replace('{count}', String(top.count)),
        content: `${top.name}拥有最多的生产设施，产能惊人`,
        emoji: '🏰',
      });
    }
  }
  
  // 增长黑马
  if (stats.companyRankings.mostGrowth.length > 0) {
    const top = stats.companyRankings.mostGrowth[0];
    if (top.growthPercent > 20) {
      const template = pickRandom(COMPANY_TEMPLATES.growth);
      news.push({
        id: 'company_growth',
        category: 'company',
        importance: 'minor',
        title: template
          .replace('{name}', top.name)
          .replace('{percent}', top.growthPercent.toFixed(0)),
        content: `${top.name}本月业绩亮眼，增速领先`,
        emoji: '🚀',
      });
    }
  }
  
  // 破产新闻
  if (stats.companyRankings.bankrupt.length > 0) {
    const bankruptNames = stats.companyRankings.bankrupt.map(c => c.name).join('、');
    const template = pickRandom(COMPANY_TEMPLATES.bankrupt);
    news.push({
      id: 'company_bankrupt',
      category: 'company',
      importance: 'major',
      title: template.replace('{names}', bankruptNames),
      content: `本月共有${stats.companyRankings.bankrupt.length}家公司未能挺过难关，祝他们下次好运`,
      emoji: '💀',
    });
  }
  
  return news;
}

/**
 * 生成灾难新闻
 */
function generateDisasterNews(stats: MonthlyStats): NewsArticle[] {
  return stats.disasters.map((d, i) => {
    const templates = DISASTER_TEMPLATES[d.type.toLowerCase()] || DISASTER_TEMPLATES.default;
    const template = pickRandom(templates);
    
    return {
      id: `disaster_${i}`,
      category: 'disaster',
      importance: 'major',
      title: template,
      content: `${d.severity}级${d.type}造成严重影响：${d.impact}`,
      emoji: getDisasterEmoji(d.type),
    };
  });
}

/**
 * 获取灾难表情
 */
function getDisasterEmoji(type: string): string {
  const map: Record<string, string> = {
    earthquake: '🌋',
    flood: '🌊',
    fire: '🔥',
    plague: '🦠',
  };
  return map[type.toLowerCase()] || '⚠️';
}

/**
 * 生成经济周期新闻
 */
function generateCycleNews(stats: MonthlyStats): NewsArticle | null {
  const templates = CYCLE_TEMPLATES[stats.economy.cyclePhase];
  if (!templates) return null;
  
  const template = pickRandom(templates);
  
  return {
    id: 'economy_cycle',
    category: 'economy',
    importance: 'minor',
    title: template,
    content: `当前经济处于${getPhaseText(stats.economy.cyclePhase)}阶段，` +
      `通胀率${(stats.economy.inflation * 100).toFixed(1)}%，失业率${(stats.economy.unemployment * 100).toFixed(1)}%`,
    emoji: stats.economy.cyclePhase === 'expansion' || stats.economy.cyclePhase === 'peak' ? '📈' : '📉',
  };
}

/**
 * 生成趣闻
 */
function generateTrivia(): NewsArticle {
  let template = pickRandom(TRIVIA_TEMPLATES);
  template = template.replace('{random}', String(Math.floor(Math.random() * 100) + 1));
  
  // 提取emoji
  const emojiMatch = template.match(/[\u{1F300}-\u{1F9FF}]/u);
  const emoji = emojiMatch ? emojiMatch[0] : '🎭';
  
  return {
    id: 'trivia',
    category: 'entertainment',
    importance: 'trivia',
    title: template,
    content: '（本条新闻纯属虚构，如有雷同，纯属巧合）',
    emoji,
  };
}

/**
 * 生成月度总结
 */
function generateSummary(stats: MonthlyStats, month: number): string {
  const trend = stats.economy.gdpChange > 0 
    ? '欣欣向荣' 
    : stats.economy.gdpChange < -5 
      ? '有点难熬' 
      : '平平无奇';
  
  const playerStatus = stats.playerStats.cashChange > 0 
    ? '赚到了' 
    : stats.playerStats.cashChange < 0 
      ? '亏了点'
      : '不赚不亏';
  
  const suffixes = [
    '下个月继续加油！',
    '期待明天会更好！',
    '机会总是留给有准备的人！',
    '风雨过后见彩虹！',
    '稳住，我们能赢！',
  ];
  
  return `${month}月总体${trend}，玩家${playerStatus}，${pickRandom(suffixes)}`;
}

/**
 * 生成模板新闻（主入口）
 */
export function generateTemplateNews(
  stats: MonthlyStats,
  year: number,
  month: number
): {
  headline: NewsArticle;
  articles: NewsArticle[];
  summary: string;
} {
  const articles: NewsArticle[] = [];
  
  // 1. 生成头条
  const headline = generateHeadline(stats, month);
  
  // 2. 价格新闻（取变化最大的3个）
  const priceNews = generatePriceNews(stats);
  articles.push(...priceNews);
  
  // 3. 玩家新闻
  const playerNews = generatePlayerNews(stats);
  articles.push(...playerNews);
  
  // 4. 公司新闻
  const companyNews = generateCompanyNews(stats);
  articles.push(...companyNews);
  
  // 5. 灾难新闻
  if (stats.disasters.length > 0) {
    const disasterNews = generateDisasterNews(stats);
    articles.push(...disasterNews);
  }
  
  // 6. 经济周期新闻
  const cycleNews = generateCycleNews(stats);
  if (cycleNews) {
    articles.push(cycleNews);
  }
  
  // 7. 趣闻（随机1-2条）
  articles.push(generateTrivia());
  if (Math.random() > 0.5) {
    articles.push(generateTrivia());
  }
  
  // 8. 生成总结
  const summary = generateSummary(stats, month);
  
  return { headline, articles, summary };
}