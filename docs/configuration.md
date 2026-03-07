# 配置说明

## 当前版本配置（默认模式）

当前版本仍使用 Next.js 内置 `/api/chat` 作为服务端代理。

环境变量：
- `DEEPSEEK_API_KEY`：模型 API Key
- `BASE_URL`：OpenAI-compatible 接口地址（例如 `https://api.deepseek.com/v1`）
- `NEXT_PUBLIC_AGENT_ADAPTER`：Agent adapter 模式（`mock` 或 `http`，默认 `mock`）
- `NEXT_PUBLIC_AGENT_API_BASE_URL`：当 `NEXT_PUBLIC_AGENT_ADAPTER=http` 时使用的后端地址
- `NEXT_PUBLIC_AGENT_TOOL_NAME`：HTTP 模式下默认工具名（默认 `deepscan.search`）

注意：
- 前端不直接暴露模型 Key。
- 当前不依赖登录即可运行。
- Agent 面板联调前至少配置 `NEXT_PUBLIC_AGENT_ADAPTER=http` 与 `NEXT_PUBLIC_AGENT_API_BASE_URL`。

## 规划中的分离后端配置（Go Gin）

完成后端分离后，配置会分为两层。

### 前端（Next.js）

- `NEXT_PUBLIC_API_BASE_URL`：Gin 服务地址（例如 `https://api.example.com`）。

### 后端（Gin）

- `MODEL_PROVIDER`：模型供应商标识（如 deepseek/openai-compatible）。
- `MODEL_BASE_URL`：模型网关地址。
- `MODEL_API_KEY`：模型 API Key。
- `DB_DSN`：数据库连接串。
- `JWT_SECRET`（如启用登录）：鉴权签名密钥。
- `MCP_CONFIG_PATH`（MCP 阶段）：MCP 工具配置路径。

## 迁移建议

1. 先新增 Gin 服务并对齐接口，再替换前端请求基址。  
2. 会话与消息链路先迁移到 DB，再关闭本地写入。  
3. Agent 与 MCP 在后端稳定后逐步放量。
