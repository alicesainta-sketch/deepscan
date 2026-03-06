# 配置说明

## 默认模式（服务端 `/api/chat`）

当前版本仅保留服务端代理模式，前端不会暴露模型 Key。

环境变量：
- `DEEPSEEK_API_KEY`：模型 API Key
- `BASE_URL`：OpenAI-compatible 接口地址（例如 `https://api.deepseek.com/v1`）

注意：
- `/api/chat` 会直接使用服务端环境变量请求上游模型。
- 当前默认模式不依赖登录，可开箱即用。
- 生产环境建议在网关层补充限流、审计与访问控制。
