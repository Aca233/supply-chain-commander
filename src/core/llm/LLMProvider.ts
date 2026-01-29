/**
 * LLM API 调用封装
 * 支持 OpenAI 兼容的 API 端点
 *
 * 上帝模式：用自然语言控制整个游戏世界
 * 代码生成模式：LLM生成代码直接操作游戏
 */

import { loadLLMConfig, LLMConfig } from './LLMConfig';
import { GOD_FUNCTIONS } from './GodFunctions';
import { buildGodModeSystemPrompt, buildWorldContext } from './GodModePrompt';
import { buildCodeGenSystemPrompt, buildCodeGenContext } from './CodeGenPrompt';
import { executeCode, extractCodeFromResponse, formatExecutionResult } from './CodeSandbox';

/**
 * 安全解析JSON，处理各种边缘情况
 * 包括：多个JSON连接、截断的JSON等
 */
function safeParseJSON(jsonStr: string | undefined): Record<string, unknown> | null {
  if (!jsonStr) return {};
  
  try {
    return JSON.parse(jsonStr);
  } catch (e) {
    // 尝试各种修复策略
    const cleaned = jsonStr.replace(/[\x00-\x1F\x7F]/g, '').trim();
    
    // 策略1：检测多个JSON对象连接在一起的情况
    // 例如: {"a":1}{"b":2}{"c":3}
    if (cleaned.startsWith('{')) {
      // 找到第一个完整的JSON对象
      let braceCount = 0;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < cleaned.length; i++) {
        const char = cleaned[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\' && inString) {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') braceCount++;
          else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              // 找到第一个完整的JSON对象
              const firstObject = cleaned.substring(0, i + 1);
              try {
                return JSON.parse(firstObject);
              } catch (e2) {
                // 继续尝试其他策略
                break;
              }
            }
          }
        }
      }
    }
    
    // 策略2：如果是被截断的JSON，尝试修复
    try {
      let fixed = cleaned;
      
      if (fixed.startsWith('{') && !fixed.endsWith('}')) {
        const lastComma = fixed.lastIndexOf(',');
        const lastColon = fixed.lastIndexOf(':');
        
        if (lastColon > lastComma) {
          fixed = fixed.substring(0, lastComma) + '}';
        } else {
          fixed = fixed + '}';
        }
      }
      
      return JSON.parse(fixed);
    } catch (e2) {
      console.error('[LLM] JSON parse failed after cleanup:', e2, 'original:', jsonStr);
      return null;
    }
  }
}

/**
 * 聊天消息类型
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

/**
 * LLM 响应类型
 */
export interface LLMResponse {
  message: string;
  functionCall?: {
    name: string;
    arguments: Record<string, unknown>;
  };
  codeExecution?: {
    code: string;
    success: boolean;
    logs: string[];
    error?: string;
  };
  error?: string;
}

/**
 * LLM 模式
 */
export type LLMMode = 'function' | 'codegen';

/**
 * 获取当前 LLM 模式（从配置或 localStorage）
 */
export function getLLMMode(): LLMMode {
  try {
    const mode = localStorage.getItem('llm_mode');
    if (mode === 'codegen') return 'codegen';
  } catch {}
  return 'function';
}

/**
 * 设置 LLM 模式
 */
export function setLLMMode(mode: LLMMode): void {
  try {
    localStorage.setItem('llm_mode', mode);
  } catch {}
}

/**
 * 发送消息给 LLM
 */
export async function sendMessage(
  userMessage: string,
  history: ChatMessage[],
  mode?: LLMMode
): Promise<LLMResponse> {
  const config = loadLLMConfig();
  const currentMode = mode ?? getLLMMode();
  
  if (!config.apiKey) {
    return { message: '', error: '请先在设置中配置 API Key' };
  }
  
  // 根据模式选择不同的系统提示词和上下文
  const systemPrompt = currentMode === 'codegen'
    ? buildCodeGenSystemPrompt()
    : buildGodModeSystemPrompt();
  const contextInfo = currentMode === 'codegen'
    ? buildCodeGenContext()
    : buildWorldContext();
  
  // 构建消息列表
  const messages = [
    { role: 'system', content: systemPrompt + '\n\n' + contextInfo },
    ...history.slice(-10).map(h => ({  // 只保留最近10条历史
      role: h.role,
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];
  
  // 只在函数调用模式下使用 tools
  const tools = currentMode === 'function'
    ? GOD_FUNCTIONS.map(fn => ({
        type: 'function' as const,
        function: fn,
      }))
    : undefined;
  
  try {
    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };
    
    // 函数调用模式添加 tools
    if (currentMode === 'function' && tools) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }
    
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API 错误: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        if (errorText.length < 200) {
          errorMessage += ` - ${errorText}`;
        }
      }
      
      return { message: '', error: errorMessage };
    }
    
    const data = await response.json();
    const choice = data.choices?.[0];
    
    if (!choice) {
      return { message: '', error: '无效的 API 响应' };
    }
    
    const assistantMessage = choice.message;
    
    // 检查是否有 tool_calls（新格式）
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      const toolCall = assistantMessage.tool_calls[0];
      if (toolCall.function) {
        const args = safeParseJSON(toolCall.function.arguments);
        if (args !== null) {
          return {
            message: assistantMessage.content || '',
            functionCall: {
              name: toolCall.function.name,
              arguments: args,
            },
          };
        } else {
          console.error('Failed to parse tool arguments:', toolCall.function.arguments);
          // 继续尝试返回文本内容
          if (assistantMessage.content) {
            return { message: assistantMessage.content };
          }
          return {
            message: '',
            error: '解析函数调用参数失败，请重试'
          };
        }
      }
    }
    
    // 检查是否有 function_call（旧格式）
    if (assistantMessage.function_call) {
      const args = safeParseJSON(assistantMessage.function_call.arguments);
      if (args !== null) {
        return {
          message: assistantMessage.content || '',
          functionCall: {
            name: assistantMessage.function_call.name,
            arguments: args,
          },
        };
      } else {
        console.error('Failed to parse function arguments:', assistantMessage.function_call.arguments);
        if (assistantMessage.content) {
          return { message: assistantMessage.content };
        }
        return {
          message: '',
          error: '解析函数调用参数失败，请重试'
        };
      }
    }
    
    // 代码生成模式：提取并执行代码
    if (currentMode === 'codegen' && assistantMessage.content) {
      const code = extractCodeFromResponse(assistantMessage.content);
      if (code) {
        const result = executeCode(code);
        return {
          message: assistantMessage.content,
          codeExecution: {
            code,
            success: result.success,
            logs: result.logs,
            error: result.error,
          },
        };
      }
    }
    
    return { message: assistantMessage.content || '' };
    
  } catch (error) {
    console.error('LLM request failed:', error);
    
    if (error instanceof TypeError && error.message?.includes('fetch')) {
      return {
        message: '',
        error: '网络请求失败，请检查网络连接和 API 端点'
      };
    }
    
    return {
      message: '',
      error: `请求失败: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 测试 LLM 连接
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  const config = loadLLMConfig();
  
  if (!config.apiKey) {
    return { success: false, message: '请先配置 API Key' };
  }
  
  try {
    const response = await fetch(`${config.endpoint}/models`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
    });
    
    if (response.ok) {
      return { success: true, message: '连接成功！' };
    } else {
      const errorText = await response.text();
      return { success: false, message: `连接失败: ${response.status} - ${errorText.slice(0, 100)}` };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `连接失败: ${error instanceof Error ? error.message : '网络错误'}` 
    };
  }
}

/**
 * 流式发送消息（用于打字机效果）
 */
export async function sendMessageStream(
  userMessage: string,
  history: ChatMessage[],
  onChunk: (chunk: string) => void,
  onComplete: (response: LLMResponse) => void,
  onError: (error: string) => void,
  mode?: LLMMode
): Promise<void> {
  const config = loadLLMConfig();
  const currentMode = mode ?? getLLMMode();
  
  if (!config.apiKey) {
    onError('请先在设置中配置 API Key');
    return;
  }
  
  // 根据模式选择系统提示词
  const systemPrompt = currentMode === 'codegen'
    ? buildCodeGenSystemPrompt()
    : buildGodModeSystemPrompt();
  const contextInfo = currentMode === 'codegen'
    ? buildCodeGenContext()
    : buildWorldContext();
  
  const messages = [
    { role: 'system', content: systemPrompt + '\n\n' + contextInfo },
    ...history.slice(-10).map(h => ({
      role: h.role,
      content: h.content,
    })),
    { role: 'user', content: userMessage },
  ];
  
  // 创建 AbortController 用于超时控制
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
  
  console.log('[LLM] Request config:', {
    endpoint: config.endpoint,
    model: config.model,
    messageCount: messages.length,
    hasApiKey: !!config.apiKey,
  });
  
  try {
    // 只在函数调用模式下使用 tools
    const tools = currentMode === 'function'
      ? GOD_FUNCTIONS.map(fn => ({
          type: 'function' as const,
          function: fn,
        }))
      : undefined;
    
    const requestBody: Record<string, unknown> = {
      model: config.model,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: true,
    };
    
    if (currentMode === 'function' && tools) {
      requestBody.tools = tools;
      requestBody.tool_choice = 'auto';
    }
    
    const response = await fetch(`${config.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      onError(`API 错误: ${response.status} - ${errorText.slice(0, 100)}`);
      return;
    }
    
    const reader = response.body?.getReader();
    if (!reader) {
      onError('无法读取响应流');
      return;
    }
    
    const decoder = new TextDecoder();
    let fullContent = '';
    let functionCall: LLMResponse['functionCall'] | undefined;
    
    let buffer = '';
    // 使用 Map 来追踪多个 tool_calls，key 是 id
    const toolCallsMap = new Map<string, { name: string; arguments: string }>();
    let firstToolCallId: string | null = null;
    
    console.log('[LLM] Starting stream read...');
    let readCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      readCount++;
      
      if (done) {
        console.log('[LLM] Stream done after', readCount, 'reads, buffer remaining:', buffer.length, 'chars');
        console.log('[LLM] Buffer content:', buffer.slice(0, 200));
        break;
      }
      
      const chunk = decoder.decode(value, { stream: true });
      console.log('[LLM] Chunk', readCount, 'length:', chunk.length, 'content:', chunk.slice(0, 200));
      
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一行可能不完整的数据
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine.startsWith('data:')) continue;
        
        const data = trimmedLine.replace('data:', '').trim();
        if (data === '[DONE]') continue;
        if (!data) continue;
        
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta;
          const finishReason = parsed.choices?.[0]?.finish_reason;
          
          // 处理文本内容
          if (delta?.content) {
            fullContent += delta.content;
            onChunk(delta.content);
          }
          
          // 处理 function call（旧格式）
          if (delta?.function_call) {
            const id = 'legacy_function_call';
            if (!toolCallsMap.has(id)) {
              toolCallsMap.set(id, { name: '', arguments: '' });
              if (firstToolCallId === null) {
                firstToolCallId = id;
              }
            }
            const tc = toolCallsMap.get(id)!;
            if (delta.function_call.name) {
              tc.name = delta.function_call.name;
            }
            if (delta.function_call.arguments) {
              tc.arguments += delta.function_call.arguments;
            }
          }
          
          // 处理 tool_calls（新格式，可能有多个并行调用）
          if (delta?.tool_calls) {
            for (const toolCall of delta.tool_calls) {
              // 使用 id 来区分不同的 tool calls
              const id = toolCall.id || `idx_${toolCall.index ?? 0}`;
              if (!toolCallsMap.has(id)) {
                toolCallsMap.set(id, { name: '', arguments: '' });
                // 记录第一个 tool call 的 id
                if (firstToolCallId === null) {
                  firstToolCallId = id;
                }
              }
              const tc = toolCallsMap.get(id)!;
              if (toolCall.function?.name) {
                tc.name = toolCall.function.name;
              }
              if (toolCall.function?.arguments) {
                tc.arguments += toolCall.function.arguments;
              }
            }
          }
          
          // 记录 finish_reason
          if (finishReason) {
            console.log('[LLM] finish_reason:', finishReason, 'tool_calls count:', toolCallsMap.size);
          }
          
          // 当有 finish_reason 时，解析第一个 tool call
          if (finishReason && toolCallsMap.size > 0 && firstToolCallId) {
            const firstToolCall = toolCallsMap.get(firstToolCallId);
            if (firstToolCall && firstToolCall.name && firstToolCall.arguments) {
              try {
                functionCall = {
                  name: firstToolCall.name,
                  arguments: JSON.parse(firstToolCall.arguments),
                };
                console.log('[LLM] Function call parsed:', functionCall);
              } catch (e) {
                console.error('[LLM] Failed to parse function arguments:', e, firstToolCall.arguments);
              }
            }
          }
        } catch (e) {
          // 忽略解析错误，可能是不完整的 JSON
          console.debug('[LLM] Stream parse error:', e, data);
        }
      }
    }
    
    // 处理 buffer 中剩余的数据（API 可能没有以换行符结尾）
    if (buffer.trim()) {
      console.log('[LLM] Processing remaining buffer:', buffer.slice(0, 100));
      const trimmedLine = buffer.trim();
      if (trimmedLine.startsWith('data:')) {
        const data = trimmedLine.replace('data:', '').trim();
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta;
            const finishReason = parsed.choices?.[0]?.finish_reason;
            
            if (delta?.content) {
              fullContent += delta.content;
              onChunk(delta.content);
            }
            
            if (delta?.function_call) {
              if (!toolCallsMap.has('0')) {
                toolCallsMap.set('0', { name: '', arguments: '' });
              }
              const tc = toolCallsMap.get('0')!;
              if (delta.function_call.name) {
                tc.name = delta.function_call.name;
              }
              if (delta.function_call.arguments) {
                tc.arguments += delta.function_call.arguments;
              }
            }
            
            if (finishReason && toolCallsMap.size > 0 && !functionCall) {
              const firstToolCall = toolCallsMap.get('0');
              if (firstToolCall && firstToolCall.name && firstToolCall.arguments) {
                try {
                  functionCall = {
                    name: firstToolCall.name,
                    arguments: JSON.parse(firstToolCall.arguments),
                  };
                } catch (e) {
                  console.error('[LLM] Failed to parse function arguments from buffer:', e);
                }
              }
            }
          } catch (e) {
            console.debug('[LLM] Buffer parse error:', e, data);
          }
        }
      }
    }
    
    // 如果有累积的 tool calls 还没解析
    if (toolCallsMap.size > 0 && !functionCall && firstToolCallId) {
      const firstToolCall = toolCallsMap.get(firstToolCallId);
      if (firstToolCall && firstToolCall.name && firstToolCall.arguments) {
        console.log('[LLM] Final parsing function call:', firstToolCall.name, 'args:', firstToolCall.arguments.slice(0, 100));
        try {
          functionCall = {
            name: firstToolCall.name,
            arguments: JSON.parse(firstToolCall.arguments),
          };
          console.log('[LLM] Function call parsed in final:', functionCall);
        } catch (e) {
          console.error('[LLM] Final parse function arguments failed:', e, firstToolCall.arguments);
        }
      }
    }
    
    clearTimeout(timeoutId);
    
    console.log('[LLM] Stream complete, content length:', fullContent.length, 'function call:', !!functionCall, 'mode:', currentMode);
    
    // 代码生成模式：在流式完成后执行代码
    if (currentMode === 'codegen' && fullContent) {
      const code = extractCodeFromResponse(fullContent);
      if (code) {
        console.log('[LLM] Executing generated code...');
        const result = executeCode(code);
        onComplete({
          message: fullContent,
          codeExecution: {
            code,
            success: result.success,
            logs: result.logs,
            error: result.error,
          },
        });
        return;
      }
    }
    
    onComplete({
      message: fullContent,
      functionCall,
    });
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error && error.name === 'AbortError') {
      onError('请求超时，请稍后重试');
    } else {
      onError(`请求失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  }
}