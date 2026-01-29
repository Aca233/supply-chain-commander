/**
 * 悬浮聊天按钮
 * 点击打开 LLM 聊天对话框
 */

import React, { useState } from 'react';
import { LLMChatDialog } from './LLMChatDialog';
import { isLLMConfigured } from '@/core/llm';
import { useMobile } from '@/ui/hooks/useMobile';

export function FloatingChatButton() {
  const { isMobile } = useMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  
  const isConfigured = isLLMConfigured();
  
  const handleOpen = () => {
    setIsOpen(true);
    setIsMinimized(false);
    setHasUnread(false);
  };
  
  const handleClose = () => {
    setIsOpen(false);
    setIsMinimized(false);
  };
  
  const handleMinimize = () => {
    setIsMinimized(true);
    setIsOpen(false);
  };
  
  return (
    <>
      {/* 悬浮按钮 */}
      <button
        onClick={handleOpen}
        className={`
          fixed ${isMobile ? 'bottom-20 right-4' : 'bottom-6 right-6'} z-40
          w-14 h-14 rounded-full
          flex items-center justify-center
          shadow-lg shadow-blue-500/25
          transition-all duration-300 ease-out
          hover:scale-110 hover:shadow-xl hover:shadow-blue-500/30
          focus:outline-none focus:ring-4 focus:ring-blue-500/30
          ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}
          ${isConfigured 
            ? 'bg-gradient-to-br from-blue-500 to-purple-600' 
            : 'bg-gradient-to-br from-gray-600 to-gray-700'
          }
        `}
        title={isConfigured ? '打开 AI 助手' : '未配置 API Key'}
      >
        {/* 聊天图标 */}
        <svg 
          className="w-7 h-7 text-white" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
          />
        </svg>
        
        {/* 未配置提示点 */}
        {!isConfigured && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
            <span className="text-[10px] text-black font-bold">!</span>
          </span>
        )}
        
        {/* 未读消息指示器 */}
        {hasUnread && isConfigured && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full animate-pulse"></span>
        )}
        
        {/* 最小化时的脉冲动画 */}
        {isMinimized && (
          <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-25"></span>
        )}
      </button>
      
      {/* 聊天对话框 */}
      <LLMChatDialog
        isOpen={isOpen && !isMinimized}
        onClose={handleClose}
        onMinimize={handleMinimize}
      />
    </>
  );
}

export default FloatingChatButton;