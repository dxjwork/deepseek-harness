# @deepseek-ai/dsh-desktop

DeepSeek Harness 的桌面启动端：一个轻量的 Electron 外壳，在子进程中启动
`dsh web` 配置，并在原生窗口中打开它所提供的浏览器 GUI。

外壳并不内嵌 harness。它启动与用户手动运行相同的 `dsh web` 命令，监听其
stdout 中的 `dsh web: http://127.0.0.1:<port>` 就绪行，再加载该 URL。harness
与窗口共享同一生命周期：关闭窗口会停止 harness，harness 崩溃会结束应用。
跨源链接交给系统浏览器打开；harness 的 `/api` 浏览器信任围栏本就接受回环地址，
因此外壳无需额外信任配置。

## 环境要求

- `PATH` 上存在 Node `^22.19 || >=24`（与 `dsh` 本身的要求一致——外壳用系统
  `node` 启动 harness）。
- 已构建的仓库：在仓库根目录执行 `pnpm run build`，产出前端 `dist` 以及
  harness 提供、外壳启动所需的 `dsh` CLI 产物。
- Electron 28+（外壳使用 ESM 主入口；声明版本为 `^37.2.0`）。

## 使用

```sh
pnpm run build                                        # 在仓库根目录
pnpm --filter @deepseek-ai/dsh-desktop run dev        # 打开原生窗口
```

窗口在 harness 的回环 URL 上打开。harness 使用操作系统分配的端口，因此并发启动
不会因 `EADDRINUSE` 冲突。

### 桌面快捷方式（Windows）

可以用内置脚本创建一个直接启动已构建外壳（不重新构建）的快捷方式：

```powershell
pwsh -ExecutionPolicy Bypass -File apps/desktop/scripts/create-shortcut.ps1
```

它会在桌面写入 `DeepSeek Harness.lnk`，目标为 `electron.exe`（工作目录指向
应用目录），图标使用 `assets/icon.ico`（DeepSeek Harness logo，由
`apps/web/public/favicon.svg` 生成）。

## 工作原理

- `src/harness.ts` 负责子进程：解析 `@deepseek-ai/dsh` 的 `lib/bin.js`，启动
  `node <bin> web --port 0`，解析就绪行，并提供按 SIGTERM → SIGKILL 递增的
  `stop()`。
- `src/main.ts` 负责窗口：在 `app.whenReady()` 时启动 harness，在就绪 URL 上
  打开一个 `BrowserWindow`，把外链转交给系统浏览器，并在退出前停止子进程。
- `tests/harness.spec.ts` 针对假子进程，固定了就绪行解析、固定参数列表、bin
  解析以及启动/停止生命周期。

## 已知限制与后续工作

- **暂无自包含安装包。** 尚未接入把 Node、构建后的 `dsh` 及其依赖打包成可分发
  安装包的 `electron-builder` 流程；外壳目前依赖 Node 与已构建的仓库。
- **暂无托盘、自动更新或单实例锁。** 外壳是单窗口；系统托盘常驻、更新投递与
  二次启动处理尚未实现。
- **暂无原生文件对话框。** 文件选择由 harness 自带的 directory-picker 行提供；
  尚未向渲染进程接入 Electron 的 `dialog` 桥。
