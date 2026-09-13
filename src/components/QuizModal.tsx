import { useEffect, useMemo, useState } from 'react';
import { useSession } from '../store/session-store';
import { FULL_MODE_MAP } from '../quiz/modes';
import type { Question } from '../quiz/types';
import { speech } from '../lib/speech';

function Notes({ q }: { q: Question }) {
  const n = q.notes;
  if (!n) return null;
  const blocks: Array<[string, string | string[] | undefined]> = [
    ['知识点', n.knowledge], ['第一步怎么搭桥', n.bridge], ['大白话', n.plain], ['涉及概念', n.concept],
    ['解题策略', n.strategy], ['题型定位', n.locate], ['解析', n.explanation], ['易错点', n.pitfall], ['举一反三', n.transfer], ['入册备忘', n.notebook],
  ];
  const shown = blocks.filter(([, v]) => Array.isArray(v) ? v.length > 0 : Boolean(v));
  if (n.steps?.length) shown.splice(3, 0, ['分步推演', n.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')]);
  if (n.scoring?.length) shown.splice(4, 0, ['采分点', n.scoring.map((s) => `· ${s}`).join('\n')]);
  return (
    <dl className="q-notes">
      {shown.map(([label, v], i) => (
        <div className={i === 0 ? 'q-note q-note-first' : 'q-note'} key={label}>
          <dt>{label}</dt><dd>{String(v).split('\n').map((line, j) => <div key={j}>{line}</div>)}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChoiceBody({ q, answered, onPick }: { q: Question; answered: boolean; onPick: (i: number) => void }) {
  const session = useSession();
  const picked = answered ? Number(session.result!.response) : -1;
  return (
    <div className="q-options">
      {q.choices!.map((c, i) => {
        let cls = 'q-option';
        if (answered) {
          if (i === q.answer) cls += ' correct';
          else if (i === picked) cls += ' wrong';
        }
        return (
          <button key={i} className={cls} disabled={answered} onClick={() => onPick(i)}>
            <span className="q-option-key">{String.fromCharCode(65 + i)}</span>
            <span className="q-option-text" dangerouslySetInnerHTML={{ __html: c }} />
          </button>
        );
      })}
    </div>
  );
}

function InputBody({ q, answered }: { q: Question; answered: boolean }) {
  const [value, setValue] = useState('');
  const respond = useSession((s) => s.respond);
  return (
    <div className="q-input-wrap">
      <button className="speak-btn" onClick={() => speech.speak(q.speech || q.expected || '')}>🔊 播放发音</button>
      {q.hint && <div className="q-hint">{q.hint}</div>}
      <input
        className="q-input" autoComplete="off" autoCapitalize="off" spellCheck={false}
        placeholder="把听到的写在这里" value={value} disabled={answered}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim() && !answered) respond(value); }}
      />
      {!answered && <button className="primary-btn" disabled={!value.trim()} onClick={() => respond(value)}>落笔</button>}
    </div>
  );
}

function TokensBody({ q, answered }: { q: Question; answered: boolean }) {
  const respond = useSession((s) => s.respond);
  const [chosen, setChosen] = useState<number[]>([]);
  const labels = useMemo(() => q.tokens!.map((t) => t.label), [q]);
  const tap = (pos: number) => { if (answered) return; setChosen((c) => c.includes(pos) ? c.filter((x) => x !== pos) : [...c, pos]); };
  useEffect(() => { setChosen([]); }, [q.id]);
  return (
    <div className="q-tokens">
      <div className="q-token-line">
        {chosen.map((pos) => <button key={pos} className="token chosen" onClick={() => tap(pos)}>{labels[pos]}</button>)}
        {chosen.length === 0 && <span className="q-token-empty">按正确语序点选词块</span>}
      </div>
      <div className="q-token-pool">
        {labels.map((label, pos) => (
          <button key={pos} disabled={chosen.includes(pos) || answered} className="token" onClick={() => tap(pos)}>{label}</button>
        ))}
      </div>
      {!answered && <button className="primary-btn" disabled={chosen.length !== labels.length} onClick={() => respond(chosen.map((pos) => labels[pos]))}>成句</button>}
    </div>
  );
}

export default function QuizModal() {
  const { status, mode, queue, index, score, combo, bestCombo, lives, result, empty, next, quit, start } = useSession();
  const meta = mode ? FULL_MODE_MAP[mode] : null;

  if (status === 'idle') {
    if (!empty) return null;
    return (
      <div className="quiz-mask" role="dialog" aria-modal="true">
        <div className="quiz-dialog quiz-empty">
          <p>拾遗簿里暂时没有旧误。</p>
          <p className="muted">先去开一卷，真正答错的题会自己进来。</p>
          <button className="primary-btn" onClick={quit}>好</button>
        </div>
      </div>
    );
  }

  if (status === 'finished') {
    const total = index + 1;
    const rate = total ? Math.round((score / total) * 100) : 0;
    return (
      <div className="quiz-mask">
        <div className="quiz-dialog quiz-result">
          <div className="result-seal">{meta?.seal}</div>
          <h2>{meta?.title} · 收卷</h2>
          <div className="result-num"><strong>{score}</strong>/{total}<small>答对</small></div>
          <div className="result-sub">正确率 {rate}%　最佳连击 {bestCombo}{mode === 'endless' ? `　闯过 ${total} 关` : ''}</div>
          <div className="result-actions">
            <button className="primary-btn" onClick={() => start(mode!)}>再来一卷</button>
            <button className="ghost-btn" onClick={quit}>回到书院</button>
          </div>
        </div>
      </div>
    );
  }

  const q = queue[index];
  const answered = Boolean(result);
  return (
    <div className="quiz-mask">
      <div className="quiz-dialog">
        <header className="quiz-head">
          <span className={`quiz-seal tone-${meta?.tone}`}>{meta?.seal}</span>
          <div className="quiz-head-title"><small>{meta?.title}</small><strong>{q.eyebrow}</strong></div>
          <div className="quiz-head-right">
            {mode === 'endless' && <span className="lives">{'♥'.repeat(Math.max(0, lives))}<i>{'♡'.repeat(3 - Math.max(0, lives))}</i></span>}
            <span className="quiz-score">答对 {score}</span>
            <button className="quiz-close" onClick={quit} aria-label="交卷退出">×</button>
          </div>
        </header>
        <div className="quiz-progress"><i style={{ width: `${((index + (answered ? 1 : 0)) / queue.length) * 100}%` }} /></div>

        <div className="quiz-body">
          <div className="quiz-meta-line">
            <span>{index + 1} / {queue.length}</span>
            {combo >= 2 && <span className="combo">连击 ×{combo}</span>}
            {(q.kind === 'listen' || q.kind === 'listening' || q.kind === 'dictation') && (
              <button className="speak-btn small" onClick={() => speech.speak(q.speech || '', q.kind === 'listening' ? 'en-US' : 'en-US')}>🔊 再听一遍</button>
            )}
          </div>

          {q.passage && <article className="q-passage">{q.passage}</article>}
          <h3 className="q-prompt">{q.prompt}</h3>
          {q.subprompt && <div className="q-subprompt">{q.subprompt}</div>}
          {q.svg && <div className="q-svg" dangerouslySetInnerHTML={{ __html: q.svg }} />}

          {q.type === 'choice' && <ChoiceBody q={q} answered={answered} onPick={(i) => useSession.getState().respond(i)} />}
          {q.type === 'input' && <InputBody q={q} answered={answered} />}
          {q.type === 'tokens' && <TokensBody q={q} answered={answered} />}

          {answered && (
            <section className={`q-feedback ${result!.correct ? 'ok' : 'no'}`}>
              <div className="q-feedback-head">
                <strong>{result!.correct ? '落笔准确' : '先别急，看这一步'}</strong>
                <span>+{result!.points} 学识</span>
              </div>
              {q.type !== 'choice' && <p className="q-answer-line">正解：{q.expected || (typeof q.answer === 'number' ? q.choices?.[q.answer] : q.answer)}</p>}
              <p className="q-explain">{q.explanation}</p>
              <Notes q={q} />
              <button className="primary-btn next-btn" onClick={next}>
                {index + 1 >= queue.length || (mode === 'endless' && lives <= 0) ? '收卷看结果' : '下一题 →'}
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
