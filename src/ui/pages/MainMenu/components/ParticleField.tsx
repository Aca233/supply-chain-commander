/**
 * ✨ 粒子场效果组件
 * Canvas 实现的浮动粒子动画
 * 支持深色/浅色主题
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  targetOpacity: number;
  color: string;
  twinkleSpeed: number;
}

interface ParticleFieldProps {
  /** 粒子数量 */
  particleCount?: number;
  /** 深色主题颜色数组 */
  colors?: string[];
  /** 浅色主题颜色数组 */
  lightColors?: string[];
  /** 最大粒子大小 */
  maxSize?: number;
  /** 最大速度 */
  maxSpeed?: number;
  /** 是否启用 */
  enabled?: boolean;
}

const defaultDarkColors = [
  'rgba(0, 212, 255, 0.8)',   // 霓虹蓝
  'rgba(139, 92, 246, 0.7)',  // 紫色
  'rgba(59, 130, 246, 0.6)',  // 蓝色
  'rgba(6, 182, 212, 0.7)',   // 青色
  'rgba(168, 85, 247, 0.5)',  // 淡紫
];

const defaultLightColors = [
  'rgba(37, 99, 235, 0.5)',   // 蓝色
  'rgba(99, 102, 241, 0.4)',  // 靛蓝
  'rgba(139, 92, 246, 0.4)',  // 紫色
  'rgba(14, 165, 233, 0.5)',  // 天蓝
  'rgba(79, 70, 229, 0.4)',   // 深蓝
];

export const ParticleField: React.FC<ParticleFieldProps> = ({
  particleCount = 60,
  colors = defaultDarkColors,
  lightColors = defaultLightColors,
  maxSize = 3,
  maxSpeed = 0.3,
  enabled = true,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);
  const [isLightTheme, setIsLightTheme] = useState(false);

  // 检测主题变化
  useEffect(() => {
    const checkTheme = () => {
      setIsLightTheme(document.documentElement.classList.contains('light'));
    };
    
    checkTheme();
    
    // 监听主题变化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    
    return () => observer.disconnect();
  }, []);

  // 获取当前主题的颜色
  const currentColors = isLightTheme ? lightColors : colors;

  // 初始化粒子
  const initParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * maxSize + 0.5,
        speedX: (Math.random() - 0.5) * maxSpeed,
        speedY: (Math.random() - 0.5) * maxSpeed,
        opacity: Math.random() * 0.5 + 0.2,
        targetOpacity: Math.random() * 0.8 + 0.2,
        color: currentColors[Math.floor(Math.random() * currentColors.length)],
        twinkleSpeed: Math.random() * 0.02 + 0.005,
      });
    }
    
    particlesRef.current = particles;
  }, [particleCount, currentColors, maxSize, maxSpeed]);

  // 更新粒子颜色当主题变化时
  useEffect(() => {
    particlesRef.current.forEach(particle => {
      particle.color = currentColors[Math.floor(Math.random() * currentColors.length)];
    });
  }, [currentColors]);

  // 更新粒子
  const updateParticles = useCallback((width: number, height: number, deltaTime: number) => {
    const particles = particlesRef.current;
    const timeScale = deltaTime / 16.67; // 标准化到 60fps
    
    particles.forEach(particle => {
      // 移动
      particle.x += particle.speedX * timeScale;
      particle.y += particle.speedY * timeScale;
      
      // 边界检测（环绕）
      if (particle.x < 0) particle.x = width;
      if (particle.x > width) particle.x = 0;
      if (particle.y < 0) particle.y = height;
      if (particle.y > height) particle.y = 0;
      
      // 闪烁效果
      if (Math.abs(particle.opacity - particle.targetOpacity) < 0.01) {
        particle.targetOpacity = Math.random() * 0.8 + 0.2;
      }
      
      if (particle.opacity < particle.targetOpacity) {
        particle.opacity += particle.twinkleSpeed * timeScale;
      } else {
        particle.opacity -= particle.twinkleSpeed * timeScale;
      }
      
      particle.opacity = Math.max(0.1, Math.min(1, particle.opacity));
    });
  }, []);

  // 绘制粒子
  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    const particles = particlesRef.current;
    
    particles.forEach(particle => {
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      
      // 解析颜色并应用透明度
      const colorMatch = particle.color.match(/rgba?\(([^)]+)\)/);
      if (colorMatch) {
        const parts = colorMatch[1].split(',').map(s => s.trim());
        if (parts.length >= 3) {
          ctx.fillStyle = `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${particle.opacity})`;
        }
      } else {
        ctx.fillStyle = particle.color;
      }
      
      ctx.fill();
      
      // 发光效果（浅色主题下减弱）
      if (particle.size > 1.5) {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 2, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size * 2
        );
        const glowOpacity = isLightTheme ? particle.opacity * 0.2 : particle.opacity * 0.3;
        gradient.addColorStop(0, `rgba(255, 255, 255, ${glowOpacity})`);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    });
  }, [isLightTheme]);

  // 动画循环
  const animate = useCallback((timestamp: number) => {
    if (!enabled) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const deltaTime = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;
    
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 更新和绘制
    updateParticles(canvas.width, canvas.height, deltaTime);
    drawParticles(ctx);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [enabled, updateParticles, drawParticles]);

  // 初始化和响应尺寸变化
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
      
      // 重新初始化粒子
      initParticles(rect.width, rect.height);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [initParticles]);

  // 启动动画
  useEffect(() => {
    if (enabled) {
      lastTimeRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enabled, animate]);

  return (
    <canvas
      ref={canvasRef}
      className="particle-field"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

export default ParticleField;
