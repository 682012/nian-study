import { useState } from 'react';
import atlas from '../content/atlas.json';

const SUBJECTS = [
  { id: 'math', name: '算学馆 · 数学' },
  { id: 'english', name: '译语馆 · 英语' },
  { id: 'chinese', name: '经史馆 · 语文' },
] as const;

export default function LibraryPage() {
  const [subject, setSubject] = useState<'math' | 'english' | 'chinese'>('math');
  const modules = atlas.filter((a) => a.subject === subject);
  return (
    <div className="page">
      <div className="page-head"><h1>先弄懂，再落笔。</h1><p>知识点、例题和解题方法，都放在这里。</p></div>
      <div className="subject-tabs">
        {SUBJECTS.map((s) => <button key={s.id} className={subject === s.id ? 'active' : ''} onClick={() => setSubject(s.id)}>{s.name}</button>)}
      </div>
      <div className="atlas-list">
        {modules.map((m) => (
          <article className="atlas-card" key={m.id}>
            <div className="atlas-head"><span className="task-seal tone-gold">{m.seal}</span><div><strong>{m.title}</strong><small className={`prio prio-${m.priority}`}>{m.priority}</small></div></div>
            <p>{m.summary}</p>
            <div className="atlas-points">{m.points.map((pt) => <span key={pt}>{pt}</span>)}</div>
            <div className="atlas-method"><b>例：</b>{m.example}<br /><b>法：</b>{m.method}<br /><b>目标：</b>{m.target}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
