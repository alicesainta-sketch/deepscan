# Agent + MCP 接口协议（v0.1）

本文用于前端 Agent/MCP 开发与后端 Gin 开发的并行合同。

## 1. 协议目标

- 统一 Agent Run 生命周期接口。
- 统一 SSE 事件语义。
- 统一 MCP 工具目录与调用接口。
- 明确错误码和重试语义，避免联调反复返工。

## 2. 基础约定

- Base URL：`/v1`
- 数据格式：`application/json`
- 时间：Unix 毫秒时间戳（number）
- Trace：响应 header `X-Trace-Id`
- 幂等键：可选 `Idempotency-Key`

## 3. Agent Run API

### 3.1 创建 Run

- `POST /v1/agent/runs`

Request

```json
{
  "session_id": "chat_123",
  "user_input": "请给出实现方案",
  "model": "deepseek-v3",
  "options": {
    "max_steps": 8,
    "max_tool_calls": 5,
    "timeout_ms": 90000,
    "temperature": 0.2
  }
}
```

Response `201`

```json
{
  "run": {
    "id": "run_01J...",
    "session_id": "chat_123",
    "status": "queued",
    "model": "deepseek-v3",
    "created_at": 1762755000000,
    "updated_at": 1762755000000
  },
  "stream": {
    "events_url": "/v1/agent/runs/run_01J.../events"
  }
}
```

### 3.2 获取 Run

- `GET /v1/agent/runs/{run_id}`

### 3.3 取消 Run

- `POST /v1/agent/runs/{run_id}/cancel`

## 4. SSE 事件流

### 4.1 订阅

- `GET /v1/agent/runs/{run_id}/events`
- Header：`Accept: text/event-stream`

### 4.2 最小事件集合

- `run.queued`
- `run.started`
- `step.started`
- `tool.call.requested`
- `tool.call.completed`
- `message.delta`
- `message.completed`
- `step.completed`
- `run.succeeded`
- `run.failed`
- `run.cancelled`
- `heartbeat`

## 5. MCP API

### 5.1 工具目录

- `GET /v1/mcp/tools`

### 5.2 工具调用

- `POST /v1/mcp/tools/{tool_name}/invoke`

Request

```json
{
  "run_id": "run_01J...",
  "step_id": "step_02",
  "arguments": {
    "query": "Gin SSE best practice",
    "top_k": 5
  }
}
```

## 6. 错误响应规范

```json
{
  "error": {
    "code": "RUN_NOT_FOUND",
    "message": "run does not exist",
    "retryable": false,
    "details": null
  }
}
```

错误码（v0.1）：

- `INVALID_ARGUMENT`（400）
- `RUN_NOT_FOUND`（404）
- `TOOL_NOT_FOUND`（404）
- `CONFLICT_STATE`（409）
- `TOOL_TIMEOUT`（504）
- `TOOL_RETRY_EXHAUSTED`（500）
- `UPSTREAM_ERROR`（502）
- `INTERNAL_ERROR`（500）

## 7. 前端 Mock Adapter 合同

为支持并行开发，前端先使用本地 adapter，形状固定如下：

```ts
type AdapterResult = {
  summary: string;
  output?: unknown;
};

type AdapterContext = {
  run_id: string;
  session_id: string;
  step_id: string;
  input: string;
  attempt: number;
  timeout_ms: number;
};

interface AgentAdapter {
  invokeTool(ctx: AdapterContext): Promise<AdapterResult>;
}
```

约定：

- 超时由 runner 统一判定并映射为 `TOOL_TIMEOUT`。
- 普通异常映射为 `UPSTREAM_ERROR`（可重试）。
- 超过重试上限映射为 `TOOL_RETRY_EXHAUSTED`。

## 8. MVP 锁定范围

- 单 run、单 step、单工具调用。
- 不做并行工具调用。
- 不做持久化联调（仅约定字段）。
- 后端上线后只替换 adapter，不改状态机语义。
