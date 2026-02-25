# DeepScan

一个 AI 对话框项目（当前为 Next.js 实现），目标演进为**常见的纯前端 AI Chat 应用形态**：本地会话管理、模型切换、主题切换、代码渲染与可扩展插件能力。

## 当前状态（as-is）

- 已有对话体验：发送消息、流式输出、消息渲染、代码高亮复制。
- 已有会话管理：侧边栏会话列表、搜索、置顶、重命名、删除。
- 已有会话分组：按“置顶 / 今天 / 近 7 天 / 近 30 天 / 更早”分段浏览历史。
- 已有会话迁移：支持会话 JSON 导出/导入（本地备份与恢复）。
- 已有体验增强：亮暗主题、移动端适配、侧边栏折叠。
- 已有消息操作：代码块复制 + 消息全文复制。
- 已有重试机制：支持“重试上一问”快速重新生成回答。
- 已有性能指标：展示首字耗时（TTFT）、总耗时与回复字数。
- 已有会话洞察：消息数/角色分布/字数/代码块数量概览。
- 已有快速提示：空会话提供可点击的提示词卡片。
- 已有角色标识：消息头像与角色标签增强可读性。
- 已有滚动辅助：可一键回到底部。
- 已有搜索高亮：匹配内容在消息内高亮显示。
- 已有输入提示：字数与 token 估算提示。
- 当前仅保留模型流式聊天接口（`/api/chat`）；会话管理已前端本地化。

## 目标状态（to-be：纯前端）

将项目收敛为纯前端形态（不依赖项目自建后端）：

- 会话、设置、偏好全部在浏览器本地存储（`localStorage` / `IndexedDB`）。
- 模型调用通过前端 Provider 适配层（可选“用户自带 Key”模式）。
- 页面层与状态层解耦，支持未来接入多模型、多插件、多工作区。
- 保持“开箱即用 + 可二次开发”的工程结构。

## 纯前端项目边界

- 本项目默认不提供后端持久化和账号云同步。
- 若使用第三方模型 API，建议采用“用户粘贴 Key，仅本地保存”策略。
- 生产场景如需安全代理、审计、限流，建议单独部署网关服务（不在本阶段范围）。

## 新开发计划（按常见 AI 对话框项目）

### Phase 1：前端架构收敛（MVP 基座）

目标：形成纯前端可运行闭环。

- 移除或降级 `app/api/*` 依赖，建立 `ChatProviderAdapter` 前端适配层。
- 统一状态分层：
  - UI 状态（面板、主题、折叠态）
  - 会话状态（chat list / active chat）
  - 消息状态（streaming / error / retry）
- 统一本地存储协议（版本号 + 数据迁移函数）。

完成标准：

- 不依赖服务端会话 API 也可完整聊天与管理会话。
- 刷新页面后会话与设置可恢复。

### Phase 2：核心对话体验对齐主流产品

目标：把聊天体验做扎实。

- 交互增强：停止生成、重新生成、复制消息、编辑后重发。
- 消息能力：Markdown、代码块、表格、长文本折叠、错误分级展示。
- 输入能力：快捷键、模板提示词、历史输入回溯。

完成标准：

- 覆盖常见聊天工作流：提问、追问、重试、修订、复制。

### Phase 3：会话系统进阶

目标：会话系统具备中大型项目可用性。

- 会话分组（Today / 7 Days / 30 Days）。
- 会话批量操作（批量删除、批量置顶、批量导出）。
- 全局搜索（标题 + 消息内容关键字）。

完成标准：

- 100+ 会话场景下仍可快速定位与操作。

### Phase 4：模型与配置中心

目标：支持多模型与可配置运行时。

- 模型配置中心：Provider、Model、温度、最大 tokens。
- 多 Provider 适配：DeepSeek / OpenAI-compatible（统一接口）。
- 请求生命周期可观测：首 token 时间、总耗时、失败原因。

完成标准：

- 同一套 UI 无缝切换多个模型配置。

### Phase 5：工程质量与发布

目标：可持续迭代。

- 测试：关键状态流单测 + 关键交互 E2E。
- 性能：首屏、长会话渲染、消息列表虚拟化（必要时）。
- 文档：二开指南、配置说明、故障排查。

完成标准：

- 具备稳定发布节奏与回归保障。

## 近期执行清单

### Week 1

- 抽离前端 `ChatProviderAdapter`。
- 本地会话数据结构版本化（含 migration）。
- 让聊天页不再依赖 `app/api/get-chats` / `app/api/create-chat`。

### Week 2

- 上线“重试/重新生成/编辑后重发”三项核心交互。
- 增加会话分组与消息内搜索。
- 补齐 README 的配置与排障章节。

## 技术栈（建议保留）

- Next.js 16（前端壳层）
- React + TypeScript
- Tailwind CSS
- React Query（异步状态）
- Vercel AI SDK（可继续沿用 UI/流式能力）

## 项目结构（关键目录）

- `src/app`：页面与路由（含 `/api/chat` 服务端代理接口）。
- `src/app/components`：聊天页 UI 组件（输入、消息列表、设置弹窗等）。
- `src/lib`：核心逻辑与状态（会话存储、消息解析、Provider 适配、搜索等）。
- `src/types`：领域类型定义。

## 架构概览（关键模块）

- `src/lib/chatProviderAdapter.ts`：前端 Provider 适配层（直连/OpenAI-compatible）。
- `src/lib/chatStore.ts`：本地会话列表存储与迁移。
- `src/lib/chatMessageStorage.ts`：会话消息存取（按会话 ID 分片）。
- `src/lib/chatMessages.ts`：消息文本解析与辅助函数。
- `src/lib/useMessageSearch.ts`：会话内搜索与定位滚动。

## 本地数据与存储键

- `deepscan:chat-store`：会话列表存储（含版本迁移）。
- `deepscan:chat-store:v1`：历史版本迁移源。
- `deepscan:chat:<sessionId>:messages`：消息分片存储。
- `deepscan:chat-provider:v1`：Provider 与 API 配置。
- `deepscan:theme`：主题偏好。

## 本地运行

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

默认地址：`http://localhost:3000`

## 测试与校验

```bash
pnpm test
pnpm lint
pnpm type-check
```

当前最小单测覆盖：`src/lib/chatMessages.ts` 的纯函数逻辑。

## 设计取舍（简要）

- 默认本地存储：保证零后端成本与即开即用，但不支持多端同步。
- SSE 流式兼容：依赖 OpenAI-compatible 规范，兼容多模型 Provider。

## 配置说明

### 方式 A：服务端模式（默认 `/api/chat`）

适合需要隐藏 Key、做限流或审计的场景。

环境变量：

- `DEEPSEEK_API_KEY`：模型 API Key
- `BASE_URL`：OpenAI-compatible 接口地址（例如 `https://api.deepseek.com/v1`）
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`：若启用登录

注意：

- `/api/chat` 会要求已登录用户；未登录会返回 401。
- 如不需要登录，可移除 `ClerkProvider` 与中间件保护逻辑。

### 方式 B：前端直连（OpenAI Compatible）

适合纯前端本地运行。

操作：

- 进入聊天页右上角“设置”。
- 选择“直连（OpenAI Compatible）”。
- 填写 `API 地址` 与 `API Key`（Header 名称与前缀可自定义）。
- 可选填写系统提示词（System Prompt）。

要求：

- 目标 API 支持 `chat/completions` 的 **SSE 流式**输出。
- 需开启 CORS，否则浏览器会拦截请求。

## 故障排查

- **401 Unauthorized**：服务端模式下未登录或 Clerk 配置不完整。
- **Missing DEEPSEEK_API_KEY or BASE_URL**：服务端模式未配置环境变量。
- **CORS blocked**：直连模式时 API 未允许浏览器跨域；建议改用服务端代理。
- **无流式输出**：目标接口不支持流式 SSE，或未启用 `stream: true`。
- **空回复或报错**：检查 API Key 是否有效、模型名称是否正确。

## 许可证

MIT
