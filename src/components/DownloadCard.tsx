export default function DownloadCard() {
  return (
    <section className="download-card">
      <h2 className="section-title">装在手机上</h2>
      <div className="record-actions">
        <a className="ghost-btn" href="/downloads/nian-study-android-v1.1.0.apk" download>下载 Android 应用</a>
        <button
          className="ghost-btn"
          onClick={() => alert('在浏览器菜单里选择「添加到主屏幕」，就能像 App 一样全屏使用。')}
        >安装网页应用</button>
      </div>
      <p className="record-tip">应用是远程网页壳：装上后自动使用最新版，学习记录存在本机浏览器。</p>
    </section>
  );
}
