/**
 * LLM新闻生成器
 * 使用LLM生成趣味性新闻报道
 */

import { MonthlyStats, NewsArticle, NewsCategory, NewsImportance } from './types';
import { loadLLMConfig, isLLMConfigured } from '@/core/llm/LLMConfig';

/**
 * 构建新闻生成的系统提示词
 */
function buildNewsPrompt(): string {
  return `你是一位风趣幽默的游戏世界财经记者，为供应链模拟游戏撰写月度新闻报道。

## 你的风格
- 语言轻松幽默，偶尔使用网络流行语和表情符号
- 把枯燥的财经数据用生动的比喻表达
- 喜欢用夸张的标题吸引眼球
- 偶尔开玩笑调侃AI公司的决策
- 对玩家的成就会特别赞美，对失败会幽默安慰
- 可以虚构一些趣味八卦，增加可读性

## 新闻格式要求
返回纯JSON格式（不要markdown代码块包裹）：
{
  "headline": {
    "title": "头条标题（震撼、吸引眼球，50字内）",
    "content": "头条内容（150-200字，详细描述经济形势）",
    "emoji": "一个最相关的表情符号"
  },
  "articles": [
    {
      "category": "economy|market|company|player|disaster|entertainment",
      "importance": "major|minor|trivia",
      "title": "新闻标题（30字内）",
      "content": "新闻内容（50-100字）",
      "emoji": "一个相关表情符号"
    }
  ],
  "summary": "月度总结（一句话，幽默风格，50字内）"
}

## 类别说明
- economy: 经济指标相关（GDP、通胀、失业率等）
- market: 市场价格变化
- company: AI公司动态
- player: 玩家相关成就或事件
- disaster: 灾难事件
- entertainment: 趣闻八卦（可虚构）

## 注意事项
1. 头条必须是本月最重要/最有趣的事件
2. 生成5-8条分类新闻
3. 必须包含至少一条关于玩家的新闻
4. 如果有灾难数据，必须报道灾难
5. 加入1-2条趣味新闻（可以虚构游戏世界的八卦）
6. 使用中文，风格活泼有趣
7. 直接返回JSON，不要用代码块包裹`;
}

/**
 * 构建月度数据上下文
 */
function buildDataContext(stats: MonthlyStats, year: number, month: number): string {
  const lines: string[] = [];
  
  lines.push(`## 第${year}年 ${month}月 月度数据`);
  lines.push('');
  
  // 经济指标
  lines.push(`### 经济指标`);
  lines.push(`- GDP: ¥${(stats.economy.gdp / 1e9).toFixed(2)}B (${stats.economy.gdpChange >= 0 ? '+' : ''}${stats.economy.gdpChange.toFixed(1)}%)`);
  lines.push(`- 通胀率: ${(stats.economy.inflation * 100).toFixed(1)}%`);
  lines.push(`- 失业率: ${(stats.economy.unemployment * 100).toFixed(1)}%`);
  lines.push(`- 经济周期: ${getPhaseText(stats.economy.cyclePhase)}`);
  lines.push('');
  
  // 价格变化
  if (stats.priceChanges.length > 0) {
    lines.push(`### 价格变化排行`);
    stats.priceChanges.slice(0, 5).forEach((p, i) => {
      const arrow = p.changePercent >= 0 ? '📈' : '📉';
      lines.push(`${i + 1}. ${arrow} ${p.goodsName}: ${p.changePercent >= 0 ? '+' : ''}${p.changePercent.toFixed(1)}% (¥${p.startPrice.toFixed(0)} → ¥${p.endPrice.toFixed(0)})`);
    });
    lines.push('');
  }
  
  // 公司排行
  if (stats.companyRankings.richest.length > 0) {
    lines.push(`### 最富有公司Top3`);
    stats.companyRankings.richest.slice(0, 3).forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}: ¥${(c.cash / 1e6).toFixed(1)}M`);
    });
    lines.push('');
  }
  
  // 增长最快
  if (stats.companyRankings.mostGrowth.length > 0) {
    lines.push(`### 增长最快公司Top3`);
    stats.companyRankings.mostGrowth.slice(0, 3).forEach((c, i) => {
      lines.push(`${i + 1}. ${c.name}: +${c.growthPercent.toFixed(1)}%`);
    });
    lines.push('');
  }
  
  // 破产公司
  if (stats.companyRankings.bankrupt.length > 0) {
    lines.push(`### 本月破产公司`);
    stats.companyRankings.bankrupt.forEach(c => {
      lines.push(`- ${c.name} 😢`);
    });
    lines.push('');
  }
  
  // 玩家数据
  lines.push(`### 玩家本月表现`);
  const cashChangeText = stats.playerStats.cashChange >= 0 ? '盈利' : '亏损';
  lines.push(`- 资金变化: ${cashChangeText} ¥${Math.abs(stats.playerStats.cashChange / 1e6).toFixed(2)}M (${stats.playerStats.cashChangePercent >= 0 ? '+' : ''}${stats.playerStats.cashChangePercent.toFixed(1)}%)`);
  lines.push(`- 新建建筑: ${stats.playerStats.buildingsBuilt} 座`);
  lines.push(`- 拆除建筑: ${stats.playerStats.buildingsDemolished} 座`);
  lines.push(`- 完成交易: ${stats.playerStats.tradesCompleted} 笔，总额 ¥${(stats.playerStats.totalTradeValue / 1e6).toFixed(2)}M`);
  if (stats.playerStats.largestTrade) {
    lines.push(`- 最大单笔交易: ${stats.playerStats.largestTrade.goodsName} ¥${(stats.playerStats.largestTrade.value / 1e6).toFixed(2)}M`);
  }
  lines.push('');
  
  // 灾难
  if (stats.disasters.length > 0) {
    lines.push(`### 本月灾难事件`);
    stats.disasters.forEach(d => {
      lines.push(`- ${d.type}（${d.severity}级）: ${d.impact}`);
    });
    lines.push('');
  }
  
  // 重大事件
  if (stats.majorEvents.length > 0) {
    lines.push(`### 其他重大事件`);
    stats.majorEvents.forEach(e => {
      lines.push(`- ${e.description}`);
    });
  }
  
  return lines.join('\n');
}

/**
 * 获取周期阶段文本
 */
function getPhaseText(phase: string): string {
  const map: Record<string, string> = {
    expansion: '扩张期',
    peak: '顶峰期',
    contraction: '收缩期',
    trough: '低谷期',
  };
  return map[phase] || phase;
}

/**
 * 解析LLM响应
 */
function parseNewsResponse(content: string): {
  headline: NewsArticle;
  articles: NewsArticle[];
  summary: string;
} | null {
  try {
    // 尝试直接解析
    let parsed: any;
    
    // 移除可能的markdown代码块
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // 尝试提取JSON
    const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[LLMNewsGen] Failed to extract JSON from response');
      return null;
    }
    
    parsed = JSON.parse(jsonMatch[0]);
    
    // 验证必要字段
    if (!parsed.headline || !parsed.articles || !parsed.summary) {
      console.error('[LLMNewsGen] Missing required fields in response');
      return null;
    }
    
    // 转换为标准格式
    const headline: NewsArticle = {
      id: `headline_llm`,
      category: 'economy',
      importance: 'headline',
      title: parsed.headline.title || '本月要闻',
      content: parsed.headline.content || '',
      emoji: parsed.headline.emoji || '📰',
    };
    
    const articles: NewsArticle[] = (parsed.articles || []).map((a: any, i: number) => ({
      id: `article_llm_${i}`,
      category: validateCategory(a.category) || 'economy',
      importance: validateImportance(a.importance) || 'minor',
      title: a.title || '新闻',
      content: a.content || '',
      emoji: a.emoji || '📝',
    }));
    
    return {
      headline,
      articles,
      summary: parsed.summary || '本月平稳度过。',
    };
  } catch (error) {
    console.error('[LLMNewsGen] Failed to parse response:', error);
    return null;
  }
}

/**
 * 验证类别
 */
function validateCategory(category: string): NewsCategory | null {
  const valid: NewsCategory[] = ['economy', 'market', 'company', 'player', 'disaster', 'technology', 'policy', 'entertainment'];
  return valid.includes(category as NewsCategory) ? (category as NewsCategory) : null;
}

/**
 * 验证重要性
 */
function validateImportance(importance: string): NewsImportance | null {
  const valid: NewsImportance[] = ['headline', 'major', 'minor', 'trivia'];
  return valid.includes(importance as NewsImportance) ? (importance as NewsImportance) : null;
}

/**
 * 使用LLM生成新闻
 */
export async function generateNewsWithLLM(
  stats: MonthlyStats,
  year: number,
  month: number
): Promise<{
  headline: NewsArticle;
  articles: NewsArticle[];
  summary: string;
} | null> {
  if (!isLLMConfigured()) {
    console.log('[LLMNewsGen] LLM not configured');
    return null;
  }
  
  const config = loadLLMConfig();
  const systemPrompt = buildNewsPrompt();
  const dataContext = buildDataContext(stats, year, month);
  
  console.log('[LLMNewsGen] Generating news with LLM...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时
    
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `请根据以下月度数据生成新闻报道：\n\n${dataContext}` },
        ],
        max_tokens: 2000,
        temperature: 0.8,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLMNewsGen] LLM request failed:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('[LLMNewsGen] Empty response from LLM');
      return null;
    }
    
    console.log('[LLMNewsGen] Received response, parsing...');
    
    // 解析响应
    const parsed = parseNewsResponse(content);
    
    if (parsed) {
      console.log('[LLMNewsGen] Successfully generated news with', parsed.articles.length, 'articles');
    }
    
    return parsed;
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('[LLMNewsGen] Request timeout');
    } else {
      console.error('[LLMNewsGen] LLM generation error:', error);
    }
    return null;
  }
}