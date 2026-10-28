# Termux 开发与 PWA 更新

网页和已安装的 PWA 继续使用原来的 4173 地址。保留安装时的主机名：`localhost` 和 `127.0.0.1` 属于不同来源，不要互换。

## 克克预览版：模型与思考设置更新（2026-10-28）

已核实手机目录为 `~/my_st_termux/conflux`，本地分支 `keke-theme-preview`，起点 `4fd2c49`。本功能远端分支为 `feat/keke-profile-model-effort`，以该起点继续开发，保留全部现有主题提交。

**Git 窗口只更新源码**，保留本地分支名：

```bash
cd ~/my_st_termux/conflux &&
git fetch origin feat/keke-profile-model-effort &&
git merge --ff-only FETCH_HEAD
```

**Vite 窗口单独运行服务**。原服务还在运行时，更新源码后由 Vite 热更新，刷新页面即可；只有原服务已停时才在 Vite 窗口执行：

```bash
cd ~/my_st_termux/conflux &&
npm run termux:dev
```

不在 Git 窗口启动第二个服务，不需要切换到 `feat/conflux-bottom-navigation`。`--ff-only` 若提示分叉会停止，不执行强制重置。

## 其他早期分支的更新说明


首次切换到六入口开发分支：

1. 回到原来挂着 Conflux 的 Termux 窗口，按 Ctrl+C，等命令提示符出现。
2. 先查看本地状态：

```bash
git -C ~/my_st_termux/conflux status --short --branch
```

如果出现 `M`、`A`、`D` 或 `??` 等本地修改/新文件，**先停下保留这些改动**，不要强制切分支或清理目录。需要先确认哪些属于正在编辑的 UI。
3. 如果工作区干净，而且还在旧的 `feat/conflux-shell-pwa` 分支，依次执行：

```bash
cd ~/my_st_termux/conflux
git fetch origin feat/conflux-bottom-navigation
git switch --track -c feat/conflux-bottom-navigation origin/feat/conflux-bottom-navigation
npm run termux:dev
```

旧 PWA 分支与六入口分支已分叉，**不能**使用 `git merge --ff-only FETCH_HEAD` 从旧分支直接升级；也不要用强制重置覆盖手机上的工作。

如果本地已经存在 `feat/conflux-bottom-navigation`，工作区干净时改用：

```bash
git switch feat/conflux-bottom-navigation
git pull --ff-only origin feat/conflux-bottom-navigation
npm run termux:dev
```

4. 看到“开发服务已启动”后，刷新原网页；从系统最近任务划掉 PWA，再点原图标打开。此后界面修改通过 Vite 热更新。Termux 服务需要保持运行；修改本地服务本身后，仍需 Ctrl+C 再运行 `npm run termux:dev`。

出现“新服务未启动：4173 已有服务在运行”，说明原服务还没停。回到占用端口的 Conflux 窗口按 Ctrl+C；不要换端口或反复新开服务。

旧 PWA 仍显示缓存时，在安装时相同来源打开 `/__conflux_dev` 一次，例如原来源是 `http://127.0.0.1:4173` 就打开 `http://127.0.0.1:4173/__conflux_dev`。此入口只注销该来源根作用域的离线 worker，不清除聊天数据库、设置或缓存内容，然后回到实时开发页面。随后重新打开 PWA。

生产页面现在会在恢复到前台时检查 worker 更新，覆盖“点图标只是恢复旧窗口、没有触发页面加载”的情况。切到开发服务时，更新后的 worker 会接管实时页面；普通静态发布仍保留原来的完整资源缓存和等待所有旧窗口关闭后激活的规则。

排查服务模式可运行 `curl -sS --max-time 5 http://127.0.0.1:4173/api/health`；`development` 是实时开发服务，`pwa` 是构建后的静态服务，后者不会随着源码编辑更新。

验证范围：隔离 Chromium 中，旧离线 shell 切换到同来源开发服务、两个窗口接管和重新打开已通过，localStorage 与 IndexedDB 测试记录保留。前台恢复信号在 headless 浏览器中模拟；worker 更新与页面接管实际运行。端口占用时，实际 npm 启动命令明确失败并保留原服务。用户已安装的 Android PWA 仍需手机实际确认。

## 2026-10-29 克克底部与语音输入

- 两套克克主题恢复独立附件圆钮、细长纸张输入框与右侧圆钮；输入框内的重复颜文字入口移除，上方颜文字功能保留。装饰线回到输入框下方，模型和思考强度保持紧凑，六个导航入口采用等宽的上图标、下文字布局，与输入区使用相同的纸张底色和左右边距。
- 话筒固定在输入框内部右侧，爱心发送键独立保留在框外右侧，两者同时显示。点击话筒开始浏览器语音识别，再点结束。最终识别文本写入当前草稿，可编辑后用外侧发送键发送；临时识别片段只显示在状态区，不自动发送。生成中发送键仍可停止生成，话筒暂时禁用。
- 权限拒绝、网络失败及浏览器不支持时显示具体提示。切换对话、离开聊天或页面隐藏时取消识别并忽略旧结果。接口按浏览器 Web Speech API 提供，不新增语音供应商或密钥配置；浏览器识别服务可能需要联网，详见 https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition 。
- 验证：`npm run build` 通过；隔离 Chromium 中检查 390×844 下贴纸/波点主题，输入框、圆钮、装饰线、模型行和六项导航依次排列且无横向溢出，附件浮层可打开。模拟识别覆盖临时/最终文本、结束后恢复发送、切换对话取消并隔离迟到结果、权限拒绝及重试。未调用模型服务或真实麦克风，Android 真机识别服务仍需实机确认。

## 2026-10-29 输入区与六项导航适配

- 六项导航高度统一为 56px（另加系统底部安全区），使用 22px 图标与 11px 标签。输入区和导航共用左右边距，宽屏内容限制在 720px，纸张背景连续铺满。
- 输入框与外侧附件、发送按钮统一为 44px；话筒仍在输入框内。多行输入最高 120px，外侧按钮靠底部对齐；模型和思考仍紧挨着。
- 底部安全区由导航统一预留，移除输入区重复的底部留白。键盘打开时沿用隐藏导航的行为，收起装饰线，保留输入和模型操作。
- 验证：构建通过；隔离 Chromium 检查两套主题的 320/390/430/768px 宽度、长文本、附件浮层及模拟键盘状态。Android 真机软键盘和安全区效果尚未实机验收。

## 2026-10-29 聊天模型选择器

- 点击输入框下方的模型名直接打开当前 API 返回的模型列表，移除“跟随线路”选项；支持按模型 ID/名称搜索和手动刷新。API 设置中已拉取的列表继续共用。
- 页面刷新清空临时列表后，首次打开选择器自动重新拉取；加载、失败和重试都有明确状态。选择具体模型写入当前角色的 modelOverride，继续由原有请求绑定解析使用。未改连接路由、请求发送或持久化实现。
- 验证：构建及既有模型控件测试通过；隔离 Chromium 使用模拟模型接口检查拉取、搜索、选择后的请求绑定、页面刷新后的选中值与重新拉取、缓存复用、关闭及失败重试。未请求真实付费模型接口。
