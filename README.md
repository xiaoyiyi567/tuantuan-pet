# 团团

团团是基于 PawPal 思路改造的 macOS 桌面工作宠物。第一阶段保留桌宠透明置顶窗口、菜单栏、本地设置保存、休息提醒、喝水提醒、专注模式和 macOS 当前 App 检测，并将体验改成中文工作陪伴风格。

当前版本默认使用 CSS 绘制的小企鹅作为 fallback。你也可以把真实透明背景素材放进 `pet_assets/团团小企鹅/`，团团会优先读取这些素材。

## 功能

- 透明、置顶、无边框桌宠窗口
- 默认显示在屏幕右下角
- 鼠标拖动位置，并本地保存
- 托盘 / 菜单栏入口
- 本地设置保存：`electron-store`
- 休息提醒和喝水提醒
- 专注模式计时
- macOS 当前 App / 窗口标题检测，用于专注模式分心提醒
- 点击团团显示克制气泡
- 右键菜单：专注、休息、静音、设置、退出、快捷缩放
- 桌宠尺寸：mini / small / medium / large / xlarge

## 本地运行

需要 Node.js 20+ 和 pnpm 9。

```bash
corepack enable
pnpm install
pnpm dev
```

构建 macOS App：

```bash
pnpm build
pnpm dist:mac
```

如果 macOS 当前 App 检测无法工作，请到：

`系统设置 -> 隐私与安全性 -> 辅助功能`

允许团团或 Electron 访问辅助功能权限，然后重启应用。

## 小企鹅素材替换

团团会按当前状态自动查找 `pet_assets/团团小企鹅/` 下的素材。优先级是：

1. `gif`
2. `webp`
3. `png`
4. CSS 小企鹅 fallback

路径约定：

```text
pet_assets/团团小企鹅/idle/idle.gif
pet_assets/团团小企鹅/idle/idle.webp
pet_assets/团团小企鹅/idle/idle.png

pet_assets/团团小企鹅/focus/focus.gif
pet_assets/团团小企鹅/focus/focus.webp
pet_assets/团团小企鹅/focus/focus.png

pet_assets/团团小企鹅/success/success.gif
pet_assets/团团小企鹅/success/success.webp
pet_assets/团团小企鹅/success/success.png

pet_assets/团团小企鹅/error/error.gif
pet_assets/团团小企鹅/error/error.webp
pet_assets/团团小企鹅/error/error.png

pet_assets/团团小企鹅/waiting/waiting.gif
pet_assets/团团小企鹅/waiting/waiting.webp
pet_assets/团团小企鹅/waiting/waiting.png

pet_assets/团团小企鹅/break/break.gif
pet_assets/团团小企鹅/break/break.webp
pet_assets/团团小企鹅/break/break.png
```

只放某个状态的素材即可。例如只放 `pet_assets/团团小企鹅/idle/idle.png`，idle 状态会显示新素材，其他状态继续使用 CSS 小企鹅。素材建议使用透明背景，团团会按当前宠物大小等比例缩放，不会拉伸变形。

打包时 `package.json` 已通过 `extraResources` 把 `pet_assets` 复制到 App 的 resources 目录，因此 `pnpm dist:mac` 后仍会读取同一套素材约定。

## 第一阶段改造范围

已完成：

- 保留 PawPal 的 Electron/electron-vite/React/TypeScript 技术路线
- 保留透明置顶桌宠窗口
- 保留托盘 / 菜单栏
- 保留本地设置保存
- 保留休息提醒、喝水提醒
- 保留专注模式当前 App 检测
- 将宠物名称和主要文案改为“团团”中文工作陪伴风格
- 支持小企鹅素材替换入口

暂不包含：

- 今日主线守护
- 屏幕识别
- 资讯简报
- OpenAI Vision
- 飞书联动
- 大规模重构

## 第二阶段建议

从以下位置开始：

1. `src/shared/types.ts`：增加 `DailyMainlinePlan`、`ActivityLogEntry`、`DailyReview` 类型。
2. `src/main/distraction.ts`：复用 `readActiveWindow()` 获取前台 App 和窗口标题。
3. `src/main/main.ts`：新增每 1 分钟的主线守护定时器。
4. `src/renderer/src/components/SettingsView.tsx`：增加“今日主线”录入和“今日复盘”展示区域。
5. 新增 `src/shared/mainlineGuardian.ts`：放关键词、允许 App、分心 App、勿扰时间判断的纯逻辑，方便测试。

第二阶段建议先只接入 App / 窗口标题判断和本地日志，不接屏幕识别。

## 来源说明

本项目的第一阶段实现参考 PawPal 的项目结构和能力边界：Electron 主进程负责桌宠窗口、托盘、定时器、持久化和当前 App 检测；React 渲染层负责桌宠和设置 UI。
