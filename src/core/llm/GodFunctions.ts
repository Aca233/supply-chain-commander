/**
 * 上帝模式函数定义
 * 用于 LLM 的 function calling
 */

/**
 * 神圣干预函数列表
 */
export const GOD_FUNCTIONS = [
  // ==================== 价格干预 ====================
  {
    name: 'set_price',
    description: '直接设定某个商品的价格。用于"让XX价格变成YY"',
    parameters: {
      type: 'object',
      properties: {
        goodsName: {
          type: 'string',
          description: '商品名称，如：钢材、石油、粮食、电子元件',
        },
        price: {
          type: 'number',
          description: '新的价格',
        },
      },
      required: ['goodsName', 'price'],
    },
  },
  {
    name: 'adjust_price',
    description: '按百分比调整某个商品的价格。用于"让XX涨价/跌价YY%"',
    parameters: {
      type: 'object',
      properties: {
        goodsName: {
          type: 'string',
          description: '商品名称',
        },
        percent: {
          type: 'number',
          description: '价格变化百分比。正数表示涨价，负数表示跌价。如50表示涨价50%，-30表示跌价30%',
        },
      },
      required: ['goodsName', 'percent'],
    },
  },
  {
    name: 'adjust_all_prices',
    description: '调整所有商品的价格。用于"让所有商品涨价/跌价"或"通货膨胀/紧缩"',
    parameters: {
      type: 'object',
      properties: {
        percent: {
          type: 'number',
          description: '价格变化百分比',
        },
      },
      required: ['percent'],
    },
  },
  {
    name: 'trigger_price_shock',
    description: '触发某商品的价格冲击（暴涨或暴跌）。用于"让XX暴涨/暴跌"',
    parameters: {
      type: 'object',
      properties: {
        goodsName: {
          type: 'string',
          description: '商品名称',
        },
        type: {
          type: 'string',
          enum: ['surge', 'crash'],
          description: 'surge=暴涨(+50%~+200%), crash=暴跌(-30%~-70%)',
        },
      },
      required: ['goodsName', 'type'],
    },
  },

  // ==================== 公司干预 ====================
  {
    name: 'set_company_cash',
    description: '直接设定某公司的现金。用于"给XX公司设定YY资金"',
    parameters: {
      type: 'object',
      properties: {
        companyId: {
          type: 'number',
          description: '公司ID。0=玩家公司，1-N=AI公司',
        },
        amount: {
          type: 'number',
          description: '新的现金金额',
        },
      },
      required: ['companyId', 'amount'],
    },
  },
  {
    name: 'adjust_company_cash',
    description: '调整某公司的现金。用于"给XX公司YY钱"或"让XX公司损失YY"',
    parameters: {
      type: 'object',
      properties: {
        companyId: {
          type: 'number',
          description: '公司ID。0=玩家公司',
        },
        amount: {
          type: 'number',
          description: '调整金额。正数=增加，负数=减少',
        },
      },
      required: ['companyId', 'amount'],
    },
  },
  {
    name: 'bankrupt_company',
    description: '使某公司破产。清空资金、库存，停止所有建筑。用于"让XX公司破产"或"毁掉XX公司"',
    parameters: {
      type: 'object',
      properties: {
        companyId: {
          type: 'number',
          description: '公司ID（不能是0/玩家）',
        },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'bankrupt_all_companies',
    description: '使所有AI公司破产。用于"全部公司破产"、"消灭所有竞争对手"、"让所有敌人破产"',
    parameters: {
      type: 'object',
      properties: {},
    },
  },

  // ==================== 建筑干预 ====================
  {
    name: 'destroy_building',
    description: '摧毁一座建筑。用于"摧毁XX建筑"',
    parameters: {
      type: 'object',
      properties: {
        buildingId: {
          type: 'number',
          description: '建筑ID',
        },
      },
      required: ['buildingId'],
    },
  },
  {
    name: 'destroy_company_buildings',
    description: '摧毁某公司的所有建筑。用于"摧毁XX公司的所有建筑"或天灾',
    parameters: {
      type: 'object',
      properties: {
        companyId: {
          type: 'number',
          description: '公司ID',
        },
      },
      required: ['companyId'],
    },
  },
  {
    name: 'grant_building',
    description: '赐予某公司建筑。用于"给XX公司一座YY"或"赐予建筑"',
    parameters: {
      type: 'object',
      properties: {
        companyId: {
          type: 'number',
          description: '公司ID。0=玩家',
        },
        buildingType: {
          type: 'string',
          description: '建筑类型名称，如：钢铁厂、铁矿场、农场',
        },
        count: {
          type: 'number',
          description: '数量，默认1',
        },
      },
      required: ['companyId', 'buildingType'],
    },
  },

  // ==================== 库存干预 ====================
  {
    name: 'inject_goods',
    description: '向某公司注入商品。用于"给XX公司YY商品"',
    parameters: {
      type: 'object',
      properties: {
        companyId: {
          type: 'number',
          description: '公司ID。0=玩家',
        },
        goodsName: {
          type: 'string',
          description: '商品名称',
        },
        amount: {
          type: 'number',
          description: '数量',
        },
      },
      required: ['companyId', 'goodsName', 'amount'],
    },
  },
  {
    name: 'remove_goods',
    description: '销毁某公司的商品。用于"让XX公司失去YY商品"',
    parameters: {
      type: 'object',
      properties: {
        companyId: {
          type: 'number',
          description: '公司ID',
        },
        goodsName: {
          type: 'string',
          description: '商品名称',
        },
        amount: {
          type: 'number',
          description: '数量',
        },
      },
      required: ['companyId', 'goodsName', 'amount'],
    },
  },

  // ==================== 全局事件 ====================
  {
    name: 'trigger_economic_event',
    description: '触发经济事件。用于"来一场经济危机/繁荣/通胀/紧缩"',
    parameters: {
      type: 'object',
      properties: {
        eventType: {
          type: 'string',
          enum: ['recession', 'boom', 'inflation', 'deflation'],
          description: 'recession=经济衰退, boom=经济繁荣, inflation=通货膨胀, deflation=通货紧缩',
        },
      },
      required: ['eventType'],
    },
  },
  {
    name: 'trigger_disaster',
    description: '触发自然灾害。用于"来一场地震/洪水/大火/瘟疫"',
    parameters: {
      type: 'object',
      properties: {
        disasterType: {
          type: 'string',
          enum: ['earthquake', 'flood', 'fire', 'plague'],
          description: 'earthquake=地震, flood=洪水, fire=大火, plague=瘟疫',
        },
        severity: {
          type: 'string',
          enum: ['minor', 'major', 'catastrophic'],
          description: 'minor=小型(10%), major=大型(30%), catastrophic=灾难性(60%)',
        },
      },
      required: ['disasterType', 'severity'],
    },
  },
  {
    name: 'set_global_demand',
    description: '设定全局需求乘数。用于"让全球需求增加/减少"',
    parameters: {
      type: 'object',
      properties: {
        multiplier: {
          type: 'number',
          description: '需求乘数。1.5=需求增加50%, 0.7=需求减少30%',
        },
      },
      required: ['multiplier'],
    },
  },

  // ==================== 时间控制 ====================
  {
    name: 'fast_forward',
    description: '快进时间。用于"快进XX天/小时"',
    parameters: {
      type: 'object',
      properties: {
        ticks: {
          type: 'number',
          description: '快进的tick数。24tick=1天',
        },
      },
      required: ['ticks'],
    },
  },

  // ==================== 查询（保留基本查询） ====================
  {
    name: 'get_world_status',
    description: '获取世界状态概览。用于了解当前游戏状况',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_price_list',
    description: '获取商品价格列表',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: '商品类别（可选）：原材料、工业品、消费品',
        },
      },
    },
  },
  {
    name: 'get_companies',
    description: '获取公司列表',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
];