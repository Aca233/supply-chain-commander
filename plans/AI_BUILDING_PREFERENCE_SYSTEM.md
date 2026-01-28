# AI建筑偏好系统设计方案

## 问题描述

当前AI系统存在以下问题：
1. `AIPersonality.ts` 中的 `avoidedCategories` 会**完全排除**某些商品类别的决策
2. `filterDecisionsByPersonality` 函数会直接过滤掉避免类别的决策
3. `PersonalityBehaviors.ts` 中的目标商品列表也会排除避免类别
4. 每种人格只定义了2-4个优先建筑，限制了AI建造的多样性

## 用户需求

- AI能够建造**所有类型**的建筑和产业
- 但对某些产业有**偏好/趋向**（而不是完全排除）

## 设计方案

### 1. 新增产业偏好权重系统

在 `AIPersonality.ts` 中新增产业偏好权重定义：

```typescript
/**
 * 产业类别偏好权重
 * 权重范围：0.1 - 2.0
 * - 0.1-0.5: 低偏好（但不排除）
 * - 0.5-1.0: 中等偏好
 * - 1.0-1.5: 高偏好
 * - 1.5-2.0: 极高偏好
 */
export interface IndustryPreferences {
  extraction: number;      // 采掘业（矿场、油田、农场等）
  processing: number;      // 加工业（钢铁厂、炼油厂等）
  manufacturing: number;   // 制造业（电子厂、汽车厂等）
  service: number;         // 服务业（物流、仓储等）
  retail: number;          // 零售业（商店、超市等）
  
  // 细分产业偏好
  agriculture: number;     // 农业产业链
  pharma: number;          // 医药产业链
  luxury: number;          // 奢侈品产业链
  tech: number;            // 高科技产业链
  basic: number;           // 基础材料产业链
}
```

### 2. 修改 AIPersonality 接口

```typescript
export interface AIPersonality {
  // ... 现有字段 ...
  
  // 【修改】将 avoidedCategories 改为 categoryPreferences
  // 旧字段保留但标记为废弃
  /** @deprecated 使用 industryPreferences 替代 */
  preferredCategories: string[];
  /** @deprecated 使用 industryPreferences 替代 */
  avoidedCategories: string[];
  
  // 【新增】产业偏好权重
  industryPreferences: IndustryPreferences;
}
```

### 3. 为每种人格定义产业偏好权重

```typescript
// 激进型：偏好高价值制造业，但也会涉足其他产业
aggressive: {
  industryPreferences: {
    extraction: 0.6,      // 低偏好
    processing: 0.8,      // 中等偏好
    manufacturing: 1.5,   // 高偏好
    service: 0.5,         // 低偏好
    retail: 0.4,          // 低偏好
    agriculture: 0.5,
    pharma: 0.7,
    luxury: 0.8,
    tech: 1.8,            // 极高偏好
    basic: 0.4,
  }
}

// 保守型：偏好稳定的基础产业
conservative: {
  industryPreferences: {
    extraction: 1.5,      // 高偏好
    processing: 1.2,      // 中高偏好
    manufacturing: 0.6,   // 低偏好
    service: 0.8,
    retail: 0.5,
    agriculture: 1.3,
    pharma: 0.7,
    luxury: 0.3,          // 很低偏好（但不排除）
    tech: 0.4,
    basic: 1.6,           // 极高偏好
  }
}

// ... 其他人格类似定义
```

### 4. 修改 filterDecisionsByPersonality 函数

**当前实现（问题代码）：**
```typescript
// 避免的类别 - 完全过滤
if (personality.avoidedCategories.includes(goods)) {
  return false;  // 问题：完全排除
}
```

**修改后实现：**
```typescript
export function filterDecisionsByPersonality(
  decisions: AIDecision[],
  personality: AIPersonality,
  world: GameWorld
): AIDecision[] {
  return decisions.map(d => {
    const adjusted = { ...d };
    
    // 检查商品类别偏好
    if (d.params.goodsId !== undefined) {
      const goodsId = d.params.goodsId as number;
      const category = world.goods.categories[goodsId];
      
      // 【新逻辑】使用权重调整优先级，而非完全过滤
      const categoryWeight = getCategoryWeight(personality, category);
      adjusted.priority *= categoryWeight;
      adjusted.confidence *= Math.sqrt(categoryWeight); // 置信度也受影响
    }
    
    // 检查建筑类型偏好（投资决策）
    if (d.type === 'investment' && d.params.buildingTypeId !== undefined) {
      const buildingTypeId = d.params.buildingTypeId as number;
      const buildingWeight = getBuildingTypeWeight(personality, buildingTypeId);
      adjusted.priority *= buildingWeight;
    }
    
    // 风险过滤（保留，但放宽阈值）
    const minConfidence = (1 - personality.riskTolerance) * 0.3; // 从0.5降到0.3
    if (adjusted.confidence < minConfidence) {
      adjusted.priority *= 0.1; // 大幅降低优先级而非完全过滤
    }
    
    return adjusted;
  }).filter(d => d.priority > 0.1); // 只过滤优先级极低的决策
}
```

### 5. 新增辅助函数

```typescript
/**
 * 获取商品类别的偏好权重
 */
function getCategoryWeight(personality: AIPersonality, category: string): number {
  const prefs = personality.industryPreferences;
  
  switch (category) {
    case 'raw':
      return prefs.extraction;
    case 'basic':
      return prefs.basic;
    case 'intermediate':
      return prefs.processing;
    case 'final':
      return prefs.manufacturing;
    default:
      return 1.0;
  }
}

/**
 * 获取建筑类型的偏好权重
 */
function getBuildingTypeWeight(personality: AIPersonality, buildingTypeId: number): number {
  const building = ALL_BUILDINGS.find(b => b.id === buildingTypeId);
  if (!building) return 1.0;
  
  const prefs = personality.industryPreferences;
  
  // 基于建筑类别
  let weight = 1.0;
  switch (building.category) {
    case 'extraction':
      weight = prefs.extraction;
      break;
    case 'processing':
      weight = prefs.processing;
      break;
    case 'manufacturing':
      weight = prefs.manufacturing;
      break;
    case 'service':
      weight = prefs.service;
      break;
    case 'retail':
      weight = prefs.retail;
      break;
  }
  
  // 细分产业加成
  if (isAgricultureBuilding(buildingTypeId)) {
    weight *= prefs.agriculture;
  } else if (isPharmaBuilding(buildingTypeId)) {
    weight *= prefs.pharma;
  } else if (isLuxuryBuilding(buildingTypeId)) {
    weight *= prefs.luxury;
  } else if (isTechBuilding(buildingTypeId)) {
    weight *= prefs.tech;
  }
  
  return weight;
}
```

### 6. 修改 getPersonalityTargetGoods 函数

**当前实现（问题代码）：**
```typescript
// 完全排除避免类别
if (!personality.avoidedCategories.includes(category)) {
  targetGoods.push(goodsId);
}
```

**修改后实现：**
```typescript
export function getPersonalityTargetGoods(
  world: GameWorld,
  personality: AIPersonality,
  companyId: number
): number[] {
  const targetGoods: { goodsId: number; score: number }[] = [];
  
  for (let goodsId = 0; goodsId < ACTUAL_GOODS_COUNT; goodsId++) {
    const category = world.goods.categories[goodsId];
    
    // 【新逻辑】所有商品都加入，但根据偏好计算分数
    const categoryWeight = getCategoryWeight(personality, category);
    const profitMargin = getGoodsProfitMargin(world, companyId, goodsId);
    
    // 综合评分 = 利润率 × 类别偏好权重
    const score = profitMargin * categoryWeight;
    
    targetGoods.push({ goodsId, score });
  }
  
  // 按分数排序
  targetGoods.sort((a, b) => b.score - a.score);
  
  // 根据专业化程度限制数量
  const maxGoods = Math.ceil((1 - personality.specializationDegree) * 30 + 10);
  
  return targetGoods.slice(0, maxGoods).map(g => g.goodsId);
}
```

### 7. 修改 BehaviorPattern.expansionStrategy

**当前实现：**
```typescript
expansionStrategy: {
  buildingPriority: [16, 18, 17], // 只有3个建筑
  maxBuildingsPerTick: 2,
  expansionCondition: (a) => a.cashRatio > 0.15 && a.cash > 1000000,
}
```

**修改后实现：**
```typescript
expansionStrategy: {
  // 【新增】所有建筑的偏好权重映射
  buildingWeights: Map<number, number>; // buildingTypeId -> weight
  
  // 保留原有字段用于向后兼容
  buildingPriority: number[];
  maxBuildingsPerTick: number;
  expansionCondition: (assessment: CompanyAssessment) => boolean;
}
```

### 8. 修改 generateInvestmentDecisions 函数

在生成投资决策时应用建筑偏好权重：

```typescript
// 在评估每个建筑时
for (const building of ALL_BUILDINGS) {
  // ... 现有逻辑 ...
  
  // 【新增】应用人格偏好权重
  const personalityWeight = getBuildingTypeWeight(personality, building.id);
  
  // 调整优先级和预期利润
  const adjustedPriority = basePriority * personalityWeight;
  const adjustedConfidence = baseConfidence * Math.sqrt(personalityWeight);
  
  decisions.push({
    type: 'investment',
    companyId,
    action: 'build',
    params: {
      buildingTypeId: building.id,
      recipeId: recipe.id,
      cost: building.buildCost,
      personalityWeight, // 记录权重用于调试
    },
    priority: adjustedPriority,
    expectedProfit: building.buildCost * 0.2 * personalityWeight,
    confidence: adjustedConfidence,
  });
}
```

## 各人格产业偏好权重定义

| 人格类型 | extraction | processing | manufacturing | service | retail | agriculture | pharma | luxury | tech | basic |
|---------|------------|------------|---------------|---------|--------|-------------|--------|--------|------|-------|
| aggressive | 0.6 | 0.8 | 1.5 | 0.5 | 0.4 | 0.5 | 0.7 | 0.8 | 1.8 | 0.4 |
| conservative | 1.5 | 1.2 | 0.6 | 0.8 | 0.5 | 1.3 | 0.7 | 0.3 | 0.4 | 1.6 |
| opportunist | 1.0 | 1.0 | 1.0 | 1.2 | 0.8 | 0.8 | 1.0 | 1.0 | 1.0 | 0.8 |
| specialist | 0.7 | 1.3 | 1.4 | 0.6 | 0.4 | 0.6 | 1.2 | 0.8 | 1.3 | 0.6 |
| diversified | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 | 1.0 |
| innovator | 0.5 | 0.8 | 1.3 | 0.7 | 0.4 | 0.4 | 1.4 | 0.6 | 2.0 | 0.3 |
| cost_leader | 1.3 | 1.4 | 1.0 | 0.8 | 0.6 | 1.2 | 0.6 | 0.2 | 0.5 | 1.5 |
| premium | 0.4 | 0.6 | 1.2 | 0.8 | 1.0 | 0.5 | 0.8 | 2.0 | 1.0 | 0.3 |

## 实现步骤

1. **修改 `AIPersonality.ts`**
   - 添加 `IndustryPreferences` 接口
   - 修改 `AIPersonality` 接口添加 `industryPreferences` 字段
   - 为每种人格定义产业偏好权重
   - 修改 `filterDecisionsByPersonality` 函数

2. **修改 `PersonalityBehaviors.ts`**
   - 添加 `getCategoryWeight` 和 `getBuildingTypeWeight` 辅助函数
   - 修改 `getPersonalityTargetGoods` 函数
   - 修改 `BehaviorPattern` 接口添加 `buildingWeights`

3. **修改 `AIDecisionEngine.ts`**
   - 修改 `generateInvestmentDecisions` 函数应用建筑偏好权重
   - 确保所有建筑类型都被考虑

4. **测试验证**
   - 运行游戏观察AI建造行为
   - 验证各人格AI能建造所有类型建筑
   - 验证偏好权重正确影响建造优先级

## 预期效果

修改后：
- **激进型AI**：会建造所有类型建筑，但更倾向于高科技和制造业（权重1.5-1.8），也会建造采掘业（权重0.6）
- **保守型AI**：会建造所有类型建筑，但更倾向于采掘业和基础材料（权重1.5-1.6），也会建造奢侈品（权重0.3）
- **多元型AI**：均衡建造所有类型建筑（权重都是1.0）

这样既保持了人格差异化，又确保AI能够涉足所有产业。