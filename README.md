# VibeCoding · 离线练耳 App（PWA）

一款**完全离线**运行的练耳应用，用吉他 / 钢琴音色训练你的耳朵。可安装到 Android / iOS / 桌面浏览器，无需联网即可使用。

> 依据《执行摘要.docx》需求实现：单音、音程、和弦、音阶/调式、和弦进行听辨；低延迟音频；错题重练；进度统计；离线安装。

---

## 功能一览

| 练习类型 | 说明 |
| --- | --- |
| 🎹 单音识别 | 听一个音，在钢琴键盘上点出音名 |
| 🎼 音程识别 | 判断两音之间的音程（纯四度、大三度…） |
| 🎸 和弦识别 | 判断和弦性质（大三/小三/减三/七和弦…），反馈带吉他指板图 |
| 🎵 音阶 / 调式 | 判断音阶（大调、小调、五声、教会调式…） |
| 🔁 和弦进行 | 判断 I-IV-V-I、ii-V-I 等罗马数字进行 |

**设置**：音色（钢琴 / 木吉他 / 电吉他）、难度（简单/中级/高级）、基准调、音名记法（升/降号）、每轮题数、BPM、自动播放。

**反馈与学习**：即时正误 + 正确示范 + 键盘/指板可视化 + 文字解析；错题本自动收录可重听；统计面板（正确率、连对、近 14 天练习量、历史记录）。

---

## 目录结构

```
vibecoding/
├── index.html                 # 应用外壳
├── package.json               # 依赖与脚本
├── vite.config.js             # 构建配置（相对路径 base，可部署到任意子目录）
├── src/
│   ├── main.js                # 入口 + Service Worker 注册
│   ├── ui.js                  # 界面与交互
│   ├── audio.js               # 音频引擎（SpessaSynth + SoundFont）
│   ├── theory.js              # 音乐理论（音名/音程/音阶/和弦/进行）
│   ├── questions.js           # 题库生成器
│   ├── storage.js             # 本地持久化（localStorage）
│   ├── viz.js                 # 钢琴键盘 / 吉他指板组件
│   └── styles.css             # 样式
├── public/
│   ├── soundfonts/GeneralUser_GS_v1.471.sf2   # 音源（31MB，含钢琴+吉他）
│   ├── spessasynth_processor.min.js           # AudioWorklet 合成器处理器
│   ├── manifest.webmanifest   # PWA 清单
│   ├── sw.js                  # Service Worker（离线缓存）
│   └── icons/                 # 应用图标
├── screenshots/               # 界面截图
└── dist/                      # 构建产物（npm run build 后生成）
```

---

## 部署安装（三种方式，任选其一）

### 方式 A：本机 / 局域网快速运行（最简单，无需公网）

需要已安装 [Node.js](https://nodejs.org)（≥18）。

```bash
cd vibecoding
npm install        # 首次安装依赖
npm run dev        # 开发模式，终端会打印地址（默认 http://localhost:5173）
```

生产模式（推荐给最终使用）：

```bash
cd vibecoding
npm install
npm run build      # 生成 dist/ 目录
npm run preview    # 本地预览，默认 http://localhost:4173
```

手机与电脑连同一 WiFi 时，也可把 `dist/` 用任意静态服务器挂到局域网，例如：

```bash
cd vibecoding/dist
python3 -m http.server 8080    # 然后手机浏览器访问 http://<电脑IP>:8080
```

### 方式 B：安装到手机（PWA，离线使用）

**Android（Chrome 浏览器）**：
1. 用 Chrome 打开上面任意方式部署出的网址。
2. 地址栏会弹出「安装应用 / Add to Home screen」提示，点击安装；或点右上角菜单 →「安装应用」。
3. 安装后从桌面图标启动，**断网也能用**。

**iPhone / iPad（Safari 浏览器）**：
1. 用 Safari 打开网址。
2. 点底部「分享」按钮 → 滑到「**添加到主屏幕**」→ 点「添加」。
3. 从主屏图标启动即为独立 App，支持离线。

> 提示：PWA 需要 **HTTPS**（或 `localhost`）才能注册 Service Worker。局域网 IP（HTTP）下 Chrome 允许 localhost，但对局域网 IP 一般也要求 HTTPS。想完整离线，请用方式 C 部署到支持 HTTPS 的托管平台，或在本地用 `localhost`。

### 方式 C：部署到公网（免费静态托管，最省心）

构建后 `dist/` 就是完整网站，可拖到任意静态托管：

- **GitHub Pages**：把 `dist/` 内容推到 `gh-pages` 分支即可（已用相对路径，子目录也能跑）。
- **Netlify**：拖拽 `dist/` 文件夹到 <https://app.netlify.com/drop>，秒上线，自动 HTTPS。
- **Vercel**：`vercel --prod`，框架选「Other」，构建命令 `npm run build`，输出目录 `dist`。
- **Nginx / 任意服务器**：把 `dist/` 内容拷到网站根目录即可（纯静态，无后端）。

部署后把网址发到手机上，按「方式 B」安装成 App。

---

## 音源与第三方库（开源许可）

| 资源 | 用途 | 许可 |
| --- | --- | --- |
| [GeneralUser GS v1.471](http://www.schristiancollins.com) | SoundFont 音色库（钢琴 + 木/电吉他等） | 免费使用/分发，见 `public/soundfonts/GeneralUser_GS_LICENSE.txt` |
| [SpessaSynth](https://github.com/spessasus/spessasynth_lib) | 浏览器端 SF2 合成引擎 | Apache-2.0，见 `public/SPESSASYNTH_LICENSE.txt` |

音源文件内置在应用包内，**首次加载后完全离线**，无任何网络请求。

---

## 常见问题

- **首次打开会短暂加载（约 30MB 音色库）**：仅第一次需要联网，之后离线秒开。
- **没有声音**：请确认手机未静音；首次点击「练习」时浏览器需用户手势，会自动初始化音频。
- **更新后离线失效**：`sw.js` 顶部 `CACHE` 版本号需递增（如 `vibe-v1` → `vibe-v2`），再重新构建部署。

## 技术栈

Vite + 原生 JavaScript（ESM）+ SpessaSynth（AudioWorklet 低延迟合成）+ Service Worker（离线）+ localStorage（进度/错题）。无后端、无框架、无运行时网络依赖。
