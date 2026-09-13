import poems from '../content/poems.json';
import festivals from '../content/festivals.json';
import achievements from '../content/achievements.json';
import StudyRecordCard from '../components/StudyRecordCard';

export default function CourtyardPage() {
  return (
    <div className="page">
      <div className="page-head"><h1>课间，去庭里走走。</h1><p>一张诗笺、一段小事，也有你慢慢点亮的书院。</p></div>
      <h2 className="section-title">今日一笺 · 诗与文房</h2>
      <div className="poem-grid">
        {poems.map((p) => (
          <article className="poem-card small" key={p.seal}>
            <span className="poem-seal">{p.seal} · {p.title}</span>
            <h3>{p.verse}</h3><small>{p.source}</small>
            <details><summary>笺注与掌故</summary>
              <p>{p.note}</p>
              <p><b>文房一物 · {p.object}</b>：{p.objectNote}</p>
              <p><b>{p.lore}</b>：{p.loreNote}</p>
            </details>
          </article>
        ))}
      </div>
      <h2 className="section-title">月令雅集 · 一年十二则</h2>
      <div className="festival-list">
        {festivals.map((f) => <div className="festival-row" key={f.name}><span>{f.season}</span><strong>{f.name}</strong><p>{f.scene}</p></div>)}
      </div>
      <h2 className="section-title">学阶成就</h2>
      <div className="badge-grid">
        {achievements.map((a) => <div className={`badge ${a.id === 'first' ? 'on' : ''}`} key={a.id}><span>{a.seal}</span><strong>{a.name}</strong><small>{a.description}</small></div>)}
      </div>
      <StudyRecordCard />
    </div>
  );
}
