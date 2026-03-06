# 架构与存储设计

## 技术栈

- Next.js 16（前端壳层 + 路由）
- React + TypeScript
- Tailwind CSS
- React Query（会话列表缓存与刷新）
- Vercel AI SDK（流式聊天）
- Clerk（可选鉴权）

## 项目结构

- `src/app`：页面与路由（含 `/api/chat` 服务端接口）。
- `src/components`：全局壳层与侧边栏。
- `src/app/components`：聊天页 UI 组件（输入、消息列表、错误展示）。
- `src/lib`：核心逻辑（会话存储、消息解析、草稿/消息持久化）。
- `src/types`：领域类型定义。
- `src/proxy.ts`：请求拦截入口（替代 `middleware` 约定）。

## 核心模块

- `src/app/chat/[chat_id]/page.tsx`：聊天主流程（发送、流式接收、会话创建与跳转）。
- `src/components/Navbar.tsx`：会话栏（新建/切换/重命名/删除）。
- `src/lib/chatStore.ts`：会话列表本地存储、导入导出与迁移。
- `src/lib/chatMessageStorage.ts`：按会话 ID 的消息分片存储。
- `src/lib/chatMessages.ts`：消息文本提取与辅助函数。
- `src/app/api/chat/route.ts`：模型请求代理与流式响应。

## 本地数据与存储键

- `deepscan:chat-store`：会话列表存储（含版本迁移）。
- `deepscan:chat-store:v1`：历史版本迁移源。
- `deepscan:chat:<sessionId>:messages`：消息分片存储。
- `deepscan:theme`：主题偏好。
- `deepscan:sidebar-collapsed`：侧边栏折叠状态。

## 设计取舍（简要）

- 默认本地存储：零后端成本、即开即用，但不支持多端同步。
- 功能聚焦：优先保留聊天主路径，移除低频高级能力以降低复杂度。
- 接口模式：统一通过 `/api/chat` 流式接口完成模型请求。
