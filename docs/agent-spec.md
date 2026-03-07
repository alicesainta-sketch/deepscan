# Agent 规格说明（v0.1）

## 1. 目标

本文定义前端本地 Agent 内核（状态机 + adapter 执行循环）的最小可用规格，用于在后端 Gin 服务完成前并行开发与联调准备。

## 2. 状态机

### 2.1 Run 状态

- `idle`：初始化但未入队
- `queued`：已创建，等待执行
- `running`：执行中
- `succeeded`：执行成功
- `failed`：执行失败
- `cancelled`：用户取消

### 2.2 Step 状态

- `pending`
- `running`
- `succeeded`
- `failed`
- `skipped`

### 2.3 有效迁移

- Run：
  - `idle -> queued -> running -> succeeded|failed|cancelled`
- Step：
  - `pending -> running -> succeeded|failed`

## 3. 执行模型

- 当前版本仅支持单 run 单步骤工具调用（`tool_call`）。
- 执行循环：
  1. run 入队并进入 running
  2. step 进入 running
  3. 调用 adapter
  4. 成功：step succeeded -> run succeeded
  5. 失败：根据错误类型与重试预算决定重试或失败结束

## 4. 错误模型

- `TOOL_TIMEOUT`：工具调用超时
- `UPSTREAM_ERROR`：工具/上游调用失败
- `TOOL_RETRY_EXHAUSTED`：重试次数耗尽后失败
- `INVALID_STATE`：状态迁移非法

## 5. 重试策略

- 参数：`max_retries`（默认 0）
- 行为：
  - 当错误为可重试时（默认 `UPSTREAM_ERROR`）可重试
  - 当错误为 `TOOL_TIMEOUT` 且 `max_retries=0`，直接失败
  - 达到上限后返回 `TOOL_RETRY_EXHAUSTED`
- 退避：v0.1 固定短延迟（实现层可配置）

## 6. MVP 锁定范围

- 包含：
  - 纯前端状态机
  - mock adapter
  - 三组核心测试（成功/超时/重试失败）
- 不包含：
  - 真实后端联调
  - 多步骤/并行工具调用
  - 运行结果持久化
  - Agent UI 面板
  - MCP 多工具编排

## 7. 与后端联调的衔接

- 前端只依赖 adapter 接口。
- 后续切换到 Gin 后端时，仅替换 adapter 实现，不改状态机与测试用例语义。

## 8. Adapter 模式切换（v0.2）

- `mock`：本地演示模式，保留成功/超时/重试失败三条路径。
- `http`：联调模式，调用后端 `POST /v1/mcp/tools/{tool_name}/invoke`。

相关环境变量：

- `NEXT_PUBLIC_AGENT_ADAPTER=mock|http`
- `NEXT_PUBLIC_AGENT_API_BASE_URL`（http 模式必填）
- `NEXT_PUBLIC_AGENT_TOOL_NAME`（可选，默认 `deepscan.search`）

约束：

- 状态机语义不随 adapter 模式变化。
- 错误收敛仍由 runner 统一处理（`TOOL_TIMEOUT / UPSTREAM_ERROR / TOOL_RETRY_EXHAUSTED`）。
