import { MODES, PRESET_MODES } from '../quiz/modes';
import { useProgress } from '../store/progress-store';
import { useSession } from '../store/session-store';

export default function PracticePage() {
  const start = useSession((s) => s.start);
  const mistakes = Object.keys(useProgress((p) => p.arcadeV1.mistakes)).length;
  const card = (m: typeof MODES[number]) => (
    <button key={m.id} className="mode-card" onClick={() => start(m.id)}>
      <span className={`mode-seal tone-${m.tone}`}>{m.seal}</span>
      <strong>{m.title}</strong>
      <small>{m.id === 'mistakes' && mistakes ? `${mistakes} 条待理 · ` : ''}{m.note}</small>
      <span className="mode-count">{m.id === 'endless' ? '∞' : m.count} 题</span>
    </button>
  );
  return (
    <div className="page">
      <div className="page-head"><h1>挑一馆，开始练。</h1><p>听、写、算、读；从基础温习到一卷小测。</p></div>
      <h2 className="section-title">日常十二馆</h2>
      <div className="mode-grid">{MODES.map(card)}</div>
      <h2 className="section-title">精编卷 · 七步讲透</h2>
      <div className="mode-grid">{PRESET_MODES.map(card)}</div>
    </div>
  );
}
