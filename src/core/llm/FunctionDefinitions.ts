/**
 * LLM 可调用的游戏函数定义
 * 使用 OpenAI Function Calling 格式
 */

import { ALL_GOODS } from '@/data/goods';
import { ALL_BUILDINGS } from '@/data/buildings';

/**
 * 游戏函数定义列表
 */
export const GAME_FUNCTIONS = [
  // ==================== 建筑操作 ====================
  {
    name: 'build_building',
    description: '建造一个新建筑。需要指定建筑类型和配方。',
    parameters: {
      type: 'object',
      properties: {
        buildingType: {
          type: 'string',
          description: '建筑类型名称，如：铁矿场、炼钢厂、电子厂等',
        },
        recipe: {
          type: 'string',
          description: '生产配方名称（可选，默认使用第一个可用配方）',
        },
      },
      required: ['buildingType'],
    },
  },
  {
    name: 'upgrade_building',
    description: '升级指定建筑到下一级',
    parameters: {
      type: 'object',
      properties: {
        buildingName: {
          type: 'string',
          description: '建筑名称或ID',
        },
      },
      required: ['buildingName'],
    },
  },
  {
    name: 'demolish_building',
    description: '拆除指定建筑',
    parameters: {
      type: 'object',
      properties: {
        buildingName: {
          type: 'string',
          description: '建筑名称或ID',
        },
      },
      required: ['buildingName'],
    },
  },
  
  // ==================== 商品交易 ====================
  {
    name: 'place_buy_order',
    description: '在市场上挂买单购买商品',
    parameters: {
      type: 'object',
      properties: {
        goodsName: {
          type: 'string',
          description: '商品名称，如：铁矿石、钢材、电子元件等',
        },
        quantity: {
          type: 'number',
          description: '购买数量',
        },
        price: {
          type: 'number',
          description: '单价（可选，默认使用市场价）',
        },
      },
      required: ['goodsName', 'quantity'],
    },
  },
  {
    name: 'place_sell_order',
    description: '在市场上挂卖单出售商品',
    parameters: {
      type: 'object',
      properties: {
        goodsName: {
          type: 'string',
          description: '商品名称',
        },
        quantity: {
          type: 'number',
          description: '出售数量',
        },
        price: {
          type: 'number',
          description: '单价（可选，默认使用市场价）',
        },
      },
      required: ['goodsName', 'quantity'],
    },
  },
  {
    name: 'cancel_order',
    description: '取消指定的订单',
    parameters: {
      type: 'object',
      properties: {
        orderId: {
          type: 'number',
          description: '订单ID',
        },
      },
      required: ['orderId'],
    },
  },
  
  // ==================== 贷款操作 ====================
  {
    name: 'apply_loan',
    description: '向银行申请贷款',
    parameters: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          description: '贷款金额',
        },
        loanType: {
          type: 'string',
          enum: ['short_term', 'medium_term', 'long_term', 'credit_line'],
          description: '贷款类型：short_term(短期)、medium_term(中期)、long_term(长期)、credit_line(信用额度)',
        },
        collateralType: {
          type: 'string',
          enum: ['inventory', 'building', 'none'],
          description: '抵押类型（可选）：inventory(库存)、building(建筑)、none(无抵押)',
        },
      },
      required: ['amount', 'loanType'],
    },
  },
  {
    name: 'repay_loan',
    description: '提前偿还贷款',
    parameters: {
      type: 'object',
      properties: {
        loanId: {
          type: 'number',
          description: '贷款ID',
        },
      },
      required: ['loanId'],
    },
  },
  {
    name: 'query_loans',
    description: '查询玩家当前的贷款列表',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_loan_options',
    description: '查询可用的贷款选项和额度',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_credit',
    description: '查询玩家的信用档案和评分',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  
  // ==================== 股票操作 ====================
  {
    name: 'buy_stock',
    description: '买入股票',
    parameters: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: '公司名称或股票代码',
        },
        quantity: {
          type: 'number',
          description: '买入股数',
        },
        orderType: {
          type: 'string',
          enum: ['market', 'limit'],
          description: '订单类型：market(市价单)、limit(限价单)',
        },
        limitPrice: {
          type: 'number',
          description: '限价（仅限价单需要）',
        },
      },
      required: ['companyName', 'quantity'],
    },
  },
  {
    name: 'sell_stock',
    description: '卖出股票',
    parameters: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: '公司名称或股票代码',
        },
        quantity: {
          type: 'number',
          description: '卖出股数',
        },
        orderType: {
          type: 'string',
          enum: ['market', 'limit'],
          description: '订单类型：market(市价单)、limit(限价单)',
        },
        limitPrice: {
          type: 'number',
          description: '限价（仅限价单需要）',
        },
      },
      required: ['companyName', 'quantity'],
    },
  },
  {
    name: 'query_stock_market',
    description: '查询股票市场整体状态',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_stock',
    description: '查询指定公司的股票信息',
    parameters: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: '公司名称或股票代码',
        },
      },
      required: ['companyName'],
    },
  },
  {
    name: 'query_holdings',
    description: '查询玩家的股票持仓',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_portfolio',
    description: '查询玩家的投资组合收益情况',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'initiate_ipo',
    description: '发起公司IPO上市',
    parameters: {
      type: 'object',
      properties: {
        shares: {
          type: 'number',
          description: '发行股数',
        },
        price: {
          type: 'number',
          description: '发行价格',
        },
      },
      required: ['shares', 'price'],
    },
  },
  
  // ==================== 收购操作 ====================
  {
    name: 'query_company_valuation',
    description: '查询指定公司的估值',
    parameters: {
      type: 'object',
      properties: {
        companyName: {
          type: 'string',
          description: '公司名称',
        },
      },
      required: ['companyName'],
    },
  },
  {
    name: 'analyze_acquisition',
    description: '分析收购目标公司的可行性',
    parameters: {
      type: 'object',
      properties: {
        targetCompany: {
          type: 'string',
          description: '目标公司名称',
        },
      },
      required: ['targetCompany'],
    },
  },
  {
    name: 'initiate_acquisition',
    description: '发起收购要约',
    parameters: {
      type: 'object',
      properties: {
        targetCompany: {
          type: 'string',
          description: '目标公司名称',
        },
        targetPercent: {
          type: 'number',
          description: '目标持股比例（0-1之间，如0.51表示51%）',
        },
        offerPrice: {
          type: 'number',
          description: '每股要约价格',
        },
      },
      required: ['targetCompany', 'targetPercent', 'offerPrice'],
    },
  },
  
  // ==================== 基础查询 ====================
  {
    name: 'query_player_status',
    description: '查询玩家当前状态，包括现金、资产、建筑数量等',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_inventory',
    description: '查询玩家库存中的商品',
    parameters: {
      type: 'object',
      properties: {
        goodsName: {
          type: 'string',
          description: '商品名称（可选，不填则返回全部库存）',
        },
      },
    },
  },
  {
    name: 'query_market_price',
    description: '查询指定商品的市场价格和行情',
    parameters: {
      type: 'object',
      properties: {
        goodsName: {
          type: 'string',
          description: '商品名称',
        },
      },
      required: ['goodsName'],
    },
  },
  {
    name: 'query_buildings',
    description: '查询玩家拥有的建筑列表',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_available_buildings',
    description: '查询可以建造的建筑类型列表',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: '建筑分类（可选）：extraction, processing, manufacturing, service, agriculture, pharma, retail, luxury',
        },
      },
    },
  },
  {
    name: 'query_companies',
    description: '查询所有AI公司的信息',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'query_hot_prices',
    description: '查询多个热门商品的市场价格行情',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];

/**
 * 通过名称查找商品ID
 */
export function findGoodsIdByName(name: string | undefined | null): number | null {
  if (!name) return null;
  
  // 精确匹配
  const exactMatch = ALL_GOODS.find(g => g.name === name);
  if (exactMatch) return exactMatch.id;
  
  // 模糊匹配（包含）
  const fuzzyMatch = ALL_GOODS.find(g =>
    (g.name && g.name.includes(name)) ||
    (name && name.includes(g.name)) ||
    (g.key && g.key.toLowerCase().includes(name.toLowerCase()))
  );
  if (fuzzyMatch) return fuzzyMatch.id;
  
  return null;
}

/**
 * 通过名称查找建筑类型ID
 */
export function findBuildingTypeByName(name: string | undefined | null): number | null {
  if (!name) return null;
  
  // 精确匹配
  const exactMatch = ALL_BUILDINGS.find(b => b.name === name);
  if (exactMatch) return exactMatch.id;
  
  // 模糊匹配（包含）
  const fuzzyMatch = ALL_BUILDINGS.find(b =>
    (b.name && b.name.includes(name)) ||
    (name && name.includes(b.name)) ||
    (b.key && b.key.toLowerCase().includes(name.toLowerCase()))
  );
  if (fuzzyMatch) return fuzzyMatch.id;
  
  return null;
}

/**
 * 获取商品名称
 */
export function getGoodsName(goodsId: number): string {
  const goods = ALL_GOODS.find(g => g.id === goodsId);
  return goods?.name || `未知商品(${goodsId})`;
}

/**
 * 获取建筑名称
 */
export function getBuildingName(buildingTypeId: number): string {
  const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  return building?.name || `未知建筑(${buildingTypeId})`;
}