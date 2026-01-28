/**
 * 粒子场效果 Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { ParticleField } from './ParticleField';

const meta: Meta<typeof ParticleField> = {
  title: 'Pages/MainMenu/ParticleField',
  component: ParticleField,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    particleCount: {
      control: { type: 'range', min: 10, max: 200, step: 10 },
      description: '粒子数量',
    },
    maxSize: {
      control: { type: 'range', min: 1, max: 10, step: 0.5 },
      description: '最大粒子大小',
    },
    maxSpeed: {
      control: { type: 'range', min: 0.1, max: 2, step: 0.1 },
      description: '最大速度',
    },
    enabled: {
      control: 'boolean',
      description: '是否启用',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ 
        width: '100vw', 
        height: '100vh', 
        background: 'linear-gradient(135deg, #050505 0%, #0a0a12 50%, #050508 100%)',
        position: 'relative',
      }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认配置
 */
export const Default: Story = {
  args: {
    particleCount: 60,
    maxSize: 3,
    maxSpeed: 0.3,
    enabled: true,
  },
};

/**
 * 密集粒子
 */
export const Dense: Story = {
  args: {
    particleCount: 150,
    maxSize: 2,
    maxSpeed: 0.2,
    enabled: true,
  },
};

/**
 * 稀疏粒子
 */
export const Sparse: Story = {
  args: {
    particleCount: 30,
    maxSize: 4,
    maxSpeed: 0.4,
    enabled: true,
  },
};

/**
 * 自定义颜色
 */
export const CustomColors: Story = {
  args: {
    particleCount: 80,
    maxSize: 3,
    maxSpeed: 0.3,
    enabled: true,
    colors: [
      'rgba(236, 72, 153, 0.8)',  // 粉色
      'rgba(168, 85, 247, 0.7)',  // 紫色
      'rgba(139, 92, 246, 0.6)',  // 靛蓝
    ],
  },
};

/**
 * 禁用状态
 */
export const Disabled: Story = {
  args: {
    particleCount: 60,
    enabled: false,
  },
};
