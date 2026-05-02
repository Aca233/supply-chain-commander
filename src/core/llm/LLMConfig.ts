/**
 * LLM 配置管理
 * 管理 API Key、端点等配置，存储在 localStorage
 */

export interface LLMConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  maxTokens: number;
  temperature: number;
  stream: boolean;
}

const STORAGE_KEY = 'llm_config';

const DEFAULT_CONFIG: LLMConfig = {
  apiKey: '',
  endpoint: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  maxTokens: 2048,
  temperature: 0.7,
  stream: true,
};

function getStorage(): Storage | null {
  return typeof localStorage === 'undefined' ? null : localStorage;
}

/**
 * 加载 LLM 配置
 */
export function loadLLMConfig(): LLMConfig {
  const storage = getStorage();
  if (!storage) return { ...DEFAULT_CONFIG };

  try {
    const stored = storage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...DEFAULT_CONFIG, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load LLM config:', e);
  }
  return { ...DEFAULT_CONFIG };
}

/**
 * 保存 LLM 配置
 */
export function saveLLMConfig(config: Partial<LLMConfig>): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    const current = loadLLMConfig();
    const updated = { ...current, ...config };
    storage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save LLM config:', e);
  }
}

/**
 * 检查 LLM 是否已配置
 */
export function isLLMConfigured(): boolean {
  const config = loadLLMConfig();
  return !!config.apiKey && config.apiKey.length > 0 && !!config.endpoint;
}

/**
 * 获取默认配置
 */
export function getDefaultConfig(): LLMConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * 清除 LLM 配置
 */
export function clearLLMConfig(): void {
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear LLM config:', e);
  }
}

/**
 * 预设模型列表
 */
export const PRESET_MODELS = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini (推荐)', provider: 'openai' },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'openai' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo', provider: 'openai' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', provider: 'openai' },
  { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet', provider: 'anthropic' },
  { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus', provider: 'anthropic' },
  { value: 'deepseek-chat', label: 'DeepSeek Chat', provider: 'deepseek' },
] as const;

/**
 * 预设端点
 */
export const PRESET_ENDPOINTS = [
  { value: 'https://api.openai.com/v1', label: 'OpenAI 官方' },
  { value: 'https://api.anthropic.com/v1', label: 'Anthropic 官方' },
  { value: 'https://api.deepseek.com/v1', label: 'DeepSeek 官方' },
  { value: 'custom', label: '自定义端点' },
] as const;

/**
 * 端点自动补全建议列表
 * 包含常用的 OpenAI 兼容端点
 */
export const ENDPOINT_SUGGESTIONS = [
  // 官方端点
  'https://api.openai.com/v1',
  'https://api.anthropic.com/v1',
  'https://api.deepseek.com/v1',
  'https://api.mistral.ai/v1',
  'https://api.groq.com/openai/v1',
  'https://api.together.xyz/v1',
  'https://api.fireworks.ai/inference/v1',
  'https://api.perplexity.ai',
  'https://generativelanguage.googleapis.com/v1beta/openai',
  // 国内代理
  'https://api.openai-proxy.com/v1',
  'https://api.openai-sb.com/v1',
  'https://api.chatanywhere.cn/v1',
  'https://api.chatanywhere.com.cn/v1',
  'https://openkey.cloud/v1',
  'https://api.closeai-proxy.xyz/v1',
  // OneAPI / New API 常见部署
  'http://localhost:3000/v1',
  'http://127.0.0.1:3000/v1',
  // Azure
  'https://{resource}.openai.azure.com/openai/deployments/{deployment}',
  // 本地部署
  'http://localhost:11434/v1',  // Ollama
  'http://localhost:1234/v1',   // LM Studio
  'http://localhost:8080/v1',   // LocalAI
] as const;

/**
 * 获取可用模型列表
 * @param endpoint API 端点 (可选，默认使用配置中的端点)
 * @param apiKey API Key (可选，默认使用配置中的 Key)
 */
export async function fetchAvailableModels(
  endpoint?: string,
  apiKey?: string
): Promise<{ id: string; name: string }[]> {
  const config = loadLLMConfig();
  const useEndpoint = endpoint || config.endpoint;
  const useApiKey = apiKey || config.apiKey;
  
  if (!useApiKey || !useEndpoint) {
    return [];
  }
  
  try {
    console.log('[LLM] Fetching models from:', `${useEndpoint}/models`);
    
    const response = await fetch(`${useEndpoint}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${useApiKey}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LLM] Failed to fetch models:', response.status, errorText);
      return [];
    }
    
    const data = await response.json();
    console.log('[LLM] Models response:', data);
    
    // OpenAI 格式的响应: { data: [...] }
    if (data.data && Array.isArray(data.data)) {
      const models = data.data
        .map((m: { id: string; name?: string }) => ({
          id: m.id,
          name: m.name || m.id,
        }))
        .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));
      
      console.log('[LLM] Parsed models:', models.length);
      return models;
    }
    
    // 有些 API 直接返回数组
    if (Array.isArray(data)) {
      const models = data
        .map((m: { id?: string; model?: string; name?: string } | string) => {
          if (typeof m === 'string') {
            return { id: m, name: m };
          }
          const id = m.id || m.model || '';
          return { id, name: m.name || id };
        })
        .filter((m: { id: string }) => m.id)
        .sort((a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id));
      
      console.log('[LLM] Parsed models (array format):', models.length);
      return models;
    }
    
    // 其他格式
    console.warn('[LLM] Unknown models response format:', data);
    return [];
  } catch (error) {
    console.error('[LLM] Error fetching models:', error);
    return [];
  }
}
