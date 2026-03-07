# 架构与存储设计

## 当前架构（Monorepo 轻量模式）

### 技术栈

- Next.js 16（前端壳层 + 路由）
- React + TypeScript
- Tailwind CSS
- React Query（会话列表缓存与刷新）
- Vercel AI SDK（流式聊天）

### 核心结构

- `src/app`：页面与路由（含 `/api/chat` 服务端接口）。
- `src/components`：全局壳层与侧边栏。
- `src/app/components`：聊天页 UI 组件（输入、消息列表、错误展示）。
- `src/lib`：会话存储、消息解析、消息持久化等核心逻辑。
- `src/proxy.ts`：请求入口（Next.js `proxy` 约定）。

### 当前数据落盘

- 本地存储为主：
  - `deepscan:chat-store`
  - `deepscan:chat-store:v1`
  - `deepscan:chat:<sessionId>:messages`
  - `deepscan:theme`
  - `deepscan:sidebar-collapsed`

## 目标架构（前后端分离）

### 架构目标

- 前端：保留 Next.js，仅负责 UI、交互、状态展示。
- 后端：拆分为独立 Go Gin 服务，承接业务 API 与模型编排。
- 存储：从 localStorage 迁移到服务端数据库，支持稳定持久化与后续多端同步。

### 服务边界（规划）

- `chat-service`：会话/消息 CRUD、分页与检索。
- `model-service`：统一模型调用、流式转发、限流与审计。
- `agent-service`：任务计划、执行、重试、状态跟踪。
- `mcp-gateway`：MCP 客户端管理、工具发现、工具调用。

### 迁移原则

- 先兼容：保留当前前端调用形态，逐步替换 API 来源。
- 先核心：优先迁移会话与消息链路，再引入 Agent 与 MCP。
- 可观测：每个阶段都补充日志、错误码和基础监控。

## 设计取舍（简要）

- 当前本地存储方案上线快、成本低，但不适合跨端与团队协作。
- 后端分离后可显著提升安全性、可扩展性与可观测性。
