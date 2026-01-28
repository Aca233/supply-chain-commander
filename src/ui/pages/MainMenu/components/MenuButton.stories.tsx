/**
 * 菜单按钮 Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MenuButton } from './MenuButton';

// 示例图标
const PlayIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const meta: Meta<typeof MenuButton> = {
  title: 'Pages/MainMenu/MenuButton',
  component: MenuButton,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
      description: '按钮变体',
    },
    animate: {
      control: 'boolean',
      description: '是否启用动画',
    },
    disabled: {
      control: 'boolean',
      description: '是否禁用',
    },
    animationDelay: {
      control: { type: 'range', min: 0, max: 2000, step: 100 },
      description: '动画延迟 (ms)',
    },
    onClick: { action: 'clicked' },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '40px', background: '#050505', minWidth: '400px' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 主要按钮 - 霓虹发光效果
 */
export const Primary: Story = {
  args: {
    variant: 'primary',
    children: '新 游 戏',
    icon: <PlayIcon />,
    animate: false,
  },
};

/**
 * 次要按钮
 */
export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: '继续游戏',
    icon: <PlayIcon />,
    animate: false,
  },
};

/**
 * 幽灵按钮
 */
export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: '设    置',
    icon: <SettingsIcon />,
    animate: false,
  },
};

/**
 * 危险按钮
 */
export const Danger: Story = {
  args: {
    variant: 'danger',
    children: '退    出',
    animate: false,
  },
};

/**
 * 禁用状态
 */
export const Disabled: Story = {
  args: {
    variant: 'secondary',
    children: '继续游戏',
    disabled: true,
    animate: false,
  },
};

/**
 * 所有变体展示
 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <MenuButton variant="primary" icon={<PlayIcon />} animate={false}>
        Primary - 新游戏
      </MenuButton>
      <MenuButton variant="secondary" icon={<PlayIcon />} animate={false}>
        Secondary - 继续游戏
      </MenuButton>
      <MenuButton variant="ghost" icon={<SettingsIcon />} animate={false}>
        Ghost - 设置
      </MenuButton>
      <MenuButton variant="danger" animate={false}>
        Danger - 退出
      </MenuButton>
      <MenuButton variant="secondary" disabled animate={false}>
        Disabled - 禁用状态
      </MenuButton>
    </div>
  ),
};
