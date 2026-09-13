import { useMemo } from 'react';
import { useProgress } from '../store/progress-store';
import { useSession } from '../store/session-store';
import { dueWordCount } from '../lib/progress';
import { hash } from '../quiz/rng';
import poems from '../content/poems.json';

function greeting() {
  const h = new Date().getHours();
  if (h < 6) return '夜深了，只收一处旧误就去睡。';
  if (h < 11) return '晨光正好，先用十张词笺把脑子叫醒。';
  if (h < 14) return '午后容易浮，做一小卷把心神收回来。';
  if (h < 18) return '灯还亮着，把今天最薄的一处补上。';
  return '晚间适合温故，旧误比新题更值时辰。';
}

export default function TodayPage({ onChat }: { onChat: () => void }) {
  const p = useProgress();
  const start = useSession((s) => s.start);
  const due = dueWordCount(p);
  const mistakes = Object.keys(p.arcadeV1.mistakes).length;
  const poem = useMemo(() => poems[hash(new Date().toISOString().slice(0, 10)) % poems.length], []);
  const tasks = [
    { seal: '译', title: '译语馆 · 重点词', sub: `真实 822 词笺 · 已答对 ${p.today.english} 词`, n: p.today.english, total: 30, mode: 'listen', tone: 'jade' },
    { seal: '算', title: '算学馆 · 题型训练', sub: '七步拆题 · 题型方法与易错坑', n: p.today.math, total: 3, mode: 'math', tone: 'gold' },
    { seal: '文', title: '经史馆 · 语文一题', sub: '语言基础 · 古诗文 · 阅读 · 应用文', n: p.today.chinese, total: 1, mode: 'chinese', tone: 'rose' },
    { seal: '拾', title: '拾遗簿 · 温故', sub: mistakes ? `${mistakes} 条旧误待理` : '当前没有旧误待理', n: mistakes, total: 5, mode: 'mistakes', tone: 'ember' },
  ];

  return (
    <div className="page">
      <div className="page-head"><h1>灯已点好，翻开今天这一页。</h1><p>先完成一件小事。剩下的，我们一课一课来。</p></div>

      <section className="nian-card">
        <div className="nian-scene">
          <div className="nian-scene-info"><span className="online"><i />林念安已在案前</span><p>{greeting()}</p></div>
          <img className="nian-img" src="/assets/nian-song/welcome.webp" alt="林念安" />
        </div>
        <div className="nian-actions">
          <button className="primary-btn" onClick={() => start('daily')}>今日二十题</button>
          <button className="ghost-btn" onClick={() => start('adaptive')}>开私塾</button>
          <button className="ghost-btn" onClick={onChat}>和念安说话</button>
        </div>
      </section>

      <section className="stat-strip">
        <div><strong>{p.streak}</strong><span>连课(天)</span></div>
        <div><strong>{due}</strong><span>到期词笺</span></div>
        <div><strong>{mistakes}</strong><span>待理旧误</span></div>
        <div><strong>{p.arcadeV1.bestCombo}</strong><span>最佳连击</span></div>
      </section>

      <section className="lesson-card">
        <div className="lesson-head"><span>今日课帖</span><strong>今日课业</strong><span className="lesson-pct">{Math.round(Math.min(1, (p.today.english / 30 + p.today.math / 3 + p.today.chinese) / 3) * 100)}%</span></div>
        {tasks.map((t) => (
          <button className="task-row" key={t.title} onClick={() => start(t.mode)}>
            <span className={`task-seal tone-${t.tone}`}>{t.seal}</span>
            <span className="task-text"><strong>{t.title}</strong><small>{t.sub}</small></span>
            <span className="task-n">{t.n}<i>/{t.total}</i></span>
          </button>
        ))}
        <button className="primary-btn wide" onClick={() => start('daily')}>续今日课业 →</button>
      </section>

      <section className="poem-card">
        <span className="poem-seal">今日一笺 · {poem.seal}</span>
        <h3>{poem.verse}</h3>
        <small>{poem.source}</small>
        <p>{poem.note}</p>
      </section>

      <footer className="page-foot">清晖书院 · 林念安陪学计划<br />学识从真实作答而来，入院本身不记功。</footer>
    </div>
  );
}
