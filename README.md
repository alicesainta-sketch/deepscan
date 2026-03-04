# DeepScan

一个基于 Next.js 的 AI 对话项目，聚焦本地会话管理、模型切换与可扩展聊天体验。

## 快速导航

- [快速开始](#快速开始)
- [测试与校验](#测试与校验)
- [CI 检查](#ci-检查)
- [项目结构](#项目结构)
- [按目标阅读文档](#按目标阅读文档)
- [许可证](#许可证)

## 展示快照

![show](display/show.png)

## 快速开始

```bash
pnpm install
pnpm dev
pnpm build
pnpm start
```

默认地址：`http://localhost:3000`

## 测试与校验

```bash
pnpm test
pnpm lint
pnpm type-check
```

## CI 检查

- Workflow 文件：[`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- 触发条件：`push` 到 `main`、`pull_request` 到 `main`
- 执行项：
  - `pnpm run lint`
  - `pnpm run type-check`
  - `pnpm run test`
  - `pnpm run build`

## 项目结构

- `src/app`：页面路由与 API 路由
- `src/components`：全局壳层组件（如导航栏、主题）
- `src/app/components`：聊天页业务组件（消息列表、输入框、弹窗等）
- `src/lib`：核心逻辑与状态管理（会话存储、Provider 适配、搜索等）
- `src/types`：领域类型定义
- `docs`：详细文档（架构、配置、页面结构、功能清单）

## 按目标阅读文档

### 首次使用（先跑通）

1. [配置说明](docs/configuration.md)
2. [页面结构导览](docs/page-structure.md)
3. [故障排查](docs/troubleshooting.md)

### 二次开发（先理解再扩展）

1. [架构与存储设计](docs/architecture.md)
2. [功能清单与展示](docs/features.md)
3. [路线图与计划](docs/roadmap.md)

### 文档索引（按主题直达）

- [页面结构导览](docs/page-structure.md)
- [功能清单与展示](docs/features.md)
- [架构与存储设计](docs/architecture.md)
- [配置说明](docs/configuration.md)
- [路线图与计划](docs/roadmap.md)
- [故障排查](docs/troubleshooting.md)

## 许可证

MIT
