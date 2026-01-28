/**
 * 主菜单 Storybook Stories
 */

import type { Meta, StoryObj } from '@storybook/react';
import { MainMenu } from './MainMenu';

const meta: Meta<typeof MainMenu> = {
  title: 'Pages/MainMenu',
  component: MainMenu,
  parameters: {
    layout: 'fullscreen',
    backgrounds: {
      default: 'dark',
    },
  },
  tags: ['autodocs'],
  argTypes: {
    hasSaveGame: {
      control: 'boolean',
      description: '是否有可继续的存档',
    },
    version: {
      control: 'text',
      description: '版本号',
    },
    onNewGame: { action: 'newGame' },
    onContinue: { action: 'continue' },
    onLoadGame: { action: 'loadGame' },
    onSettings: { action: 'settings' },
    onExit: { action: 'exit' },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * 默认状态 - 无存档
 */
export const Default: Story = {
  args: {
    hasSaveGame: false,
    version: '0.1.0-alpha',
  },
};

/**
 * 有存档状态
 */
export const WithSaveGame: Story = {
  args: {
    hasSaveGame: true,
    version: '0.1.0-alpha',
  },
};

/**
 * 自定义版本号
 */
export const CustomVersion: Story = {
  args: {
    hasSaveGame: true,
    version: '1.0.0-release',
  },
};
