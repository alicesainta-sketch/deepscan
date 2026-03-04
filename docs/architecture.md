# 架构与存储设计

## 技术栈

- Next.js 16（前端壳层）
- React + TypeScript
- Tailwind CSS
- React Query（异步状态）
- Vercel AI SDK（可继续沿用 UI/流式能力）

## 项目结构

- `src/app`：页面与路由（含 `/api/chat` 服务端代理接口）。
- `src/app/components`：聊天页 UI 组件（输入、消息列表、设置弹窗等）。
- `src/lib`：核心逻辑与状态（会话存储、消息解析、Provider 适配、搜索等）。
- `src/types`：领域类型定义。

## 架构概览

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

## 设计取舍（简要）

- 默认本地存储：保证零后端成本与即开即用，但不支持多端同步。
- SSE 流式兼容：依赖 OpenAI-compatible 规范，兼容多模型 Provider。
