/**
 * 研发系统导出
 */

export {
  // 类型
  type Technology,
  type TechnologyCategory,
  type TechnologyUnlocks,
  type TechnologyEffects,
  type ResearchState,
  
  // 数据
  ALL_TECHNOLOGIES,
  TECHNOLOGIES_BY_ID,
  TECHNOLOGIES_BY_KEY,
  TECHNOLOGIES_BY_CATEGORY,
  
  // 状态管理
  getResearchState,
  canResearchTech,
  startResearch,
  processResearchTick,
  cancelResearch,
  isTechResearched,
  getResearchedTechs,
  getCurrentResearch,
  getResearchQueue,
  calculateTechEffects,
  getAvailableTechs,
  initializePlayerTechs,
  
  // 工具函数
  getCategoryName,
  getCategoryIcon,
} from './TechnologySystem';