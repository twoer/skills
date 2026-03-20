# net-proxy

网络代理辅助工具。自动检测系统代理，注入到 npm/pnpm install 命令中。

## 命令

- `/net-proxy:setup` — 一键配置 Hook（首次使用必须执行）
- `/net-proxy:proxy` — 查看当前代理状态
- `/net-proxy:proxy test` — 测试代理连通性
- `/net-proxy:install [args...]` — 用代理执行 npm/pnpm install
