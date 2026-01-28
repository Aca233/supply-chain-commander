/**
 * Button 组件 Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
import { HiPlay, HiCog, HiTrash, HiCheck, HiArrowRight } from 'react-icons/hi2';

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'link', 'danger', 'success', 'neon', 'gradient'],
      description: '按钮变体',
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', 'icon', 'icon-sm', 'icon-xs'],
      description: '按钮尺寸',
    },
    loading: {
      control: 'boolean',
      description: '加载状态',
    },
    disabled: {
      control: 'boolean',
      description: '禁用状态',
    },
    fullWidth: {
      control: 'boolean',
      description: '是否全宽',
    },
    onClick: { action: 'clicked' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 主要按钮
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: '主要按钮',
  },
};

/**
 * 次要按钮
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: '次要按钮',
  },
};

/**
 * 幽灵按钮
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: '幽灵按钮',
  },
};

/**
 * 链接按钮
 */
export const Link: Story = {
  args: {
    variant: 'link',
    children: '链接按钮',
  },
};

/**
 * 危险按钮
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: '删除',
    leftIcon: <HiTrash />,
  },
};

/**
 * 成功按钮
 */
export const Success: Story = {
  args: {
    variant: 'success',
    children: '确认',
    leftIcon: <HiCheck />,
  },
};

/**
 * 霓虹按钮 - 游戏风格
 */
export const Neon: Story = {
  args: {
    variant: 'neon',
    children: '霓虹按钮',
  },
};

/**
 * 渐变按钮
 */
export const Gradient: Story = {
  args: {
    variant: 'gradient',
    children: '渐变按钮',
  },
};

/**
 * 加载状态
 */
export const Loading: Story = {
  args: {
    variant: 'primary',
    children: '加载中...',
    loading: true,
  },
};

/**
 * 禁用状态
 */
export const Disabled: Story = {
  args: {
    variant: 'primary',
    children: '禁用按钮',
    disabled: true,
  },
};

/**
 * 带图标
 */
export const WithIcons: Story = {
  args: {
    variant: 'primary',
    children: '下一步',
    rightIcon: <HiArrowRight />,
  },
};

/**
 * 所有尺寸
 */
export const AllSizes: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <Button size="xs">XS 尺寸</Button>
      <Button size="sm">SM 尺寸</Button>
      <Button size="md">MD 尺寸</Button>
      <Button size="lg">LG 尺寸</Button>
      <Button size="xl">XL 尺寸</Button>
    </div>
  ),
};

/**
 * 所有变体
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <Button variant="danger">Danger</Button>
        <Button variant="success">Success</Button>
        <Button variant="neon">Neon</Button>
        <Button variant="gradient">Gradient</Button>
      </div>
    </div>
  ),
};

/**
 * 图标按钮
 */
export const IconButtons: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: '12px' }}>
      <Button variant="primary" size="icon" iconOnly leftIcon={<HiPlay />} />
      <Button variant="secondary" size="icon" iconOnly leftIcon={<HiCog />} />
      <Button variant="ghost" size="icon" iconOnly leftIcon={<HiTrash />} />
      <Button variant="neon" size="icon" iconOnly leftIcon={<HiCheck />} />
    </div>
  ),
};
