# Supply Chain Commander 🏭

一款基于真实经济原理的供应链模拟游戏。

## 📖 游戏简介

Supply Chain Commander 是一款深度经济模拟游戏，玩家将扮演企业家，管理生产设施、参与市场交易、与AI竞争对手博弈，最终建立自己的商业帝国。

### 核心特性

- 🏗️ **生产系统** - 建造和管理多种类型的生产设施
- 📈 **市场交易** - 真实的供需曲线和价格发现机制
- 🤖 **AI竞争对手** - 具有不同性格和策略的智能AI公司
- 💰 **金融系统** - 股票市场、银行贷款、期货交易
- 📊 **经济周期** - 季节性需求变化和商业周期模拟
- 🏪 **零售系统** - 消费者市场和品牌价值管理

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆仓库
git clone https://github.com/YOUR_USERNAME/supply-chain-commander.git
cd supply-chain-commander

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🛠️ 技术栈

- **前端框架**: React 18 + TypeScript
- **状态管理**: Zustand + Immer
- **样式**: Tailwind CSS
- **图表**: ECharts
- **构建工具**: Vite
- **测试**: Vitest

## 📁 项目结构

```
src/
├── core/                 # 核心游戏逻辑
│   ├── ai/              # AI决策引擎
│   ├── economy/         # 经济系统
│   ├── finance/         # 金融系统
│   ├── market/          # 市场交易
│   ├── production/      # 生产系统
│   └── world/           # 游戏世界
├── data/                # 游戏数据定义
├── stores/              # 状态管理
└── ui/                  # 用户界面
    ├── components/      # 可复用组件
    └── pages/           # 页面组件
```

## 🎮 游戏玩法

1. **建造设施** - 从农场、矿场到工厂，建立完整的供应链
2. **生产商品** - 选择生产方法，优化产能和效率
3. **市场交易** - 在订单簿中买卖商品，把握市场时机
4. **扩张帝国** - 收购竞争对手，控制市场份额
5. **金融操作** - 利用股票和期货市场增加收益

## 📜 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

Made with ❤️ for simulation game enthusiasts