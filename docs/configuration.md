# 配置说明

## 方式 A：服务端模式（默认 `/api/chat`）

适合需要隐藏 Key、做限流或审计的场景。

环境变量：
- `DEEPSEEK_API_KEY`：模型 API Key
- `BASE_URL`：OpenAI-compatible 接口地址（例如 `https://api.deepseek.com/v1`）
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY`：若启用登录

注意：
- `/api/chat` 会要求已登录用户；未登录会返回 401。
- 如不需要登录，可移除 `ClerkProvider` 与中间件保护逻辑。

## 方式 B：前端直连（OpenAI Compatible）

适合纯前端本地运行。

操作：
1. 进入聊天页右上角“设置”。
2. 选择“直连（OpenAI Compatible）”。
3. 填写 `API 地址` 与 `API Key`（Header 名称与前缀可自定义）。
4. 可选填写系统提示词（System Prompt）。

要求：
- 目标 API 支持 `chat/completions` 的 SSE 流式输出。
- 需开启 CORS，否则浏览器会拦截请求。
