# PromptBox

Claude Code 提示词管理器 — 管理、搜索、快速发送提示词到终端。

## 功能

- **词条管理** — 创建、编辑、删除提示词，支持拖拽排序
- **分类组织** — 按分类分组，支持自定义分类和颜色标记
- **搜索过滤** — 按标题、内容、标签实时搜索
- **快速发送** — 一键发送到 Claude Code 终端，或复制到输入框
- **批量操作** — 多选模式，批量删除
- **右键菜单** — 右键快速编辑、复制、发送、删除
- **10 套主题** — 深色、亮色、紫色、海洋、森林、日落、玫瑰、午夜、赛博、摩卡
- **数据导入/导出** — JSON / CSV / Markdown
- **系统托盘** — 关闭时最小化到托盘
- **自动更新** — 通过 GitHub Releases 检查更新

## 技术栈

| 层 | 技术 |
|------|---------|
| 框架 | Electron 42 + React 19 |
| 构建 | electron-vite 5 + Vite 6 |
| 样式 | Tailwind CSS 3.4 |
| 语言 | TypeScript |
| 数据 | JSON 文件存储 (`%APPDATA%/PromptBox/data/`) |
| 打包 | electron-builder (NSIS + Portable) |

## 开发

```bash
# 安装依赖
npm install

# 启动开发模式
npm run dev

# 构建
npm run build

# 打包安装包
npm run build:installer

# 打包便携版
npm run build:portable
```

## 项目结构

```
src/
├── main/                    # Electron 主进程
│   ├── index.ts             # 窗口、IPC、托盘、生命周期
│   └── services/
│       ├── storage.ts       # JSON 数据持久化 (CRUD)
│       ├── claude-code.ts   # PowerShell 自动化发送到终端
│       └── updater.ts       # auto-updater 封装
├── preload/
│   └── index.ts             # contextBridge API
├── renderer/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── modes/FullMode.tsx        # 主界面状态管理
│   │   ├── components/
│   │   │   ├── common/ContextMenu.tsx
│   │   │   ├── layout/Header.tsx
│   │   │   ├── layout/Sidebar.tsx
│   │   │   ├── prompt/PromptEditor.tsx
│   │   │   ├── prompt/PromptList.tsx
│   │   │   └── settings/SettingsPanel.tsx
│   │   └── styles/globals.css
│   └── index.html
└── shared/types.ts          # 共享类型 & IPC 通道
```

## IPC API

主进程通过 `contextBridge` 暴露 `window.api` 对象:

```ts
window.api.prompts.getAll()        // 获取所有词条
window.api.prompts.create(data)    // 创建词条
window.api.prompts.update(id,data) // 更新词条
window.api.prompts.delete(id)      // 删除词条
window.api.prompts.reorder(ids)    // 排序
window.api.prompts.deleteBatch(ids)// 批量删除

window.api.categories.getAll()     // 获取所有分类
window.api.categories.create(data)
window.api.categories.update(id,data)
window.api.categories.delete(id)

window.api.settings.get()
window.api.settings.update(partial)

window.api.claude.send(content)    // 发送到 Claude Code
window.api.claude.paste(content)   // 复制到输入框

window.api.data.export(format)     // JSON/CSV/MD
window.api.data.import()
window.api.data.clearAll()

window.api.checkUpdate()           // 检查更新
```

## 构建

构建产物位于 `dist/`:

- `PromptBox Setup 1.0.0.exe` — NSIS 安装包
- `PromptBox 1.0.0.exe` — 便携版
- `win-unpacked/` — 解压版 (开发调试用)

## 主题

所有主题通过 CSS 变量定义在 `globals.css` 中。主题色变量:

- `--color-accent` — 主色
- `--color-accent-light` — 浅色
- `--color-accent-hover` — hover (15% 透明度)
- `--color-accent-05/10/20/30/80` — 预计算透明度
