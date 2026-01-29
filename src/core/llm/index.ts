/**
 * LLM 集成模块
 * 导出所有LLM相关功能
 *
 * 上帝模式：用自然语言控制整个游戏世界
 * 代码生成模式：LLM生成代码直接操作游戏
 */

// 配置管理
export type { LLMConfig } from './LLMConfig';
export {
  loadLLMConfig,
  saveLLMConfig,
  isLLMConfigured,
  getDefaultConfig,
  clearLLMConfig,
  fetchAvailableModels,
  PRESET_MODELS,
  PRESET_ENDPOINTS,
  ENDPOINT_SUGGESTIONS,
} from './LLMConfig';

// 函数定义（旧版，保留兼容）
export {
  GAME_FUNCTIONS,
  findGoodsIdByName,
  findBuildingTypeByName,
  getGoodsName,
  getBuildingName,
} from './FunctionDefinitions';

// 游戏上下文（旧版）
export type { GameContext } from './GameContextBuilder';
export {
  buildGameContext,
  buildSystemPrompt,
  buildContextMessage,
} from './GameContextBuilder';

// LLM服务
export type { ChatMessage, LLMResponse, LLMMode } from './LLMProvider';
export {
  sendMessage,
  sendMessageStream,
  testConnection,
  getLLMMode,
  setLLMMode,
} from './LLMProvider';

// 操作执行（旧版）
export type { ActionResult } from './ActionExecutor';
export { executeAction } from './ActionExecutor';

// ==================== 上帝模式 ====================

// 上帝模式函数定义
export { GOD_FUNCTIONS } from './GodFunctions';

// 上帝模式提示词
export {
  buildGodModeSystemPrompt,
  buildWorldContext,
  fuzzyMatchGoodsName,
  fuzzyMatchBuildingType,
  GOODS_ALIASES,
  BUILDING_ALIASES,
} from './GodModePrompt';

// 上帝模式操作执行
export { executeGodAction, formatInterventionResult } from './GodActionExecutor';

// 世界状态修改器
export type { InterventionResult } from './WorldModifier';
export {
  setPrice,
  adjustPrice,
  adjustAllPrices,
  triggerPriceShock,
  setCompanyCash,
  adjustCompanyCash,
  bankruptCompany,
  bankruptAllCompanies,
  destroyBuilding,
  destroyCompanyBuildings,
  grantBuilding,
  injectGoods,
  removeGoods,
  setGlobalDemandMultiplier,
  triggerEconomicEvent,
  triggerDisaster,
  fastForward,
} from './WorldModifier';

// ==================== 代码生成模式 ====================

// 代码沙盒
export type { CodeExecutionResult } from './CodeSandbox';
export {
  validateCode,
  executeCode,
  extractCodeFromResponse,
  formatExecutionResult,
} from './CodeSandbox';

// 代码生成提示词
export {
  buildCodeGenSystemPrompt,
  buildCodeGenContext,
} from './CodeGenPrompt';