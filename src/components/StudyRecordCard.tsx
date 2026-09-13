import { useRef, useState } from 'react';
import { useProgress } from '../store/progress-store';
import { exportBackup, importBackup } from '../lib/backup';
import { loadTheme, applyTheme, type Theme } from '../lib/theme';

export default function StudyRecordCard() {
  const p = useProgress();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const [theme, setTheme] = useState<Theme>(loadTheme());

  const onFile = async (file?: File) => {
    if (!file) return;
    try {
      const s = await importBackup(file);
      setMsg(`已导入：${s.arcadeV1.attempts} 次作答、连课 ${s.streak} 天`);
    } catch {
      setMsg('文件认不出，确认是念安学录备份');
    }
  };

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next); applyTheme(next);
  };

  return (
    <section className="record-card">
      <h2 className="section-title" style={{ marginTop: 8 }}>学录与外观</h2>
      <div className="record-stats">
        <div><strong>{p.arcadeV1.attempts}</strong><span>累计作答</span></div>
        <div><strong>{p.arcadeV1.correct}</strong><span>答对</span></div>
        <div><strong>{p.streak}</strong><span>连课(天)</span></div>
        <div><strong>{p.xp}</strong><span>学识</span></div>
      </div>
      <div className="record-actions">
        <button className="ghost-btn" onClick={exportBackup}>导 出 学 录</button>
        <button className="ghost-btn" onClick={() => fileRef.current?.click()}>导 入 学 录</button>
        <button className="ghost-btn" onClick={toggleTheme}>{theme === 'dark' ? '切回白昼' : '夜读模式'}</button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {msg && <p className="record-msg">{msg}</p>}
      <p className="record-tip">学录只存在本机浏览器；导出 JSON 可换设备或留底，也支持导入旧版学录。</p>
    </section>
  );
}
