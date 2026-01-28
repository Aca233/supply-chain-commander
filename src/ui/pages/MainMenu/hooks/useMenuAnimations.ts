/**
 * 🎬 主菜单动画控制 Hook
 */

import { useState, useEffect, useCallback } from 'react';

interface UseMenuAnimationsOptions {
  /** 是否自动开始 */
  autoStart?: boolean;
  /** 初始延迟 (ms) */
  initialDelay?: number;
}

interface UseMenuAnimationsReturn {
  /** 动画是否已开始 */
  isStarted: boolean;
  /** 动画是否已完成 */
  isComplete: boolean;
  /** 开始动画 */
  startAnimations: () => void;
  /** 重置动画 */
  resetAnimations: () => void;
  /** 跳过动画 */
  skipAnimations: () => void;
  /** 获取按钮动画延迟 */
  getButtonDelay: (index: number) => number;
}

// 动画时间配置
const ANIMATION_TIMING = {
  logoDelay: 200,
  buttonStartDelay: 1200,
  buttonStagger: 100,
  totalDuration: 2000,
};

export const useMenuAnimations = ({
  autoStart = true,
  initialDelay = 0,
}: UseMenuAnimationsOptions = {}): UseMenuAnimationsReturn => {
  const [isStarted, setIsStarted] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  // 开始动画
  const startAnimations = useCallback(() => {
    setIsStarted(true);
    
    // 设置完成标记
    setTimeout(() => {
      setIsComplete(true);
    }, ANIMATION_TIMING.totalDuration);
  }, []);

  // 重置动画
  const resetAnimations = useCallback(() => {
    setIsStarted(false);
    setIsComplete(false);
  }, []);

  // 跳过动画
  const skipAnimations = useCallback(() => {
    setIsStarted(true);
    setIsComplete(true);
  }, []);

  // 获取按钮动画延迟
  const getButtonDelay = useCallback((index: number): number => {
    if (!isStarted) return 0;
    return ANIMATION_TIMING.buttonStartDelay + (index * ANIMATION_TIMING.buttonStagger);
  }, [isStarted]);

  // 自动开始
  useEffect(() => {
    if (autoStart) {
      const timer = setTimeout(() => {
        startAnimations();
      }, initialDelay);
      
      return () => clearTimeout(timer);
    }
  }, [autoStart, initialDelay, startAnimations]);

  return {
    isStarted,
    isComplete,
    startAnimations,
    resetAnimations,
    skipAnimations,
    getButtonDelay,
  };
};

export default useMenuAnimations;
