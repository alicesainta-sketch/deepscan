# 故障排查

- **401 Unauthorized**：服务端模式下未登录或 Clerk 配置不完整。
- **Missing DEEPSEEK_API_KEY or BASE_URL**：服务端模式未配置环境变量。
- **CORS blocked**：直连模式时 API 未允许浏览器跨域；建议改用服务端代理。
- **无流式输出**：目标接口不支持流式 SSE，或未启用 `stream: true`。
- **空回复或报错**：检查 API Key 是否有效、模型名称是否正确。
