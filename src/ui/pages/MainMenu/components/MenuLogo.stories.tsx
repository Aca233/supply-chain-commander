/**
 * Logo 组件 Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MenuLogo } from './MenuLogo';

const meta: Meta<typeof MenuLogo> = {
  title: 'Pages/MainMenu/MenuLogo',
  component: MenuLogo,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    animate: {
      control: 'boolean',
      description: '是否启用动画',
    },
    animationDelay: {
      control: { type: 'range', min: 0, max: 2000, step: 100 },
      description: '动画开始延迟 (ms)',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '60px', background: '#050505' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态 - 带动画
 */
export const Default: Story = {
  args: {
    animate: true,
    animationDelay: 200,
  },
};

/**
 * 无动画状态
 */
export const NoAnimation: Story = {
  args: {
    animate: false,
  },
};

/**
 * 延迟动画
 */
export const DelayedAnimation: Story = {
  args: {
    animate: true,
    animationDelay: 1000,
  },
};
