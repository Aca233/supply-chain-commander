/**
 * 操作执行器
 * 将 LLM 的 function call 映射到游戏 Store 操作
 *
 * v4.0更新：recipeId改为outputModeId
 */

import { useGameStore } from '@/stores/gameStore';
import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';
import { findGoodsIdByName, findBuildingTypeByName } from './FunctionDefinitions';
import { getStock } from '@/core/finance/StockMarket';

/**
 * 操作结果
 */
export interface ActionResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * 执行操作
 */
export function executeAction(
  functionName: string, 
  args: Record<string, unknown>
): ActionResult {
  const store = useGameStore.getState();
  
  switch (functionName) {
    // 建筑操作
    case 'build_building':
      return executeBuildBuilding(store, args);
    case 'upgrade_building':
      return executeUpgradeBuilding(store, args);
    case 'demolish_building':
      return executeDemolishBuilding(store, args);
    
    // 商品交易
    case 'place_buy_order':
      return executePlaceBuyOrder(store, args);
    case 'place_sell_order':
      return executePlaceSellOrder(store, args);
    case 'cancel_order':
      return executeCancelOrder(store, args);
    
    // 贷款操作
    case 'apply_loan':
      return executeApplyLoan(store, args);
    case 'repay_loan':
      return executeRepayLoan(store, args);
    case 'query_loans':
      return queryLoans(store);
    case 'query_loan_options':
      return queryLoanOptions(store);
    case 'query_credit':
      return queryCredit(store);
    
    // 股票操作
    case 'buy_stock':
      return executeBuyStock(store, args);
    case 'sell_stock':
      return executeSellStock(store, args);
    case 'query_stock_market':
      return queryStockMarket(store);
    case 'query_stock':
      return queryStock(store, args);
    case 'query_holdings':
      return queryHoldings(store);
    case 'query_portfolio':
      return queryPortfolio(store);
    case 'initiate_ipo':
      return executeIPO(store, args);
    
    // 收购操作
    case 'query_company_valuation':
      return queryCompanyValuation(store, args);
    case 'analyze_acquisition':
      return analyzeAcquisition(store, args);
    case 'initiate_acquisition':
      return executeAcquisition(store, args);
    case 'query_companies':
      return queryCompanies(store);
    
    // 基础查询
    case 'query_player_status':
      return queryPlayerStatus(store);
    case 'query_inventory':
      return queryInventory(store, args);
    case 'query_market_price':
      return queryMarketPrice(store, args);
    case 'query_hot_prices':
      return queryHotPrices(store);
    case 'query_buildings':
      return queryBuildings(store);
    case 'query_available_buildings':
      return queryAvailableBuildings(args);
    
    default:
      return { success: false, message: `未知操作: ${functionName}` };
  }
}

// ==================== 建筑操作 ====================

function executeBuildBuilding(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const buildingType = args.buildingType as string;
  
  const typeId = findBuildingTypeByName(buildingType);
  if (typeId === null) {
    return { 
      success: false, 
      message: `找不到建筑类型: ${buildingType}。请使用"查询可建造建筑"查看可用类型。` 
    };
  }
  
  const buildingDef = ALL_BUILDINGS.find(b => b.id === typeId);
  if (!buildingDef) {
    return { success: false, message: '建筑定义不存在' };
  }
  
  // v4.0: 获取默认产品模式ID（使用第一个可用模式）
  const outputModeId = buildingDef.production?.outputModes?.[0]?.modeId || 0;
  
  // 执行建造
  const result = store.buildBuilding(typeId, outputModeId);
  
  if (result !== null) {
    return { 
      success: true, 
      message: `已开始建造 ${buildingDef.name}，建造费用 ¥${buildingDef.buildCost.toLocaleString()}` 
    };
  } else {
    return { 
      success: false, 
      message: `建造 ${buildingDef.name} 失败，可能资金不足或达到建筑上限` 
    };
  }
}

function executeUpgradeBuilding(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const buildingName = args.buildingName as string;
  
  if (!buildingName) {
    return { success: false, message: '请指定建筑名称' };
  }
  
  const buildings = store.getPlayerBuildings();
  const target = buildings.find((b) =>
    (b.name && b.name.includes(buildingName)) || String(b.id) === String(buildingName)
  );
  
  if (!target) {
    return { success: false, message: `找不到建筑: ${buildingName}` };
  }
  
  const success = store.upgradeBuilding(target.id);
  
  if (success) {
    return { success: true, message: `${target.name} 已加入升级队列` };
  } else {
    return { success: false, message: `升级 ${target.name} 失败，可能资金不足或已达最高等级` };
  }
}

function executeDemolishBuilding(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const buildingName = args.buildingName as string;
  
  if (!buildingName) {
    return { success: false, message: '请指定建筑名称' };
  }
  
  const buildings = store.getPlayerBuildings();
  const target = buildings.find((b) =>
    (b.name && b.name.includes(buildingName)) || String(b.id) === String(buildingName)
  );
  
  if (!target) {
    return { success: false, message: `找不到建筑: ${buildingName}` };
  }
  
  const success = store.demolishBuilding(target.id);
  
  if (success) {
    return { success: true, message: `${target.name} 已加入拆除队列` };
  } else {
    return { success: false, message: `拆除 ${target.name} 失败` };
  }
}

// ==================== 商品交易 ====================

function executePlaceBuyOrder(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const goodsName = args.goodsName as string;
  const quantity = args.quantity as number;
  const price = args.price as number | undefined;
  
  const goodsId = findGoodsIdByName(goodsName);
  if (goodsId === null) {
    return { success: false, message: `找不到商品: ${goodsName}` };
  }
  
  const world = store.getWorld();
  const marketPrice = world?.goods.prices[goodsId] || 100;
  const orderPrice = price || marketPrice * 1.05; // 默认溢价5%
  
  const success = store.placeBuyOrder(goodsId, quantity, orderPrice);
  
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (success) {
    return { 
      success: true, 
      message: `已挂买单: ${quantity}单位 ${goods?.name} @ ¥${orderPrice.toFixed(2)}` 
    };
  } else {
    return { success: false, message: '买单提交失败，可能资金不足' };
  }
}

function executePlaceSellOrder(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const goodsName = args.goodsName as string;
  const quantity = args.quantity as number;
  const price = args.price as number | undefined;
  
  const goodsId = findGoodsIdByName(goodsName);
  if (goodsId === null) {
    return { success: false, message: `找不到商品: ${goodsName}` };
  }
  
  const world = store.getWorld();
  const marketPrice = world?.goods.prices[goodsId] || 100;
  const orderPrice = price || marketPrice * 0.95; // 默认折价5%
  
  const success = store.placeSellOrder(goodsId, quantity, orderPrice);
  
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  if (success) {
    return { 
      success: true, 
      message: `已挂卖单: ${quantity}单位 ${goods?.name} @ ¥${orderPrice.toFixed(2)}` 
    };
  } else {
    return { success: false, message: '卖单提交失败，可能库存不足' };
  }
}

function executeCancelOrder(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const orderId = args.orderId as number;
  
  const success = store.cancelPlayerOrder(orderId);
  
  if (success) {
    return { success: true, message: `订单 #${orderId} 已取消` };
  } else {
    return { success: false, message: '取消订单失败' };
  }
}

// ==================== 贷款操作 ====================

function executeApplyLoan(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const amount = args.amount as number;
  const loanType = args.loanType as 'short_term' | 'medium_term' | 'long_term' | 'credit_line';
  const collateralType = (args.collateralType as 'inventory' | 'building' | 'none') || 'none';
  
  const result = store.applyLoan(amount, loanType, collateralType);
  
  if (result.approved) {
    return {
      success: true,
      message: `贷款申请成功！获得 ¥${amount.toLocaleString()}`,
      data: result,
    };
  } else {
    return {
      success: false,
      message: `贷款申请失败：${result.reason || '未知原因'}`,
    };
  }
}

function executeRepayLoan(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const loanId = args.loanId as number;
  
  const result = store.prepayPlayerLoan(loanId);
  
  if (result.success) {
    return {
      success: true,
      message: `贷款 #${loanId} 已提前还清${result.penalty ? `，罚金 ¥${result.penalty.toFixed(0)}` : ''}`,
    };
  } else {
    return {
      success: false,
      message: `还款失败：${result.reason || '未知原因'}`,
    };
  }
}

function queryLoans(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const loans = store.getPlayerLoans();
  
  if (loans.length === 0) {
    return { success: true, message: '📋 你目前没有任何贷款' };
  }
  
  // 计算剩余天数
  const world = store.getWorld();
  const currentTick = world?.tick || 0;
  
  const list = loans.map((loan) => {
    const remainingTicks = loan.maturityTick - currentTick;
    const remainingDays = Math.max(0, Math.floor(remainingTicks / 24));
    return `• #${loan.id} ${loan.type}: ¥${loan.remainingPrincipal.toLocaleString()} (利率${(loan.interestRate * 100).toFixed(1)}%, 剩余${remainingDays}天)`;
  }).join('\n');
  
  return {
    success: true,
    message: `💳 当前贷款 (${loans.length} 笔):\n${list}`,
    data: loans,
  };
}

function queryLoanOptions(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const options = store.getPlayerLoanOptions();
  
  if (options.length === 0) {
    return { success: true, message: '暂无可用贷款选项' };
  }
  
  const list = options.map((opt) => 
    `• ${opt.name}: 最高 ¥${opt.maxAmount.toLocaleString()} (利率${(opt.interestRate * 100).toFixed(1)}%, 期限${opt.termDays}天)`
  ).join('\n');
  
  return {
    success: true,
    message: `🏦 可用贷款选项:\n${list}`,
    data: options,
  };
}

function queryCredit(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const credit = store.getPlayerCreditProfile();
  
  if (!credit) {
    return { success: false, message: '无法获取信用档案' };
  }
  
  // 计算还款率
  const paymentRate = credit.totalLoansHistory > 0
    ? credit.totalRepaidOnTime / credit.totalLoansHistory
    : 1;
  
  return {
    success: true,
    message: `📊 信用档案:
💯 信用评分: ${credit.score} (${credit.rating})
📈 最高额度: ¥${credit.maxCreditLine.toLocaleString()}
📉 当前负债: ¥${credit.totalDebt.toLocaleString()}
✅ 按时还款率: ${(paymentRate * 100).toFixed(0)}%`,
    data: credit,
  };
}

// ==================== 股票操作 ====================

function executeBuyStock(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const companyName = args.companyName as string;
  const quantity = args.quantity as number;
  const orderType = (args.orderType as 'market' | 'limit') || 'market';
  const limitPrice = args.limitPrice as number | undefined;
  
  if (!companyName) {
    return { success: false, message: '请指定公司名称' };
  }
  
  const profiles = store.getAllCompanyProfiles();
  const company = profiles.find((p) => {
    const stock = getStock(p.id);
    return (p.name && p.name.includes(companyName)) ||
      (stock?.ticker?.toLowerCase() === companyName.toLowerCase());
  });
  
  if (!company) {
    return { success: false, message: `找不到公司: ${companyName}` };
  }
  
  const stock = getStock(company.id);
  const success = store.buyStockOrder(company.id, quantity, orderType, limitPrice);
  
  if (success) {
    return {
      success: true,
      message: `成功买入 ${company.name} ${stock?.ticker ? `(${stock.ticker})` : ''} ${quantity} 股`,
    };
  } else {
    return {
      success: false,
      message: '买入失败：资金不足或股票不可交易',
    };
  }
}

function executeSellStock(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const companyName = args.companyName as string;
  const quantity = args.quantity as number;
  const orderType = (args.orderType as 'market' | 'limit') || 'market';
  const limitPrice = args.limitPrice as number | undefined;
  
  if (!companyName) {
    return { success: false, message: '请指定公司名称' };
  }
  
  const profiles = store.getAllCompanyProfiles();
  const company = profiles.find((p) => {
    const stock = getStock(p.id);
    return (p.name && p.name.includes(companyName)) ||
      (stock?.ticker?.toLowerCase() === companyName.toLowerCase());
  });
  
  if (!company) {
    return { success: false, message: `找不到公司: ${companyName}` };
  }
  
  const stock = getStock(company.id);
  const success = store.sellStockOrder(company.id, quantity, orderType, limitPrice);
  
  if (success) {
    return {
      success: true,
      message: `成功卖出 ${company.name} ${stock?.ticker ? `(${stock.ticker})` : ''} ${quantity} 股`,
    };
  } else {
    return {
      success: false,
      message: '卖出失败：持股不足或股票不可交易',
    };
  }
}

function queryStockMarket(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const marketState = store.getStockMarketState();
  const stats = store.getCompanyMarketStats();
  
  if (!marketState) {
    return { success: false, message: '无法获取股票市场状态' };
  }
  
  return {
    success: true,
    message: `📈 股票市场概况:
🟢 上涨: ${stats.rising} 家
🔴 下跌: ${stats.falling} 家
⚪ 持平: ${stats.unchanged} 家
📊 总成交量: ${stats.totalVolume.toLocaleString()}
💰 总市值: ¥${(stats.totalMarketCap / 1000000).toFixed(2)}M`,
    data: { marketState, stats },
  };
}

function queryStock(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const companyName = args.companyName as string;
  
  if (!companyName) {
    return { success: false, message: '请指定公司名称' };
  }
  
  const profiles = store.getAllCompanyProfiles();
  const company = profiles.find((p) => {
    const stock = getStock(p.id);
    return (p.name && p.name.includes(companyName)) ||
      (stock?.ticker?.toLowerCase() === companyName.toLowerCase());
  });
  
  if (!company) {
    return { success: false, message: `找不到公司: ${companyName}` };
  }
  
  const stock = store.getStockInfo(company.id);
  
  if (!stock) {
    return { success: true, message: `${company.name} 尚未上市` };
  }
  
  // 计算涨跌幅
  const priceChange = stock.currentPrice - stock.previousClose;
  const priceChangePercent = stock.previousClose > 0
    ? (priceChange / stock.previousClose) * 100
    : 0;
  const changeIcon = priceChange >= 0 ? '📈' : '📉';
  
  return {
    success: true,
    message: `${changeIcon} ${company.name} (${stock.ticker})
💵 当前价格: ¥${stock.currentPrice.toFixed(2)}
📊 涨跌幅: ${priceChangePercent >= 0 ? '+' : ''}${priceChangePercent.toFixed(2)}%
📦 成交量: ${stock.volume.toLocaleString()}
💰 市值: ¥${(stock.marketCap / 1000000).toFixed(2)}M`,
    data: { company, stock },
  };
}

function queryHoldings(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const holdings = store.getPlayerHoldings();
  
  if (holdings.length === 0) {
    return { success: true, message: '📊 你目前没有持有任何股票' };
  }
  
  const list = holdings.map((h) => {
    const stock = store.getStockInfo(h.stockCompanyId);
    const value = h.shares * (stock?.currentPrice || 0);
    const gainIcon = value >= h.avgCost * h.shares ? '🟢' : '🔴';
    return `${gainIcon} ${stock?.ticker || `公司${h.stockCompanyId}`}: ${h.shares}股 (价值 ¥${value.toLocaleString()})`;
  }).join('\n');
  
  return {
    success: true,
    message: `📊 股票持仓:\n${list}`,
    data: holdings,
  };
}

function queryPortfolio(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const portfolio = store.getPlayerPortfolio();
  
  const gainIcon = portfolio.totalGain >= 0 ? '📈' : '📉';
  
  return {
    success: true,
    message: `${gainIcon} 投资组合概况:
💰 持仓总值: ¥${portfolio.totalValue.toLocaleString()}
💵 投入成本: ¥${portfolio.totalCost.toLocaleString()}
${portfolio.totalGain >= 0 ? '🟢' : '🔴'} 总收益: ¥${portfolio.totalGain.toLocaleString()} (${portfolio.gainPercent >= 0 ? '+' : ''}${(portfolio.gainPercent * 100).toFixed(1)}%)
📊 持股数量: ${portfolio.holdingCount} 家公司`,
    data: portfolio,
  };
}

function executeIPO(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const shares = args.shares as number;
  const price = args.price as number;
  
  const result = store.playerIPO(shares, price);
  
  if (result.success) {
    return {
      success: true,
      message: result.message,
    };
  } else {
    return {
      success: false,
      message: result.message,
    };
  }
}

// ==================== 收购操作 ====================

function queryCompanyValuation(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const companyName = args.companyName as string;
  
  if (!companyName) {
    return { success: false, message: '请指定公司名称' };
  }
  
  const profiles = store.getAllCompanyProfiles();
  const company = profiles.find((p) => p.name && p.name.includes(companyName));
  
  if (!company) {
    return { success: false, message: `找不到公司: ${companyName}` };
  }
  
  const valuation = store.getCompanyValuation(company.id);
  
  if (!valuation) {
    return { success: false, message: '无法获取公司估值' };
  }
  
  return {
    success: true,
    message: `💰 ${company.name} 估值:
📚 账面价值: ¥${valuation.bookValue.toLocaleString()}
📈 市场价值: ¥${valuation.marketValue.toLocaleString()}
🏢 企业价值: ¥${valuation.enterpriseValue.toLocaleString()}
⚖️ 公允价值: ¥${valuation.fairValue.toLocaleString()}`,
    data: valuation,
  };
}

function analyzeAcquisition(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const targetCompany = args.targetCompany as string;
  
  if (!targetCompany) {
    return { success: false, message: '请指定目标公司名称' };
  }
  
  const profiles = store.getAllCompanyProfiles();
  const company = profiles.find((p) => p.name && p.name.includes(targetCompany));
  
  if (!company) {
    return { success: false, message: `找不到公司: ${targetCompany}` };
  }
  
  const analysis = store.analyzeAcquisition(company.id);
  
  if (!analysis) {
    return { success: false, message: '无法分析收购可行性' };
  }
  
  const riskLabels: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
  };
  
  return {
    success: true,
    message: `🔍 收购分析: ${company.name}
✅ 可行性: ${analysis.feasible ? '可行' : '不可行'}
💰 预计成本: ¥${analysis.estimatedCost?.toLocaleString() || 'N/A'}
⚠️ 风险等级: ${riskLabels[analysis.riskLevel] || analysis.riskLevel}
📝 原因: ${analysis.reason || '无'}`,
    data: analysis,
  };
}

function executeAcquisition(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const targetCompany = args.targetCompany as string;
  const targetPercent = args.targetPercent as number;
  const offerPrice = args.offerPrice as number;
  
  if (!targetCompany) {
    return { success: false, message: '请指定目标公司名称' };
  }
  
  const profiles = store.getAllCompanyProfiles();
  const company = profiles.find((p) => p.name && p.name.includes(targetCompany));
  
  if (!company) {
    return { success: false, message: `找不到公司: ${targetCompany}` };
  }
  
  const success = store.initiateAcquisitionOffer(company.id, targetPercent, offerPrice);
  
  if (success) {
    return {
      success: true,
      message: `收购要约已发起！目标: ${company.name} ${(targetPercent * 100).toFixed(0)}% 股权`,
    };
  } else {
    return {
      success: false,
      message: '发起收购失败',
    };
  }
}

function queryCompanies(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const profiles = store.getAICompanyProfiles();
  
  if (profiles.length === 0) {
    return { success: true, message: '暂无其他公司信息' };
  }
  
  const list = profiles.slice(0, 15).map((p) => {
    const stock = store.getStockInfo(p.id);
    return `• ${p.name}${stock?.ticker ? ` (${stock.ticker})` : ''}: ¥${(p.cash / 1000000).toFixed(1)}M ${stock ? '📈上市' : '🔒未上市'}`;
  }).join('\n');
  
  return {
    success: true,
    message: `🏢 公司列表 (共${profiles.length}家):\n${list}${profiles.length > 15 ? '\n...(更多)' : ''}`,
    data: profiles,
  };
}

// ==================== 基础查询 ====================

function queryPlayerStatus(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const world = store.getWorld();
  if (!world) {
    return { success: false, message: '游戏未初始化' };
  }
  
  const data = {
    cash: store.playerCash,
    assets: store.playerAssets,
    buildingCount: store.playerBuildings,
    gameDate: store.gameDate,
  };
  
  return {
    success: true,
    message: `💰 现金: ¥${data.cash.toLocaleString()}
📊 资产: ¥${data.assets.toLocaleString()}
🏭 建筑: ${data.buildingCount} 座
📅 时间: ${data.gameDate}`,
    data,
  };
}

function queryInventory(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const goodsName = args.goodsName as string | undefined;
  const inventory = store.getPlayerInventory();
  
  if (goodsName) {
    const item = inventory.find((i) => i.name && i.name.includes(goodsName));
    if (item) {
      return {
        success: true,
        message: `📦 ${item.name}: ${item.quantity.toFixed(0)} 单位 (价值 ¥${item.value.toLocaleString()})`,
        data: item,
      };
    } else {
      return { success: true, message: `库存中没有 ${goodsName}` };
    }
  }
  
  if (inventory.length === 0) {
    return { success: true, message: '库存为空' };
  }
  
  const list = inventory.slice(0, 10).map((i) => 
    `• ${i.name}: ${i.quantity.toFixed(0)} (¥${i.value.toLocaleString()})`
  ).join('\n');
  
  return {
    success: true,
    message: `📦 库存列表（前10项）:\n${list}`,
    data: inventory,
  };
}

function queryMarketPrice(store: ReturnType<typeof useGameStore.getState>, args: Record<string, unknown>): ActionResult {
  const goodsName = args.goodsName as string;
  
  const goodsId = findGoodsIdByName(goodsName);
  if (goodsId === null) {
    return { success: false, message: `找不到商品: ${goodsName}` };
  }
  
  const world = store.getWorld();
  const price = world?.goods.prices[goodsId] || 0;
  const stats = store.getMarketStats(goodsId);
  const trend = store.getPriceTrend(goodsId);
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  
  const trendIcon = trend?.direction === 'up' ? '📈' :
                    trend?.direction === 'down' ? '📉' : '➡️';
  
  return {
    success: true,
    message: `${trendIcon} ${goods?.name}
💵 当前价格: ¥${price.toFixed(2)}
📊 24h成交量: ${stats?.volume24h?.toFixed(0) || 0}
📈 趋势: ${trend?.direction === 'up' ? '上涨' : trend?.direction === 'down' ? '下跌' : '平稳'} (${((trend?.changePercent || 0) * 100).toFixed(1)}%)`,
    data: { price, stats, trend },
  };
}

function queryHotPrices(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const world = store.getWorld();
  if (!world) {
    return { success: false, message: '游戏未初始化' };
  }
  
  // 获取热门商品列表（基础原料+常见产品）
  const hotGoodsNames = ['铁矿石', '煤炭', '钢材', '电子元件', '木材', '粮食', '石油', '塑料', '铜', '铝'];
  
  const priceList = hotGoodsNames.map(name => {
    const goodsId = findGoodsIdByName(name);
    if (goodsId === null) return null;
    
    const goods = ALL_GOODS.find(g => g.id === goodsId);
    const currentPrice = world.goods.prices[goodsId] || 0;
    const basePrice = world.goods.baseValues[goodsId] || currentPrice;
    
    // 计算相对于基准价格的偏离（更稳定的指标）
    const deviationFromBase = basePrice > 0
      ? ((currentPrice - basePrice) / basePrice) * 100
      : 0;
    
    // 限制范围在 -90% 到 +500%
    const limitedDeviation = Math.max(-90, Math.min(500, deviationFromBase));
    
    // 确定趋势方向
    let trendIcon = '➡️';
    if (limitedDeviation > 5) trendIcon = '📈';
    else if (limitedDeviation < -5) trendIcon = '📉';
    
    const changeStr = `(${limitedDeviation >= 0 ? '+' : ''}${limitedDeviation.toFixed(1)}%)`;
    
    return `${trendIcon} ${goods?.name}: ¥${currentPrice.toFixed(2)} ${changeStr}`;
  }).filter(Boolean);
  
  return {
    success: true,
    message: `📊 **热门商品行情**\n\n${priceList.join('\n')}`,
  };
}

function queryBuildings(store: ReturnType<typeof useGameStore.getState>): ActionResult {
  const buildings = store.getPlayerBuildings();
  
  if (buildings.length === 0) {
    return { success: true, message: '你还没有建造任何建筑' };
  }
  
  const list = buildings.map((b) => 
    `• ${b.name} (Lv.${b.level}) - ${b.isRetail ? '零售' : (b.status ? '运行中' : '停止')}`
  ).join('\n');
  
  return {
    success: true,
    message: `🏭 你的建筑 (${buildings.length} 座):\n${list}`,
    data: buildings,
  };
}

function queryAvailableBuildings(args: Record<string, unknown>): ActionResult {
  const category = args.category as string | undefined;
  
  let buildings = ALL_BUILDINGS;
  if (category) {
    buildings = buildings.filter(b => b.category === category);
  }
  
  const categories = [...new Set(buildings.map(b => b.category))];
  const grouped = categories.map(cat => {
    const items = buildings.filter(b => b.category === cat);
    return `【${cat}】\n${items.map(b => `  • ${b.name} (¥${b.buildCost.toLocaleString()})`).join('\n')}`;
  });
  
  return {
    success: true,
    message: `🏗️ 可建造的建筑:\n${grouped.join('\n\n')}`,
    data: buildings,
  };
}
