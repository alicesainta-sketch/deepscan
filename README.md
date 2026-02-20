# DeepScan

一个使用 Next.js + Vercel AI SDK 构建的简洁聊天应用，支持 DeepSeek 模型、消息流式传输、Markdown/代码高亮、聊天历史与数据库存储。项目对未配置认证做了安全回退，适合新手练习与部署。

## 功能

- 聊天与流式输出：后端使用 AI SDK `streamText` 输出 UI 消息流，前端使用 `useChat` 接收（src/app/api/chat/route.ts）
- 模型切换：支持在 deepseek-v3 与 deepseek-r1 间一键切换（src/app/page.tsx）
- Markdown 与代码高亮、复制按钮（src/app/components/MessageList.tsx）
- 聊天历史：创建聊天并在侧栏展示历史，点击进入对应会话（src/app/api/create-chat/route.ts、src/app/api/get-chats/route.ts、src/components/Navibar.tsx）
- 认证中间件：可选启用 Clerk 保护，未配置发布密钥时自动回退以保证构建通过（src/app/layout.tsx、src/proxy.ts）

## 技术栈

- Next.js 16（App Router，Turbopack）
- Vercel AI SDK：`@ai-sdk/react`、`@ai-sdk/openai-compatible`、`@ai-sdk/ui-utils`
- 数据库：Drizzle ORM + Postgres
- 样式：Tailwind CSS v4，部分组件使用 MUI/Emotion
- 状态：@tanstack/react-query

## 目录结构

```
src/
  app/
    api/
      chat/route.ts           # 聊天流式接口（DeepSeek）
      create-chat/route.ts    # 新建聊天
      get-chats/route.ts      # 获取聊天列表
    chat/[chat_id]/page.tsx   # 聊天页面
    components/               # UI 组件（消息渲染、输入、头部等）
    layout.tsx                # 根布局（含 Clerk 回退）
    page.tsx                  # 首页（新建对话）
  components/
    Navibar.tsx               # 侧栏（聊天列表）
    QueryClientProvider.tsx   # React Query Provider
  db/
    schema.ts                 # Drizzle 表结构
index.ts                      # 数据库操作（增删查）
proxy.ts                      # Clerk 中间件配置
```

## 环境变量

- 必需
  - `DEEPSEEK_API_KEY`：DeepSeek 的 API Key（OpenAI 兼容）
  - `BASE_URL`：DeepSeek/OpenAI 兼容的 Base URL
  - `DATABASE_URL`：Postgres 连接串
- 可选（启用登录与保护）
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`：Clerk Publishable Key
  - `CLERK_SECRET_KEY`：Clerk Secret Key

未设置 Clerk 变量时，前端会自动回退，避免构建失败；如需保护路由与登录，请配置上述两个变量并在 `proxy.ts` 中开启中间件。

## 本地运行

```bash
pnpm install
pnpm dev
# 生产构建
pnpm run build
pnpm start
```

默认地址：localhost:3000

## 使用说明

- 首页输入聊天标题，选择模型后创建会话，自动跳转聊天页（src/app/page.tsx）
- 聊天页输入消息并发送，支持 Shift+Enter 换行；侧栏可切换历史会话（src/app/chat/[chat_id]/page.tsx）
- 代码块支持高亮与一键复制（src/app/components/MessageList.tsx）

## 注意事项

- 兼容性：`@ai-sdk/ui-utils` 对 `zod@^3.23.8` 有 peer 依赖，建议安装 zod v3 以消除警告
- 样式体系：Tailwind 与 MUI/Emotion并存，按需使用避免体积膨胀
- 环境校验：建议在部署平台配置必需环境变量，避免 runtime 报错

## 许可证

MIT
