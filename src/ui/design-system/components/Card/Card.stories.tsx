/**
 * Card 组件 Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from './Card';
import { Button } from '../Button';

const meta: Meta<typeof Card> = {
  title: 'Design System/Card',
  component: Card,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'elevated', 'game', 'ghost', 'glow'],
      description: '卡片变体',
    },
    status: {
      control: 'select',
      options: ['none', 'success', 'warning', 'error', 'info', 'active'],
      description: '状态指示',
    },
    padding: {
      control: 'select',
      options: ['none', 'sm', 'md', 'lg', 'xl'],
      description: '内边距',
    },
    interactive: {
      control: 'boolean',
      description: '是否可交互',
    },
    selected: {
      control: 'boolean',
      description: '是否选中',
    },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '20px', minWidth: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认卡片
 */
export const Default: Story = {
  args: {
    variant: 'default',
    children: (
      <>
        <CardHeader>
          <CardTitle>卡片标题</CardTitle>
        </CardHeader>
        <CardContent>
          <p>这是卡片的内容区域。可以放置任何内容。</p>
        </CardContent>
      </>
    ),
  },
};

/**
 * 浮起卡片
 */
export const Elevated: Story = {
  args: {
    variant: 'elevated',
    children: (
      <>
        <CardHeader>
          <CardTitle>浮起卡片</CardTitle>
          <CardDescription>带有阴影效果的卡片</CardDescription>
        </CardHeader>
        <CardContent>
          <p>这个卡片有更强的阴影效果，看起来更加突出。</p>
        </CardContent>
      </>
    ),
  },
};

/**
 * 游戏风格卡片
 */
export const Game: Story = {
  args: {
    variant: 'game',
    children: (
      <>
        <CardHeader>
          <CardTitle>🏭 钢铁厂</CardTitle>
          <CardDescription>生产设施</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>产能</span>
            <span style={{ color: 'var(--success)' }}>100%</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--text-secondary)' }}>效率</span>
            <span>85%</span>
          </div>
        </CardContent>
        <CardFooter>
          <Button size="sm" variant="ghost">详情</Button>
          <Button size="sm" variant="primary">升级</Button>
        </CardFooter>
      </>
    ),
  },
};

/**
 * 发光卡片
 */
export const Glow: Story = {
  args: {
    variant: 'glow',
    children: (
      <>
        <CardHeader>
          <CardTitle>✨ 特殊卡片</CardTitle>
        </CardHeader>
        <CardContent>
          <p>带有发光效果的特殊卡片，用于强调重要内容。</p>
        </CardContent>
      </>
    ),
  },
};

/**
 * 带状态指示
 */
export const WithStatus: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Card status="success" variant="game">
        <CardContent>
          <CardTitle>✅ 运行中</CardTitle>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>设施正常运行</p>
        </CardContent>
      </Card>
      <Card status="warning" variant="game">
        <CardContent>
          <CardTitle>⚠️ 资源不足</CardTitle>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>需要补充原材料</p>
        </CardContent>
      </Card>
      <Card status="error" variant="game">
        <CardContent>
          <CardTitle>❌ 已停机</CardTitle>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>设施需要维修</p>
        </CardContent>
      </Card>
    </div>
  ),
};

/**
 * 可交互卡片
 */
export const Interactive: Story = {
  args: {
    variant: 'game',
    interactive: true,
    children: (
      <CardContent>
        <CardTitle>可点击卡片</CardTitle>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          鼠标悬停和点击都有交互效果
        </p>
      </CardContent>
    ),
  },
};

/**
 * 选中状态
 */
export const Selected: Story = {
  args: {
    variant: 'game',
    interactive: true,
    selected: true,
    children: (
      <CardContent>
        <CardTitle>已选中的卡片</CardTitle>
        <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
          显示选中状态的高亮边框
        </p>
      </CardContent>
    ),
  },
};
