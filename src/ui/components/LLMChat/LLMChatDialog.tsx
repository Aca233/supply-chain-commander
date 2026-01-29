/**
 * LLM 聊天对话框组件
 * 悬浮式聊天窗口，支持拖拽和最小化
 * 支持函数调用模式和代码生成模式
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  sendMessage,
  sendMessageStream,
  executeGodAction,
  formatInterventionResult,
  formatExecutionResult,
  isLLMConfigured,
  loadLLMConfig,
  getLLMMode,
  setLLMMode,
  type ChatMessage,
  type LLMResponse,
  type LLMMode,
} from '@/core/llm';

/**
 * 从文本中检测并提取 JSON 格式的操作
 * 支持模型在文本中输出 {"action": "xxx", "parameters": {...}} 格式
 */
function extractJsonAction(content: string): { action: string; parameters: Record<string, unknown> } | null {
  // 匹配 JSON 代码块或裸 JSON
  const jsonPatterns = [
    /```(?:json)?\s*(\{[\s\S]*?"action"[\s\S]*?\})\s*```/i,
    /\{[\s\S]*?"action"\s*:\s*"[^"]+",\s*"parameters"\s*:\s*\{[\s\S]*?\}\s*\}/,
  ];
  
  for (const pattern of jsonPatterns) {
    const match = content.match(pattern);
    if (match) {
      try {
        const jsonStr = match[1] || match[0];
        const parsed = JSON.parse(jsonStr);
        if (parsed.action && typeof parsed.action === 'string') {
          return {
            action: parsed.action,
            parameters: parsed.parameters || {},
          };
        }
      } catch (e) {
        console.debug('[LLM] JSON parse failed:', e);
      }
    }
  }
  
  return null;
}

/**
 * 将模型输出的 action 名称映射到 function 名称
 */
function mapActionToFunction(action: string): string {
  const actionMap: Record<string, string> = {
    'build_building': 'build_building',
    'build': 'build_building',
    'construct': 'build_building',
    'upgrade_building': 'upgrade_building',
    'upgrade': 'upgrade_building',
    'demolish_building': 'demolish_building',
    'demolish': 'demolish_building',
    'buy': 'place_buy_order',
    'place_buy_order': 'place_buy_order',
    'sell': 'place_sell_order',
    'place_sell_order': 'place_sell_order',
    'apply_loan': 'apply_loan',
    'loan': 'apply_loan',
    'buy_stock': 'buy_stock',
    'sell_stock': 'sell_stock',
    'query_status': 'query_player_status',
    'query_inventory': 'query_inventory',
    'query_buildings': 'query_buildings',
    'query_market': 'query_market_price',
  };
  
  return actionMap[action.toLowerCase()] || action;
}

/**
 * 将模型输出的参数名映射到 function 参数名
 */
function mapParameters(functionName: string, params: Record<string, unknown>): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  
  // 通用映射
  const paramMap: Record<string, string> = {
    'building_type': 'buildingType',
    'buildingType': 'buildingType',
    'type': 'buildingType',
    'building_name': 'buildingName',
    'buildingName': 'buildingName',
    'goods_name': 'goodsName',
    'goodsName': 'goodsName',
    'goods': 'goodsName',
    'item': 'goodsName',
    'quantity': 'quantity',
    'amount': 'quantity',
    'price': 'price',
    'loan_type': 'loanType',
    'loanType': 'loanType',
  };
  
  for (const [key, value] of Object.entries(params)) {
    const mappedKey = paramMap[key] || key;
    mapped[mappedKey] = value;
  }
  
  return mapped;
}
import { useGameStore } from '@/stores/gameStore';

/**
 * 从内容中提取选项部分（"你可以："之后的内容）
 * 返回 { mainContent: 去除选项后的正文, options: 选项列表 }
 */
function extractOptionsFromContent(content: string): { mainContent: string; options: string[] } {
  const options: string[] = [];
  let mainContent = content;
  
  // 查找 "你可以" 开头的选项部分
  // 支持多种格式：
  // - "你可以：" 或 "**你可以：**" 或 "**你可以**："
  // - 前面可能有 "---" 分割线
  const optionStartPatterns = [
    /\n---\s*\n+\*{0,2}你可以\*{0,2}[：:]/i,   // --- 后跟 你可以
    /\n\*{0,2}你可以\*{0,2}[：:]\s*\*{0,2}\s*\n/i,  // 独立行的 你可以
  ];
  
  let optionStartIndex = -1;
  
  for (const pattern of optionStartPatterns) {
    const match = content.match(pattern);
    if (match && match.index !== undefined) {
      optionStartIndex = match.index;
      break;
    }
  }
  
  // 如果找到了选项部分
  if (optionStartIndex >= 0) {
    mainContent = content.slice(0, optionStartIndex).trim();
    const optionSection = content.slice(optionStartIndex);
    
    // 从选项部分提取数字编号的选项
    const lines = optionSection.split('\n');
    let passedYouCan = false;  // 是否已经过了"你可以"这行
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      
      // 移除 Markdown 标记
      const stripped = trimmed.replace(/\*\*/g, '').replace(/\*/g, '');
      
      // 跳过分割线和"你可以"行
      if (stripped === '---' || stripped.includes('你可以')) {
        passedYouCan = true;
        continue;
      }
      
      // 只在"你可以"之后才提取选项
      if (!passedYouCan) continue;
      
      // 匹配数字编号
      const match = stripped.match(/^(\d+)\s*[.、)]\s*(.+)/);
      if (match && match[2].trim().length > 0) {
        const optText = match[2].trim();
        // 跳过冒号结尾的（可能是小标题）
        if (!optText.endsWith(':') && !optText.endsWith('：')) {
          options.push(optText);
        }
      }
    }
  }
  
  return { mainContent, options };
}

/**
 * Markdown 渲染组件 - 使用 react-markdown
 */
function MarkdownContent({ content, onOptionClick }: { content: string; onOptionClick?: (option: string) => void }) {
  // 空内容时直接返回
  if (!content) return null;
  
  try {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // 标题 - 紧凑间距
        h1: ({ children }) => <h1 className="text-sm font-bold mt-1 -mb-0.5">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mt-1 -mb-0.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-bold mt-0.5 -mb-0.5">{children}</h3>,
        h4: ({ children }) => <h4 className="text-sm font-semibold mt-0.5 -mb-0.5">{children}</h4>,
        
        // 段落 - 极小间距
        p: ({ children }) => <p className="my-0 leading-tight">{children}</p>,
        
        // 列表 - 极小间距
        ul: ({ children }) => <ul className="list-disc list-inside my-0 ml-1 [&>li]:my-0">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside my-0 ml-1 [&>li]:my-0">{children}</ol>,
        
        // 代码
        code: ({ className, children, ...props }) => {
          const isInline = !className;
          if (isInline) {
            return (
              <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm font-mono text-blue-300" {...props}>
                {children}
              </code>
            );
          }
          return (
            <code className="text-sm text-green-400 font-mono" {...props}>
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="bg-gray-900 rounded p-1.5 my-0.5 overflow-x-auto">
            {children}
          </pre>
        ),
        
        // 表格 - 紧凑间距
        table: ({ children }) => (
          <div className="my-0.5 overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-700/50">{children}</thead>,
        tbody: ({ children }) => <tbody>{children}</tbody>,
        tr: ({ children }) => <tr className="even:bg-gray-800/30 odd:bg-gray-800/50">{children}</tr>,
        th: ({ children }) => (
          <th className="px-2 py-1 text-left font-medium text-gray-200 border-b border-gray-600">
            {children}
          </th>
        ),
        td: ({ children }) => (
          <td className="px-2 py-1 text-gray-300 border-b border-gray-700/50">
            {children}
          </td>
        ),
        
        // 链接
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            {children}
          </a>
        ),
        
        // 强调
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        
        // 引用 - 紧凑间距
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-gray-600 pl-2 my-0.5 text-gray-400 italic">
            {children}
          </blockquote>
        ),
        
        // 分割线
        hr: () => <hr className="my-1 border-gray-700" />,
        
        // 列表项 - 如果是数字选项，添加点击功能
        li: ({ children, ...props }) => {
          const text = extractText(children);
          const isOption = text && /^\s*\d+\s*[.、)]\s*.+/.test(text);
          
          if (isOption && onOptionClick) {
            const optionText = text.replace(/^\s*\d+\s*[.、)]\s*/, '').trim();
            return (
              <li
                className="leading-tight my-0 cursor-pointer hover:text-blue-400 transition-colors"
                onClick={() => onOptionClick(optionText)}
                {...props}
              >
                {children}
              </li>
            );
          }
          return <li className="leading-tight my-0" {...props}>{children}</li>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
    );
    
    // 辅助函数：从 children 中提取文本
    function extractText(children: React.ReactNode): string {
      if (typeof children === 'string') return children;
      if (Array.isArray(children)) {
        return children.map(c => extractText(c)).join('');
      }
      if (children && typeof children === 'object' && 'props' in children) {
        return extractText((children as React.ReactElement).props?.children);
      }
      return '';
    }
  } catch (error) {
    // 如果 react-markdown 渲染失败，回退到普通文本
    console.error('Markdown render error:', error);
    return <span className="whitespace-pre-wrap">{content}</span>;
  }
}

interface Message {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  isError?: boolean;
  isLoading?: boolean;
  actionResult?: string;
  code?: string;  // 隐藏的代码（可展开查看）
}

/**
 * 可折叠的代码块组件
 */
function CollapsibleCode({ code }: { code: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!code) return null;
  
  return (
    <div className="mt-2 border-t border-gray-700/30 pt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
      >
        <svg
          className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        {isExpanded ? '收起代码' : '查看代码'}
      </button>
      {isExpanded && (
        <pre className="mt-2 p-2 bg-gray-900 rounded text-xs text-green-400 font-mono overflow-x-auto max-h-48 overflow-y-auto">
          {code}
        </pre>
      )}
    </div>
  );
}

interface LLMChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

// 函数调用模式的快捷操作
const FUNCTION_QUICK_ACTIONS = [
  { label: '🌍 世界状态', message: '查看世界状态' },
  { label: '📈 价格列表', message: '查看价格列表' },
  { label: '💰 给我钱', message: '给玩家1000万' },
  { label: '🔥 触发灾难', message: '来一场大型地震' },
  { label: '📉 经济危机', message: '来一场经济危机' },
];

// 代码生成模式的快捷操作
const CODEGEN_QUICK_ACTIONS = [
  { label: '💰 亿万富翁', message: '给玩家1亿资金' },
  { label: '📈 全涨50%', message: '让所有商品涨价50%' },
  { label: '📉 全跌30%', message: '让所有商品降价30%' },
  { label: '💀 破产AI', message: '让所有AI公司破产' },
  { label: '🔥 随机灾难', message: '随机摧毁30%的建筑' },
  { label: '📦 满仓库', message: '给玩家每种原材料1万单位' },
];

export function LLMChatDialog({ isOpen, onClose, onMinimize }: LLMChatDialogProps) {
  const [currentMode, setCurrentMode] = useState<LLMMode>(() => getLLMMode());
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: 'assistant',
      content: '⚡ **欢迎来到神谕殿**\n\n你是这个世界的造物主，可以用自然语言控制一切：\n\n- 💰 "给玩家1000万"\n- 📈 "让钢材价格涨50%"\n- 🔥 "来一场地震"\n- 📉 "触发经济危机"\n- 🏭 "给玩家一座钢铁厂"\n\n发布你的神谕吧！\n\n💡 当前模式: **函数调用**（点击标题栏切换）',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // 切换模式
  const toggleMode = useCallback(() => {
    const newMode = currentMode === 'function' ? 'codegen' : 'function';
    setCurrentMode(newMode);
    setLLMMode(newMode);
    
    // 添加模式切换提示
    const modeMessages: Record<LLMMode, string> = {
      function: '🔧 已切换到 **函数调用模式**\n\n使用预定义函数执行操作，响应更快更稳定。',
      codegen: '⚡ 已切换到 **代码生成模式**\n\nLLM 会生成 JavaScript 代码直接操作游戏，功能更强大！\n\n试试说：\n- "让所有价格波动"\n- "找出最贵的商品并降价"\n- "随机给玩家一些资源"',
    };
    
    setMessages(prev => [...prev, {
      id: Date.now(),
      role: 'assistant',
      content: modeMessages[newMode],
      timestamp: Date.now(),
    }]);
  }, [currentMode]);
  
  // 获取当前模式的快捷操作
  const quickActions = currentMode === 'codegen' ? CODEGEN_QUICK_ACTIONS : FUNCTION_QUICK_ACTIONS;
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [size, setSize] = useState({ width: 400, height: 550 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState<'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n' | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 最小/最大尺寸
  const MIN_WIDTH = 320;
  const MIN_HEIGHT = 400;
  const MAX_WIDTH = 800;
  const MAX_HEIGHT = 900;
  
  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // 聚焦输入框
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // 拖拽逻辑
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.chat-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  }, [position]);
  
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: Math.max(0, Math.min(window.innerWidth - size.width, e.clientX - dragOffset.x)),
          y: Math.max(0, Math.min(window.innerHeight - size.height, e.clientY - dragOffset.y)),
        });
      } else if (isResizing) {
        const deltaX = e.clientX - resizeStart.x;
        const deltaY = e.clientY - resizeStart.y;
        
        let newWidth = resizeStart.width;
        let newHeight = resizeStart.height;
        let newPosX = resizeStart.posX;
        let newPosY = resizeStart.posY;
        
        // 根据调整方向计算新尺寸
        if (isResizing.includes('e')) {
          newWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.width + deltaX));
        }
        if (isResizing.includes('w')) {
          const widthChange = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, resizeStart.width - deltaX)) - resizeStart.width;
          newWidth = resizeStart.width + widthChange;
          newPosX = resizeStart.posX - widthChange;
        }
        if (isResizing.includes('s')) {
          newHeight = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.height + deltaY));
        }
        if (isResizing.includes('n')) {
          const heightChange = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, resizeStart.height - deltaY)) - resizeStart.height;
          newHeight = resizeStart.height + heightChange;
          newPosY = resizeStart.posY - heightChange;
        }
        
        setSize({ width: newWidth, height: newHeight });
        setPosition({ x: Math.max(0, newPosX), y: Math.max(0, newPosY) });
      }
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(null);
    };
    
    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, resizeStart, size.width, size.height]);
  
  // 开始调整大小
  const handleResizeStart = useCallback((direction: 'se' | 'sw' | 'ne' | 'nw' | 'e' | 'w' | 's' | 'n', e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y,
    });
  }, [size, position]);
  
  // 获取游戏暂停控制
  const { pauseGame, paused } = useGameStore();
  
  // 发送消息
  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    // 发送消息时自动暂停游戏
    if (!paused) {
      pauseGame();
    }
    
    if (!isLLMConfigured()) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: '⚠️ 请先在设置中配置 API Key 和端点',
        timestamp: Date.now(),
        isError: true,
      }]);
      return;
    }
    
    const userMessage: Message = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };
    
    const loadingMessage: Message = {
      id: Date.now() + 1,
      role: 'assistant',
      content: '思考中...',
      timestamp: Date.now(),
      isLoading: true,
    };
    
    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);
    
    try {
      // 构建历史消息
      const history: ChatMessage[] = messages
        .filter(m => m.role !== 'system' && !m.isLoading)
        .map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
      
      const config = loadLLMConfig();
      const useStream = config.stream ?? true;
      
      if (useStream) {
        // 流式响应
        // 使用 loading 消息的 ID，避免 ID 冲突
        const loadingMsgId = loadingMessage.id;
        let streamContent = '';
        
        // 更新 loading 消息为空的 assistant 消息
        setMessages(prev => prev.map(m =>
          m.id === loadingMsgId ? { ...m, isLoading: false, content: '' } : m
        ));
        
        await sendMessageStream(
          input.trim(),
          history,
          (chunk) => {
            streamContent += chunk;
            // 代码生成模式下不显示流式内容（代码），只显示"执行中..."
            if (currentMode === 'codegen') {
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId ? { ...m, content: '⚡ 正在生成并执行代码...' } : m
              ));
            } else {
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId ? { ...m, content: streamContent } : m
              ));
            }
          },
          (response) => {
            // 处理代码执行结果 - 只显示结果，代码折叠隐藏
            if (response.codeExecution) {
              const execResult = formatExecutionResult({
                success: response.codeExecution.success,
                message: response.codeExecution.success ? '代码执行成功' : '代码执行失败',
                logs: response.codeExecution.logs,
                error: response.codeExecution.error,
              });
              
              // 提取代码（从streamContent中）并存储，只显示执行结果
              const codeMatch = streamContent.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/);
              const extractedCode = codeMatch ? codeMatch[1].trim() : streamContent;
              
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId
                  ? { ...m, content: execResult, code: extractedCode }
                  : m
              ));
              return;
            }
            
            // 处理 function call（函数调用模式）
            if (response.functionCall) {
              const result = executeGodAction(
                response.functionCall.name,
                response.functionCall.arguments
              );
              
              // 使用上帝模式格式化结果
              const displayContent = formatInterventionResult(result);
                
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId
                  ? { ...m, content: displayContent }
                  : m
              ));
            } else if (!streamContent && !response.message) {
              // 空响应处理
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId
                  ? { ...m, content: '⚠️ AI 没有返回任何内容，请重试。如果问题持续，可能是 API 限流或配置问题。', isError: true }
                  : m
              ));
            } else if (streamContent) {
              // 检测文本中的 JSON 操作
              const jsonAction = extractJsonAction(streamContent);
              if (jsonAction) {
                const result = executeGodAction(jsonAction.action, jsonAction.parameters);
                
                if (result.effects.length > 0) {
                  setMessages(prev => [...prev, {
                    id: Date.now() + 2,
                    role: 'system',
                    content: formatInterventionResult(result),
                    timestamp: Date.now(),
                  }]);
                }
              }
            }
          },
          (error) => {
            setMessages(prev => prev.map(m =>
              m.id === loadingMsgId
                ? { ...m, content: `❌ ${error}`, isError: true }
                : m
            ));
          },
          currentMode
        );
      } else {
        // 非流式响应
        const response: LLMResponse = await sendMessage(input.trim(), history);
        
        // 移除 loading 消息
        setMessages(prev => prev.filter(m => !m.isLoading));
        
        if (response.error) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'assistant',
            content: `❌ ${response.error}`,
            timestamp: Date.now(),
            isError: true,
          }]);
        } else if (response.functionCall) {
          // 执行上帝模式操作
          const result = executeGodAction(
            response.functionCall.name,
            response.functionCall.arguments
          );
          
          const assistantMessage: Message = {
            id: Date.now(),
            role: 'assistant',
            content: formatInterventionResult(result),
            timestamp: Date.now(),
          };
          
          setMessages(prev => [...prev, assistantMessage]);
        } else {
          // 普通文本回复
          setMessages(prev => [...prev, {
            id: Date.now(),
            role: 'assistant',
            content: response.message,
            timestamp: Date.now(),
          }]);
        }
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `❌ 发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 处理快捷操作 - 直接设置并发送
  const handleQuickAction = useCallback(async (message: string) => {
    if (isLoading) return;
    
    console.log('[UI] handleQuickAction:', message);
      if (!isLLMConfigured()) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          role: 'assistant',
          content: '⚠️ 请先在设置中配置 API Key 和端点',
          timestamp: Date.now(),
          isError: true,
        }]);
        return;
      }
      
      // 发送消息时自动暂停游戏
      if (!paused) {
        pauseGame();
      }
      
      const userMessage: Message = {
        id: Date.now(),
        role: 'user',
        content: message,
        timestamp: Date.now(),
      };
      
      const loadingMessage: Message = {
        id: Date.now() + 1,
        role: 'assistant',
        content: '思考中...',
        timestamp: Date.now(),
        isLoading: true,
      };
      
      setMessages(prev => [...prev, userMessage, loadingMessage]);
      setIsLoading(true);
      
      try {
        const history: ChatMessage[] = messages
          .filter(m => m.role !== 'system' && !m.isLoading)
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          }));
        
        const config = loadLLMConfig();
        const loadingMsgId = loadingMessage.id;
        let streamContent = '';
        
        setMessages(prev => prev.map(m =>
          m.id === loadingMsgId ? { ...m, isLoading: false, content: '' } : m
        ));
        
        await sendMessageStream(
          message,
          history,
          (chunk) => {
            streamContent += chunk;
            // 代码生成模式下不显示流式内容（代码），只显示"执行中..."
            if (currentMode === 'codegen') {
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId ? { ...m, content: '⚡ 正在生成并执行代码...' } : m
              ));
            } else {
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId ? { ...m, content: streamContent } : m
              ));
            }
          },
          (response) => {
            // 处理代码执行结果 - 只显示结果，代码折叠隐藏
            if (response.codeExecution) {
              const execResult = formatExecutionResult({
                success: response.codeExecution.success,
                message: response.codeExecution.success ? '代码执行成功' : '代码执行失败',
                logs: response.codeExecution.logs,
                error: response.codeExecution.error,
              });
              
              // 提取代码并存储，只显示执行结果
              const codeMatch = streamContent.match(/```(?:javascript|js)?\s*\n([\s\S]*?)```/);
              const extractedCode = codeMatch ? codeMatch[1].trim() : streamContent;
              
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId
                  ? { ...m, content: execResult, code: extractedCode }
                  : m
              ));
              return;
            }
            
            if (response.functionCall) {
              const result = executeGodAction(
                response.functionCall.name,
                response.functionCall.arguments
              );
              
              // 使用上帝模式格式化结果
              const displayContent = formatInterventionResult(result);
                
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId
                  ? { ...m, content: displayContent }
                  : m
              ));
            } else if (!streamContent && !response.message) {
              // 空响应处理
              setMessages(prev => prev.map(m =>
                m.id === loadingMsgId
                  ? { ...m, content: '⚠️ AI 没有返回任何内容，请重试。', isError: true }
                  : m
              ));
            } else if (streamContent) {
              const jsonAction = extractJsonAction(streamContent);
              if (jsonAction) {
                const result = executeGodAction(jsonAction.action, jsonAction.parameters);
                if (result.effects.length > 0) {
                  setMessages(prev => [...prev, {
                    id: Date.now() + 2,
                    role: 'system',
                    content: formatInterventionResult(result),
                    timestamp: Date.now(),
                  }]);
                }
              }
            }
          },
          (error) => {
            setMessages(prev => prev.map(m =>
              m.id === loadingMsgId
                ? { ...m, content: `❌ ${error}`, isError: true }
                : m
            ));
          },
          currentMode
        );
    } catch (error) {
      console.error('[UI] Quick action error:', error);
      setMessages(prev => prev.filter(m => !m.isLoading));
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'assistant',
        content: `❌ 发生错误: ${error instanceof Error ? error.message : '未知错误'}`,
        timestamp: Date.now(),
        isError: true,
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, paused, pauseGame, messages, currentMode]);
  
  if (!isOpen) return null;
  
  return (
    <div
      ref={dialogRef}
      className="fixed z-50 bg-gray-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-gray-700/50 flex flex-col overflow-hidden"
      style={{
        left: position.x,
        top: position.y,
        width: size.width,
        height: size.height,
        cursor: isDragging ? 'grabbing' : 'default',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* 调整大小的边框和角落 */}
      {/* 右边 */}
      <div
        className="absolute right-0 top-4 bottom-4 w-2 cursor-e-resize hover:bg-blue-500/30 transition-colors"
        onMouseDown={(e) => handleResizeStart('e', e)}
      />
      {/* 左边 */}
      <div
        className="absolute left-0 top-4 bottom-4 w-2 cursor-w-resize hover:bg-blue-500/30 transition-colors"
        onMouseDown={(e) => handleResizeStart('w', e)}
      />
      {/* 下边 */}
      <div
        className="absolute bottom-0 left-4 right-4 h-2 cursor-s-resize hover:bg-blue-500/30 transition-colors"
        onMouseDown={(e) => handleResizeStart('s', e)}
      />
      {/* 右下角 */}
      <div
        className="absolute right-0 bottom-0 w-4 h-4 cursor-se-resize hover:bg-blue-500/50 transition-colors rounded-br-2xl"
        onMouseDown={(e) => handleResizeStart('se', e)}
      >
        <svg className="w-3 h-3 text-gray-500 absolute right-0.5 bottom-0.5" viewBox="0 0 10 10">
          <path d="M0 10 L10 0 L10 10 Z" fill="currentColor" />
        </svg>
      </div>
      {/* 左下角 */}
      <div
        className="absolute left-0 bottom-0 w-4 h-4 cursor-sw-resize hover:bg-blue-500/50 transition-colors rounded-bl-2xl"
        onMouseDown={(e) => handleResizeStart('sw', e)}
      />
      {/* 标题栏 */}
      <div className="chat-header flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-600/30 to-yellow-600/20 border-b border-amber-700/50 cursor-grab">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${currentMode === 'codegen' ? 'bg-purple-400' : 'bg-amber-400'} animate-pulse`}></div>
          <button
            onClick={toggleMode}
            className="text-sm font-medium text-amber-200 hover:text-white transition-colors flex items-center gap-1"
            title="点击切换模式"
          >
            {currentMode === 'codegen' ? '⚡ 代码生成' : '🔧 函数调用'}
            <svg className="w-3 h-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMinimize}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="最小化"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            title="关闭"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      {/* 消息区域 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : msg.role === 'system'
                  ? 'bg-gray-700/50 text-gray-300 text-sm'
                  : msg.isError
                  ? 'bg-red-900/30 text-red-300 border border-red-700/30'
                  : msg.isLoading
                  ? 'bg-gray-800/50 text-gray-400'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-relaxed">
                {msg.isLoading ? (
                  <div className="flex items-center gap-2">
                    <span className="animate-pulse">思考中</span>
                    <span className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                      <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                    </span>
                  </div>
                ) : msg.role === 'assistant' ? (
                  <>
                    {(() => {
                      const { mainContent, options } = extractOptionsFromContent(msg.content);
                      return (
                        <>
                          <MarkdownContent
                            content={mainContent}
                            onOptionClick={(option) => {
                              setInput(option);
                              setTimeout(() => handleSend(), 100);
                            }}
                          />
                          {/* 显示选项按钮（仅按钮，不在正文显示） */}
                          {options.length > 0 && !msg.isLoading && (
                            <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-gray-700/30">
                              {options.slice(0, 6).map((opt: string, idx: number) => (
                                <button
                                  key={idx}
                                  onClick={() => {
                                    setInput(opt);
                                    setTimeout(() => handleSend(), 100);
                                  }}
                                  disabled={isLoading}
                                  className="px-2 py-0.5 text-xs bg-blue-600/20 hover:bg-blue-600/40 text-blue-300 rounded-lg transition-colors disabled:opacity-50 border border-blue-500/30"
                                >
                                  {idx + 1}. {opt.length > 15 ? opt.slice(0, 15) + '...' : opt}
                                </button>
                              ))}
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {/* 可折叠的代码块 */}
                    {msg.code && <CollapsibleCode code={msg.code} />}
                  </>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* 快捷操作 */}
      <div className="px-3 py-2 border-t border-gray-700/30">
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action.message)}
              disabled={isLoading}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors disabled:opacity-50 ${
                currentMode === 'codegen'
                  ? 'bg-purple-900/50 hover:bg-purple-800/50 text-purple-300'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* 输入区域 */}
      <div className="p-3 border-t border-gray-700/50 bg-gray-800/30">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="输入指令或问题..."
            disabled={isLoading}
            className="flex-1 bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default LLMChatDialog;