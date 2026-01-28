/**
 * 🎨 Design System Showcase
 * 展示所有设计系统组件
 */

import React, { useState } from 'react';
import {
  // 基础组件
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Tooltip,
  TooltipProvider,
  // 新组件
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Switch,
  Slider,
  DataTable,
  type Column,
  // 模式组件
  ProgressBar,
  StatWidget,
} from '../design-system';

// 示例数据
const tableData = [
  { id: 1, name: '铁矿石', price: 120, stock: 5000, change: 0.05 },
  { id: 2, name: '煤�ite', price: 80, stock: 8000, change: -0.03 },
  { id: 3, name: '钢铁', price: 450, stock: 2000, change: 0.12 },
  { id: 4, name: '铜', price: 380, stock: 3500, change: -0.08 },
  { id: 5, name: '电子元件', price: 1200, stock: 800, change: 0.25 },
];

const tableColumns: Column<typeof tableData[0]>[] = [
  { key: 'id', title: 'ID', width: 60, align: 'center' },
  { key: 'name', title: '商品名称', sortable: true },
  {
    key: 'price',
    title: '价格',
    sortable: true,
    align: 'right',
    render: (value) => `¥${value.toLocaleString()}`,
  },
  {
    key: 'stock',
    title: '库存',
    sortable: true,
    align: 'right',
    render: (value) => value.toLocaleString(),
  },
  {
    key: 'change',
    title: '涨跌',
    align: 'right',
    render: (value) => (
      <span className={value >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}>
        {value >= 0 ? '+' : ''}{(value * 100).toFixed(1)}%
      </span>
    ),
  },
];

export const DesignSystemShowcase: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [selectValue, setSelectValue] = useState('');
  const [switchOn, setSwitchOn] = useState(false);
  const [sliderValue, setSliderValue] = useState([50]);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleLoadingClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen p-8 space-y-12">
        {/* 标题 */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            🎨 Design System
          </h1>
          <p className="text-foreground-muted">Supply Chain Commander 现代化UI组件库</p>
        </div>

        {/* Buttons */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Buttons</h2>
          <div className="flex flex-wrap gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="success">Success</Button>
            <Button variant="neon">Neon</Button>
            <Button variant="gradient">Gradient</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button size="xs">Extra Small</Button>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button size="xl">Extra Large</Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button loading={loading} onClick={handleLoadingClick}>
              {loading ? 'Loading...' : 'Click to Load'}
            </Button>
            <Button disabled>Disabled</Button>
            <Button leftIcon="🚀">With Icon</Button>
            <Button variant="secondary" rightIcon="→">Next</Button>
          </div>
        </section>

        {/* Cards */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card variant="default" padding="md">
              <CardTitle>Default Card</CardTitle>
              <p className="text-sm text-foreground-muted mt-2">基础卡片样式</p>
            </Card>
            <Card variant="elevated" padding="md">
              <CardTitle>Elevated Card</CardTitle>
              <p className="text-sm text-foreground-muted mt-2">浮起阴影效果</p>
            </Card>
            <Card variant="game" padding="md">
              <CardTitle>Game Card</CardTitle>
              <p className="text-sm text-foreground-muted mt-2">游戏风格渐变</p>
            </Card>
            <Card variant="glow" padding="md">
              <CardTitle>Glow Card</CardTitle>
              <p className="text-sm text-foreground-muted mt-2">发光边框效果</p>
            </Card>
          </div>
        </section>

        {/* Badges */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Badges</h2>
          <div className="flex flex-wrap gap-3">
            <Badge>Default</Badge>
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="info">Info</Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="gold" glow>Gold</Badge>
            <Badge variant="legendary" glow>Legendary</Badge>
            <Badge variant="epic">Epic</Badge>
            <Badge variant="rare">Rare</Badge>
            <Badge variant="common">Common</Badge>
          </div>
          <div className="flex flex-wrap gap-3">
            <Badge variant="success" dot>Online</Badge>
            <Badge variant="error" dot>Offline</Badge>
            <Badge variant="warning" dot>Away</Badge>
          </div>
        </section>

        {/* Inputs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Default input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input placeholder="With left icon" leftIcon="🔍" />
            <Input placeholder="With right icon" rightIcon="✓" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input label="Email" placeholder="Enter email" required />
            <Input
              label="Password"
              type="password"
              placeholder="Enter password"
              helperText="At least 8 characters"
            />
            <Input
              label="Invalid Input"
              placeholder="Something wrong"
              error="This field is required"
            />
          </div>
        </section>

        {/* Select */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Select</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectValue} onValueChange={setSelectValue}>
              <SelectTrigger>
                <SelectValue placeholder="选择商品" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>原材料</SelectLabel>
                  <SelectItem value="iron">铁矿石</SelectItem>
                  <SelectItem value="coal">煤炭</SelectItem>
                  <SelectItem value="copper">铜</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>加工品</SelectLabel>
                  <SelectItem value="steel">钢铁</SelectItem>
                  <SelectItem value="electronics">电子元件</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select>
              <SelectTrigger size="sm">
                <SelectValue placeholder="小尺寸" />
              </SelectTrigger>
              <SelectContent variant="game">
                <SelectItem value="1">选项 1</SelectItem>
                <SelectItem value="2">选项 2</SelectItem>
                <SelectItem value="3">选项 3</SelectItem>
              </SelectContent>
            </Select>

            <Select disabled>
              <SelectTrigger>
                <SelectValue placeholder="禁用状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">选项 1</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </section>

        {/* Tabs */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Tabs</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-sm text-foreground-muted mb-2">Default</p>
              <Tabs defaultValue="tab1">
                <TabsList>
                  <TabsTrigger value="tab1">概览</TabsTrigger>
                  <TabsTrigger value="tab2">统计</TabsTrigger>
                  <TabsTrigger value="tab3">设置</TabsTrigger>
                </TabsList>
                <TabsContent value="tab1">概览内容</TabsContent>
                <TabsContent value="tab2">统计内容</TabsContent>
                <TabsContent value="tab3">设置内容</TabsContent>
              </Tabs>
            </div>
            <div>
              <p className="text-sm text-foreground-muted mb-2">Pills</p>
              <Tabs defaultValue="tab1">
                <TabsList variant="pills">
                  <TabsTrigger value="tab1" variant="pills">概览</TabsTrigger>
                  <TabsTrigger value="tab2" variant="pills">统计</TabsTrigger>
                  <TabsTrigger value="tab3" variant="pills">设置</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div>
              <p className="text-sm text-foreground-muted mb-2">Underline</p>
              <Tabs defaultValue="tab1">
                <TabsList variant="underline">
                  <TabsTrigger value="tab1" variant="underline">概览</TabsTrigger>
                  <TabsTrigger value="tab2" variant="underline">统计</TabsTrigger>
                  <TabsTrigger value="tab3" variant="underline">设置</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div>
              <p className="text-sm text-foreground-muted mb-2">Game Style</p>
              <Tabs defaultValue="tab1">
                <TabsList variant="game">
                  <TabsTrigger value="tab1" variant="game">⚔️ 战斗</TabsTrigger>
                  <TabsTrigger value="tab2" variant="game">🛡️ 防御</TabsTrigger>
                  <TabsTrigger value="tab3" variant="game">✨ 技能</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </section>

        {/* Switch */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Switch</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Switch
              checked={switchOn}
              onCheckedChange={setSwitchOn}
              label="Default Switch"
              description="这是一个开关组件"
            />
            <Switch
              variant="game"
              label="Game Style"
              description="带发光效果的开关"
              defaultChecked
            />
            <div className="flex items-center gap-4">
              <Switch size="sm" />
              <Switch size="md" />
              <Switch size="lg" defaultChecked />
            </div>
          </div>
        </section>

        {/* Slider */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Slider</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Slider
              value={sliderValue}
              onValueChange={setSliderValue}
              label="Default Slider"
              showValue
              max={100}
            />
            <Slider
              defaultValue={[75]}
              variant="game"
              color="success"
              label="Game Style (Success)"
              showValue
            />
            <Slider
              defaultValue={[40]}
              color="warning"
              label="Warning Color"
              showValue
            />
            <Slider
              defaultValue={[60]}
              variant="game"
              color="error"
              label="Error Color"
              showValue
            />
          </div>
        </section>

        {/* Dialog */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Dialog</h2>
          <div className="flex flex-wrap gap-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>Open Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>确认操作</DialogTitle>
                  <DialogDescription>你确定要执行此操作吗？此操作无法撤销。</DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <p className="text-foreground-secondary">
                    这是一个对话框示例，可以包含任何内容。
                  </p>
                </DialogBody>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDialogOpen(false)}>取消</Button>
                  <Button onClick={() => setDialogOpen(false)}>确认</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="neon">Game Style Dialog</Button>
              </DialogTrigger>
              <DialogContent variant="game">
                <DialogHeader>
                  <DialogTitle>🎮 游戏对话框</DialogTitle>
                  <DialogDescription>带有霓虹发光效果的对话框</DialogDescription>
                </DialogHeader>
                <DialogBody>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="legendary" glow>LEGENDARY</Badge>
                      <span>获得传奇物品！</span>
                    </div>
                    <ProgressBar value={80} color="gold" glow showValue label="经验值" />
                  </div>
                </DialogBody>
                <DialogFooter>
                  <Button variant="gradient">收下奖励</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Progress Bars */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Progress Bars</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ProgressBar value={75} label="Default" showValue />
            <ProgressBar value={60} color="success" label="Success" showValue />
            <ProgressBar value={45} color="warning" label="Warning" showValue glow />
            <ProgressBar value={30} color="error" label="Error" showValue glow />
            <ProgressBar value={80} color="gradient-brand" label="Gradient Blue" showValue />
            <ProgressBar value={65} color="gradient-purple" label="Gradient Purple" showValue />
            <ProgressBar value={50} color="gold" label="Gold (Game)" showValue glow />
            <ProgressBar value={40} color="energy" label="Energy (Game)" showValue glow />
          </div>
        </section>

        {/* Stat Widgets */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Stat Widgets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatWidget
              title="Total Revenue"
              value="¥1.2M"
              change={0.124}
              icon="💰"
            />
            <StatWidget
              title="Daily Orders"
              value="2,847"
              change={-0.056}
              changeLabel="vs yesterday"
              icon="📦"
            />
            <StatWidget
              title="Active Users"
              value="12.5K"
              change={0.089}
              icon="👥"
              variant="game"
            />
            <StatWidget
              title="System Status"
              value="Online"
              trend="up"
              icon="⚡"
              status="success"
              glow
            />
          </div>
        </section>

        {/* Data Table */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Data Table</h2>
          <div className="space-y-6">
            <div>
              <p className="text-sm text-foreground-muted mb-2">Default Style</p>
              <DataTable
                data={tableData}
                columns={tableColumns}
                rowKey="id"
                striped
                hoverable
              />
            </div>
            <div>
              <p className="text-sm text-foreground-muted mb-2">Game Style</p>
              <DataTable
                data={tableData}
                columns={tableColumns}
                rowKey="id"
                variant="game"
                hoverable
                compact
              />
            </div>
          </div>
        </section>

        {/* Tooltips */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Tooltips</h2>
          <div className="flex flex-wrap gap-4">
            <Tooltip content="This is a tooltip">
              <Button variant="secondary">Hover me</Button>
            </Tooltip>
            <Tooltip content="Top tooltip" side="top">
              <Button variant="ghost">Top</Button>
            </Tooltip>
            <Tooltip content="✨ Game style tooltip with glow effect!" variant="game">
              <Button variant="neon">Game Style</Button>
            </Tooltip>
          </div>
        </section>

        {/* Color Palette */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { name: 'Accent', class: 'bg-accent' },
              { name: 'Success', class: 'bg-success' },
              { name: 'Warning', class: 'bg-warning' },
              { name: 'Error', class: 'bg-error' },
              { name: 'Info', class: 'bg-info' },
              { name: 'Gold', class: 'bg-game-gold' },
              { name: 'Energy', class: 'bg-game-energy' },
              { name: 'Neon Blue', class: 'bg-neon-blue' },
            ].map((color) => (
              <div key={color.name} className="text-center">
                <div className={`h-12 rounded-lg ${color.class} shadow-lg`} />
                <span className="text-xs text-foreground-muted mt-1 block">{color.name}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </TooltipProvider>
  );
};

export default DesignSystemShowcase;
