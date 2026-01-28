/**
 * 🎨 Supply Chain Commander Design System
 * 
 * 现代化游戏风格UI组件库
 * 
 * @example
 * import { Button, Card, Badge, StatWidget } from '@/ui/design-system';
 */

// ============ 设计令牌 ============
export * from './tokens';

// ============ 工具函数 ============
export * from './utils';

// ============ 基础组件 ============

// Button
export { Button, buttonVariants, type ButtonProps } from './components/Button';

// Card
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  cardVariants,
  type CardProps,
} from './components/Card';

// Badge
export { Badge, badgeVariants, type BadgeProps } from './components/Badge';

// Input
export { Input, inputVariants, type InputProps } from './components/Input';

// Tooltip
export {
  Tooltip,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
  TooltipContent,
  type TooltipProps,
} from './components/Tooltip';

// Dialog
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  DialogBody,
  type DialogContentProps,
} from './components/Dialog';

// Select
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
} from './components/Select';

// Tabs
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from './components/Tabs';

// Switch
export { Switch, type SwitchProps } from './components/Switch';

// Slider
export { Slider, type SliderProps } from './components/Slider';

// Table
export { DataTable, type DataTableProps, type Column } from './components/Table';

// ============ 模式组件 ============
export { ProgressBar, type ProgressBarProps } from './patterns/ProgressBar';
export { StatWidget, type StatWidgetProps } from './patterns/StatWidget';

// ============ Hooks ============
export { useTheme, type Theme } from './hooks';
