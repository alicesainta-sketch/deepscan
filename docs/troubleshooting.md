# 故障排查

- **Missing DEEPSEEK_API_KEY or BASE_URL**：服务端模式未配置环境变量。
- **Upstream model request failed**：上游模型接口不可达、Key 无效或网关返回异常。
- **无流式输出**：目标接口不支持流式 SSE，或上游未启用 `stream: true`。
- **空回复或报错**：检查 API Key 是否有效、模型名称是否正确。
