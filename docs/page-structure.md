# 页面结构导览

本文面向初学者，按“页面装配 -> 消息流转 -> 弹窗交互 -> 导航跳转”的顺序理解项目。

## 1. 页面装配总览（路由 -> 外壳 -> 页面）

```mermaid
flowchart TD
    A["用户访问 URL"] --> B["Next.js 路由匹配"]
    B --> C["RootLayout（全局 Provider）"]
    C --> D["AppShell（aside + main）"]
    D --> E["Navbar（左侧会话管理）"]
    D --> F["main 内容区"]
    F --> G["/ -> 新建会话页"]
    F --> H["/chat/[chat_id] -> 聊天页"]
    F --> I["/sign-in/... -> 登录页"]
```

源码定位：
- `src/app/layout.tsx`：全局布局、主题与查询 Provider 装配。
- `src/components/AppShell.tsx`：两栏骨架（`Navbar + main`）与侧边栏折叠状态。
- `src/app/page.tsx`：首页输入后跳转 `/chat/new?...`。
- `src/app/chat/[chat_id]/page.tsx`：聊天主页面入口。
- `src/app/sign-in/[[...sign-in]]/page.tsx`：登录页面入口。

## 2. 消息发送时序（普通模式 / Agent 模式）

```mermaid
sequenceDiagram
    participant U as 用户
    participant IF as InputField
    participant P as ChatSession(page.tsx)
    participant UC as useChat
    participant TP as ChatTransport(adapter)
    participant API as /api/chat 或 OpenAI-compatible
    participant ML as MessageList
    participant LS as localStorage

    U->>IF: 输入并按 Enter
    IF->>P: onSubmit()
    P->>P: handleSubmit()

    alt Agent 关闭
        P->>UC: sendMessage({text}, {model})
    else Agent 开启
        P->>P: handleAgentSubmit(prompt)
        P->>P: executeAgentSearch()
        P->>P: enqueueAgentRequest()
        P->>UC: sendMessage(携带 Agent metadata)
    end

    UC->>TP: sendMessages()
    TP->>API: 发起流式请求
    API-->>UC: 流式 token 返回
    UC-->>P: 更新 messages/status
    P-->>ML: 渲染消息列表
    P->>LS: 持久化消息与草稿
```

源码定位：
- `src/app/components/InputField.tsx`：输入、提交与停止生成按钮。
- `src/app/chat/[chat_id]/page.tsx`：`handleSubmit`、`handleAgentSubmit`、`executeAgentSearch`、`enqueueAgentRequest`。
- `src/lib/chatProviderAdapter.ts`：根据配置选择 `server` 或 `openai-compatible` 传输层。
- `src/app/api/chat/route.ts`：服务端流式代理接口。
- `src/app/components/MessageList.tsx`：消息渲染（Markdown、代码块复制、反馈等）。
- `src/lib/chatMessageStorage.ts`：会话消息本地存储键与读写。

## 3. 设置弹窗时序（接口设置）

```mermaid
sequenceDiagram
    participant U as 用户
    participant H as ChatHeader
    participant P as ChatSession(page.tsx)
    participant M as ChatProviderSettingsModal
    participant A as chatProviderAdapter
    participant LS as localStorage

    U->>H: 点击“设置”
    H->>P: onOpenSettings()
    P->>P: setIsProviderSettingsOpen(true)
    P-->>M: 条件渲染弹窗
    U->>M: 修改配置并点击“保存”
    M->>M: handleSave() 本地校验
    M->>P: onSave(config)
    P->>P: handleSaveProviderConfig()
    P->>A: saveChatProviderConfig()
    A->>LS: 写入 deepscan:chat-provider:v1
    P->>P: setProviderConfig + 关闭弹窗
```

源码定位：
- `src/app/components/ChatHeader.tsx`：顶部“设置”按钮。
- `src/app/chat/[chat_id]/page.tsx`：`isProviderSettingsOpen` 与 `handleSaveProviderConfig`。
- `src/app/components/ChatProviderSettingsModal.tsx`：弹窗 UI 与表单保存逻辑。
- `src/lib/chatProviderAdapter.ts`：Provider 配置本地持久化与加载。

## 4. 导航跳转最小链路（历史会话）

```mermaid
sequenceDiagram
    participant U as 用户
    participant N as Navbar
    participant R as Next Router
    participant P as /chat/[chat_id]/page
    participant HS as HydratedChatSession
    participant LS as localStorage

    U->>N: 点击历史会话
    N->>R: router.push('/chat/{id}')
    R->>P: 注入路由参数 chat_id
    P->>HS: 渲染 HydratedChatSession
    HS->>LS: readStoredMessages(sessionId)
    HS-->>U: 恢复并展示消息
```

源码定位：
- `src/components/Navbar.tsx`：历史会话点击与列表操作（搜索、标签、批量）。
- `src/app/chat/[chat_id]/page.tsx`：解析 `chat_id`、生成 `sessionKey`、渲染 `HydratedChatSession`。
- `src/lib/chatStore.ts`：历史会话列表读写。
- `src/lib/chatMessageStorage.ts`：按会话存储消息。
