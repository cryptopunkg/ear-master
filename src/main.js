// main.js — 入口
import './ui.js';

// 注册 Service Worker（PWA 离线支持）
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* 忽略注册失败（如 file:// 或不受支持环境） */
    });
  });

  // 首次安装后刷新一次，确保构建产物（带哈希的 JS/CSS）被缓存，从而真正离线可用。
  // 每个会话只刷新一次；已安装过的应用不会触发（SW 从一开始就接管）。
  let swReloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (swReloaded || sessionStorage.getItem('vibe-sw-reloaded')) return;
    sessionStorage.setItem('vibe-sw-reloaded', '1');
    swReloaded = true;
    window.location.reload();
  });
}
