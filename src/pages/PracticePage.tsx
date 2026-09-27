import { useEffect, useState } from 'react';
import { MODES, PRESET_MODES, MATH_TOPIC_MODES, SCAN_MODE, ENGLISH_FILL_MODES } from '../quiz/modes';
import { useProgress } from '../store/progress-store';
import { pendingMistakeIds } from '../lib/progress';
import { useSession } from '../store/session-store';
import { loadScanBank } from '../lib/scan-bank';
import ScanModal from '../components/ScanModal';

function useScanBankCount(): number {
  const [count, setCount] = useState(() => loadScanBank().length);
  useEffect(() => {
    const sync = () => setCount(loadScanBank().length);
    window.addEventListener('scan-bank-change', sync);
    return () => window.removeEventListener('scan-bank-change', sync);
  }, []);
  return count;
}

export default function PracticePage() {
  const start = useSession((s) => s.start);
  const mistakes = pendingMistakeIds(useProgress()).length;
  const bankCount = useScanBankCount();
  const [scanOpen, setScanOpen] = useState(false);
  const card = (m: typeof MODES[number]) => (
    <button key={m.id} className="mode-card" onClick={() => start(m.id)}>
      <span className={`mode-seal tone-${m.tone}`}>{m.seal}</span>
      <strong>{m.title}</strong>
      <small>{m.id === 'mistakes' && mistakes ? `${mistakes} 条待理 · ` : ''}{m.note}</small>
      <span className="mode-count">{m.id === 'endless' ? '∞' : m.id === 'scan-bank' ? `${bankCount} 题` : m.count + ' 题'}</span>
    </button>
  );
  return (
    <div className="page">
      <div className="page-head"><h1>挑一馆，开始练。</h1><p>听、写、算、读；从基础温习到一卷小测。</p></div>
      <h2 className="section-title">日常十二馆</h2>
      <div className="mode-grid">{MODES.map(card)}</div>
      <h2 className="section-title">英语考纲专项 · 语法填空与完成句子</h2>
      <div className="mode-grid">{ENGLISH_FILL_MODES.map(card)}</div>
      <h2 className="section-title">数学考点专项 · 考纲全覆盖</h2>
      <div className="mode-grid">{MATH_TOPIC_MODES.map(card)}</div>
      <h2 className="section-title">精编卷 · 七步讲透</h2>
      <div className="mode-grid">{PRESET_MODES.map(card)}</div>
      <h2 className="section-title">我的卷子 · 拍下真题就入库</h2>
      <div className="mode-grid">
        {card(SCAN_MODE)}
        <button className="mode-card scan-entry" onClick={() => setScanOpen(true)}>
          <span className="mode-seal tone-night">摄</span>
          <strong>扫卷入库</strong>
          <small>拍照或选图，自动认出题目；校对后存进「我的卷子」</small>
          <span className="mode-count">去拍照</span>
        </button>
      </div>
      {scanOpen && <ScanModal onClose={() => setScanOpen(false)} />}
    </div>
  );
}
