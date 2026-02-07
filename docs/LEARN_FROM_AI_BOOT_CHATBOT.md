# 从 ai-boot-chatbot 组件可借鉴的点（对比 deepscan）

参考仓库：[kudlar/ai-boot-chatbot](https://github.com/kudlar/ai-boot-chatbot) — `src/app/components`

---

## 1. 组件结构对比

| 组件 | ai-boot-chatbot | deepscan（当前） |
|------|------------------|-------------------|
| **ChatInterface** | 单页容器：手写 fetch + ReadableStream、localStorage 持久化、AbortController 停止、清空会话 | 无独立容器，逻辑在 `chat/[chat_id]/page.tsx`，用 useChat + 服务端/DB 持久化 |
| **MessageList** | ReactMarkdown + Prism 代码高亮、时间戳（5 分钟间隔）、首条显示 "AI"/"Me"、代码块一键复制 | 纯文本展示，无 Markdown/代码高亮/复制 |
| **InputField** | 独立组件：Enter 发送（Shift+Enter 换行）、加载时显示「Stop」按钮 | 内联 form + textarea，无 Stop、Enter 行为未区分 |
| **ErrorDisplay** | 独立组件：红色边框 + 文案 | 内联 `error.message` |
| **LoadingIndicator** | 独立组件：「Typing...」+ 三点动画 | 无 |

---

## 2. 可借鉴的交互与实现

### 2.1 MessageList（优先）

- **Markdown 渲染**：助手消息用 `react-markdown` 渲染，代码块用 `react-syntax-highlighter`（如 `vscDarkPlus`）。
- **代码块复制**：每个代码块旁提供「Copy」按钮，`navigator.clipboard.writeText`。
- **时间戳**：按间隔（如 5 分钟）显示时间，避免每条都显示。
- **首条身份标签**：同一角色连续多条时，只在第一条旁显示 "AI" / "Me"（或「助手」/「我」）。

注意：deepscan 使用 useChat，消息格式为 `{ id, role, parts }`，需从 `parts` 里取 `text` 再交给 Markdown；ai-boot-chatbot 是 `{ role, content, timestamp }`，需做一层适配。

### 2.2 InputField

- **Enter 发送、Shift+Enter 换行**：在 `onKeyDown` 里判断 `e.key === 'Enter' && !e.shiftKey` 则 `handleSubmit`，否则默认换行。
- **加载时显示「停止」**：当 `status === 'streaming'`（或 `isLoading`）时显示 Stop 按钮，调用 useChat 的 `stop()`。

### 2.3 ErrorDisplay

- 抽成独立组件，接收 `error: Error | string`，统一样式（红框/红字），可带「关闭」或「重试」回调（按需）。

### 2.4 LoadingIndicator

- 独立组件，展示「正在输入…」+ 三点或简单动画，在 `status === 'streaming'` 时显示在消息列表底部或输入框上方。

---

## 3. 不必照搬的部分

- **ChatInterface 的 localStorage**：deepscan 已有服务端会话（create-chat / get-chats）和 useChat 的 `id: chatId`，无需再用 localStorage 存历史。
- **手写 fetch + ReadableStream**：继续用 useChat + `toUIMessageStreamResponse()` 即可，流式由 SDK 处理。
- **AbortController 自己管理**：useChat 提供 `stop()`，直接用它即可。

---

## 4. 小结：建议落地顺序

1. **MessageList**：用 `react-markdown` + `react-syntax-highlighter` 渲染助手消息，并加代码块复制、可选时间戳/身份标签（适配 useChat 的 `messages`）。
2. **InputField**：抽成组件，Enter 发送、Shift+Enter 换行，加载时显示 Stop 并调用 `stop()`。
3. **ErrorDisplay**：抽成组件，统一错误样式。
4. **LoadingIndicator**：抽成组件，在流式输出时显示。

上述组件已按 deepscan 的 useChat 与现有样式在项目中实现：

- `src/app/components/ErrorDisplay.tsx` — 错误展示，支持 `onDismiss`
- `src/app/components/LoadingIndicator.tsx` — 「正在输入」+ 三点动画
- `src/app/components/InputField.tsx` — Enter 发送、Shift+Enter 换行、加载时「停止」按钮
- `src/app/components/MessageList.tsx` — 消息列表：助手消息已用 `react-markdown` + `remark-gfm` 渲染；代码块用 `react-syntax-highlighter`（Prism + vscDarkPlus）+ 悬停「复制」按钮；用户消息仍为纯文本
- `chat/[chat_id]/page.tsx` 已改为使用上述组件及 `ChatHeader`，并接入 `status` / `stop` / `clearError`
