# 商业周刊生成开关与自动关闭设计

## Summary

本次改动的目标有两个：

1. 增加一个“商业周刊自动生成”设置开关，关闭后不再自动生成新的商业周刊。
2. 新一期商业周刊自动弹出时，5 秒后自动关闭；玩家手动打开历史周刊时不自动关闭。

整体策略保持轻量，不重构新闻数据结构，不改变现有新闻展示样式，只在“是否进入自动生成流程”和“弹窗是否带自动关闭语义”两处加控制。

## Scope

### In Scope

- `src/core/save/SaveManager.ts`
- `src/core/news/NewsGenerator.ts`
- `src/core/loop/GameLoop.ts`
- `src/stores/gameStore.ts`
- `src/ui/components/News/NewsDialog.tsx`
- `src/ui/pages/Settings.tsx`
- `src/ui/pages/MainMenu/components/SettingsDialog.tsx`
- 与以上改动直接相关的测试文件

### Out of Scope

- 新闻内容生成策略调整
- 新闻页面视觉重设计
- 新闻频率从双月改为月度或其他节奏
- 新增“只生成不弹窗”之类的第二层开关

## Functional Design

### 1. 商业周刊自动生成开关

在 `GameSettings` 中新增 `newsGenerationEnabled: boolean`，默认值为 `true`。

行为定义：

- `true`: 保持当前逻辑，到触发月份时自动生成商业周刊。
- `false`: 完全跳过自动生成流程，不写入新闻历史，不触发弹窗，也不触发“新周刊”通知。

该设置与现有其他游戏设置一致，通过 `saveManager.saveSettings()` 持久化到本地，并由 `loadSettings()` 在旧存档或旧设置缺少该字段时自动回填默认值。

### 2. 5 秒自动关闭

自动关闭只对“系统刚生成一份新商业周刊并自动弹出”这一路径生效。

行为定义：

- 自动生成并弹出时：弹窗开启后 5 秒自动关闭，同时保持“已生成的周刊内容”和“新闻历史”可在新闻页继续查看。
- 玩家手动从新闻页点击查看历史周刊时：弹窗不自动关闭，保持现有交互。
- 玩家手动点击关闭、按 `Escape`、或点击“查看全部”时：仍沿用当前关闭/已读逻辑。

### 3. 区分自动弹出与手动打开

当前 `showNewsPopup(report)` 同时承载“系统生成后弹出”和“玩家手动查看历史新闻”两类入口。

本次不新增复杂状态对象，只补一个轻量来源标记，用于区分：

- `auto-generated`
- `manual`

弹窗是否启用自动关闭，由这个来源标记决定。

## UI Design

### 游戏内设置页

在“游戏选项”区域中，紧跟“自动存档”设置附近新增：

- 标题：`商业周刊自动生成`
- 描述：`关闭后将不再自动生成新的商业周刊`

### 主菜单设置弹窗

在现有“游戏”设置组中新增同名开关，确保玩家进入游戏前后看到的是同一份配置。

## Data Flow

1. 设置页或主菜单设置切换 `newsGenerationEnabled`
2. `saveManager.saveSettings()` 持久化
3. 游戏循环在月初判断是否需要生成新闻时，先读取该设置
4. 若关闭，则直接跳过新闻生成
5. 若开启并生成成功，则通过 store 标记本次弹窗来源为 `auto-generated`
6. `NewsDialog` 仅在来源为 `auto-generated` 时启动 5 秒自动关闭计时器

## Testing Strategy

本次优先补最小但关键的回归测试：

- `SaveManager`:
  - 新字段默认值为 `true`
  - 保存为 `false` 后重新加载仍为 `false`
- `NewsGenerator`:
  - 生成开关关闭时，不应进入自动生成条件
- `NewsDialog`:
  - 自动弹出路径使用 5 秒自动关闭延迟
  - 手动查看路径不启用自动关闭

然后进行命令级验证：

- `npm test -- <targeted test files>`
- `npm run build`

## Risks

- 当前工作区已有其他未提交的大量改动，实施时必须避免覆盖用户现有修改。
- `GameLoop.ts` 与 `gameStore.ts` 目前已经存在其他在制变更，本次需要采用最小补丁方式接入新设置。
- 如果未来要扩展为“生成开关”和“自动弹窗开关”分离，本次的轻量来源标记仍可复用，但设置模型需要再扩一层。
