import { useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from '../store/session-store';
import { FULL_MODE_MAP } from '../quiz/modes';
import type { Question } from '../quiz/types';
import { speech } from '../lib/speech';
import { useUi } from '../store/ui-store';
import { gradeSolve, type SolveResult } from '../quiz/solve-grade';
import { loadSettings } from '../lib/ai-client';
import { aiGrade, type GradeResult } from '../lib/grade-client';

const MATH_KEYPAD_SYMBOLS = ['√', 'π', '²', '/', '−', '°'];

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

function BlankBody({ q, answered }: { q: Question; answered: boolean }) {
  const [value, setValue] = useState('');
  const respond = useSession((s) => s.respond);
  const isBlank = q.type === 'blank';
  return (
    <div className="q-input-wrap">
      {q.hint && <div className="q-hint">{q.hint}</div>}
      <input
        className="q-input" autoComplete="off" autoCapitalize="off" spellCheck={false}
        placeholder={isBlank ? '在横线上填写答案' : '把听到的写在这里'} value={value} disabled={answered}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && value.trim() && !answered) respond(value); }}
      />
      {!answered && <button className="primary-btn" disabled={!value.trim()} onClick={() => respond(value)}>落笔</button>}
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

function SolveBody({ q, answered }: { q: Question; answered: boolean }) {
  const solveData = q.solve;
  const respond = useSession((s) => s.respond);
  const sessionResult = useSession((s) => s.result);

  const steps = useMemo(() => solveData?.steps ?? [], [solveData]);
  const [responses, setResponses] = useState<string[]>(() => steps.map(() => ''));
  const [hintsUsed, setHintsUsed] = useState<boolean[]>(() => steps.map(() => false));
  const [showSolution, setShowSolution] = useState(false);
  const [showAiGrade, setShowAiGrade] = useState(false);
  const [workText, setWorkText] = useState('');
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<GradeResult | null>(null);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setResponses(steps.map(() => ''));
    setHintsUsed(steps.map(() => false));
    setShowSolution(false);
    setShowAiGrade(false);
    setWorkText('');
    setGrading(false);
    setGradeResult(null);
  }, [q.id, steps]);

  if (!solveData || steps.length === 0) return null;

  const currentResponses = answered && Array.isArray(sessionResult?.response)
    ? (sessionResult.response as string[])
    : responses;

  const solveResult: SolveResult | null = answered
    ? (sessionResult?.solve ?? gradeSolve(q, currentResponses, hintsUsed))
    : null;

  const hasAtLeastOneInput = responses.some((r) => r.trim().length > 0);

  const handleInputChange = (idx: number, val: string) => {
    if (answered) return;
    setResponses((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleUseHint = (idx: number) => {
    if (answered) return;
    setHintsUsed((prev) => {
      const next = [...prev];
      next[idx] = true;
      return next;
    });
  };

  const handleInsertSymbol = (stepIdx: number, symbol: string) => {
    if (answered) return;
    const input = inputRefs.current[stepIdx];
    const prevText = responses[stepIdx] || '';
    if (!input) {
      handleInputChange(stepIdx, prevText + symbol);
      return;
    }
    const start = input.selectionStart ?? prevText.length;
    const end = input.selectionEnd ?? prevText.length;
    const nextText = prevText.slice(0, start) + symbol + prevText.slice(end);
    handleInputChange(stepIdx, nextText);
    requestAnimationFrame(() => {
      input.focus();
      input.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  };

  const handleSubmit = () => {
    if (answered || !hasAtLeastOneInput) return;
    respond(responses, { hintsUsed });
  };

  const handleStartAiGrade = async () => {
    if (grading || !workText.trim() || !solveData) return;
    setGrading(true);
    try {
      const settings = loadSettings();
      const res = await aiGrade(settings, {
        prompt: q.prompt,
        solution: solveData.solution,
        rubric: solveData.rubric,
        work: workText.trim(),
      });
      setGradeResult(res);
    } catch {
      // aiGrade 内部兜底 fallback localGrade
    } finally {
      setGrading(false);
    }
  };

  return (
    <div className="q-solve-root">
      {answered && solveResult && (
        <div className="q-solve-score-banner">
          <div className="q-solve-score-title">解答得分</div>
          <div className="q-solve-score-num">
            <strong>{solveResult.got}</strong> / {solveResult.total}
            <span className="q-solve-score-unit">分</span>
          </div>
          <div className="q-solve-score-desc">
            {solveResult.full ? '满分通关，推演严谨！' : `共 ${steps.length} 步，查看下方采分点与每步解析`}
          </div>
        </div>
      )}

      <div className="q-solve-steps">
        {steps.map((step, idx) => {
          const stepRes = solveResult?.steps[idx];
          const isHinted = hintsUsed[idx] || Boolean(stepRes?.hinted);
          const maxScore = step.score;
          const halfScore = Math.floor(maxScore / 2);

          let cardStatusCls = '';
          if (answered && stepRes) {
            cardStatusCls = stepRes.correct ? ' q-solve-step-ok' : ' q-solve-step-no';
          }

          return (
            <div key={idx} className={`q-solve-card${cardStatusCls}`}>
              <div className="q-solve-card-head">
                <span className="q-solve-step-tag">步骤 {idx + 1}</span>
                <span className="q-solve-step-ask">{step.ask}</span>
                <span className={`q-solve-badge ${isHinted ? 'hinted' : ''}`}>
                  {isHinted ? `最多 ${halfScore} 分` : `${maxScore} 分`}
                </span>
              </div>

              <div className="q-solve-input-row">
                <div className="q-solve-input-field">
                  <input
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    className="q-input q-solve-input"
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="在此填写该步答案"
                    value={currentResponses[idx] || ''}
                    disabled={answered}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && hasAtLeastOneInput && !answered) {
                        handleSubmit();
                      }
                    }}
                  />
                  {step.unit && <span className="q-solve-unit">{step.unit}</span>}
                </div>

                {!answered && (
                  <button
                    type="button"
                    className={`q-solve-hint-btn ${isHinted ? 'active' : ''}`}
                    onClick={() => handleUseHint(idx)}
                    title={isHinted ? '已看提示（得分减半）' : '查看提示（本步得分最多折半）'}
                  >
                    {isHinted ? '已看提示' : '提示'}
                  </button>
                )}
              </div>

              {!answered && (
                <div className="q-solve-keypad">
                  {MATH_KEYPAD_SYMBOLS.map((sym) => (
                    <button
                      key={sym}
                      type="button"
                      tabIndex={-1}
                      className="q-solve-key"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleInsertSymbol(idx, sym)}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              )}

              {isHinted && !answered && (
                <div className="q-solve-hint-box">
                  <span className="q-solve-hint-label">提示：</span>
                  {step.hint}
                </div>
              )}

              {answered && stepRes && (
                <div className="q-solve-step-result">
                  <div className="q-solve-step-status-line">
                    <span className={`q-solve-mark ${stepRes.correct ? 'ok' : 'no'}`}>
                      {stepRes.correct ? '✓ 正确' : '✗ 错误'}
                    </span>
                    <span className="q-solve-got-score">
                      得分: <strong>{stepRes.got}</strong> / {stepRes.max} 分
                      {stepRes.hinted && <small className="q-solve-hinted-tag">（已看提示）</small>}
                    </span>
                  </div>
                  <div className="q-solve-step-ans">
                    正解：<strong>{step.accepts[0]}{step.unit || ''}</strong>
                  </div>
                  {step.explain && (
                    <div className="q-solve-step-explain">
                      解析：{step.explain}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {!answered && (
        <button
          type="button"
          className="primary-btn q-solve-submit-btn"
          disabled={!hasAtLeastOneInput}
          onClick={handleSubmit}
        >
          交卷
        </button>
      )}

      {answered && (
        <div className="q-solve-post-section">
          {solveData.pitfall && (
            <div className="q-solve-pitfall-box">
              <strong>易错点警示：</strong>
              <span>{solveData.pitfall}</span>
            </div>
          )}

          <div className="q-solve-fold">
            <button
              type="button"
              className="q-solve-fold-toggle"
              onClick={() => setShowSolution((prev) => !prev)}
            >
              <span>{showSolution ? '收起标准解答' : '展开标准解答全过程'}</span>
              <i>{showSolution ? '▲' : '▼'}</i>
            </button>
            {showSolution && (
              <div className="q-solve-fold-content">
                <ol className="q-solve-solution-list">
                  {solveData.solution.map((line, sIdx) => (
                    <li key={sIdx}>{line}</li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <div className="q-solve-fold">
            <button
              type="button"
              className="q-solve-fold-toggle"
              onClick={() => setShowAiGrade((prev) => !prev)}
            >
              <span>{showAiGrade ? '收起过程批改' : '过程书写批改（可选）'}</span>
              <i>{showAiGrade ? '▲' : '▼'}</i>
            </button>
            {showAiGrade && (
              <div className="q-solve-fold-content q-solve-review-panel">
                <div className="q-solve-review-tip">
                  把你在草稿纸或卷子上的完整书写过程输入下方，念安会逐条按中高考阅卷采分点进行批改：
                </div>
                <div className="q-solve-textarea-wrap">
                  <textarea
                    className="q-solve-work-textarea"
                    placeholder="在此输入完整的推导证明或演算过程（限 1500 字）..."
                    maxLength={1500}
                    rows={6}
                    value={workText}
                    onChange={(e) => setWorkText(e.target.value.slice(0, 1500))}
                  />
                  <div className="q-solve-char-count">{workText.length} / 1500</div>
                </div>

                <button
                  type="button"
                  className="primary-btn q-solve-grade-btn"
                  disabled={grading || !workText.trim()}
                  onClick={handleStartAiGrade}
                >
                  {grading ? '念安批改中...' : '请念安批改'}
                </button>

                {gradeResult && (
                  <div className="q-solve-grade-result">
                    <div className="q-solve-grade-header">
                      <strong>采分批改报告</strong>
                      {gradeResult.offline && <span className="q-solve-offline-tag">离线批改</span>}
                    </div>

                    <div className="q-solve-grade-total">
                      过程采记得分：<strong>{gradeResult.total}</strong> / {gradeResult.max} 分
                    </div>

                    {gradeResult.summary && (
                      <div className="q-solve-grade-summary">
                        总评：{gradeResult.summary}
                      </div>
                    )}

                    <div className="q-solve-rubric-list">
                      {gradeResult.points.map((pt, pIdx) => (
                        <div key={pIdx} className="q-solve-rubric-item">
                          <div className="q-solve-rubric-item-head">
                            <span className="q-solve-rubric-name">{pt.point}</span>
                            <span className="q-solve-rubric-score">
                              {pt.score} / {pt.max} 分
                            </span>
                          </div>
                          {pt.comment && (
                            <div className="q-solve-rubric-comment">{pt.comment}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function QuizModal() {
  const { status, mode, queue, index, score, combo, bestCombo, lives, result, empty, emptyMode, next, quit, start } = useSession();
  const openChat = useUi((s) => s.openChat);
  const meta = mode ? FULL_MODE_MAP[mode] : null;

  if (status === 'idle') {
    if (!empty) return null;
    return (
      <div className="quiz-mask" role="dialog" aria-modal="true">
        <div className="quiz-dialog quiz-empty">
          {emptyMode === 'scan-bank' ? (
            <>
              <p>「我的卷子」还是空的。</p>
              <p className="muted">去练习页点「扫卷入库」，拍一张真题卷子就开练。</p>
            </>
          ) : (
            <>
              <p>拾遗簿里暂时没有旧误。</p>
              <p className="muted">先去开一卷，真正答错的题会自己进来。</p>
            </>
          )}
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
          {(q.type === 'input' || q.type === 'blank') && <BlankBody q={q} answered={answered} />}
          {q.type === 'tokens' && <TokensBody q={q} answered={answered} />}
          {q.type === 'solve' && <SolveBody q={q} answered={answered} />}

          {answered && (
            <section className={`q-feedback ${result!.correct ? 'ok' : 'no'}`}>
              <div className="q-feedback-head">
                <strong>{result!.correct ? '落笔准确' : '先别急，看这一步'}</strong>
                <span>+{result!.points} 学识</span>
              </div>
              {(q.type === 'input' || q.type === 'blank' || q.type === 'tokens') && (
                <p className="q-answer-line">
                  正解：{q.expected || (Array.isArray(q.answer) ? q.answer.join(' 或 ') : typeof q.answer === 'number' ? q.choices?.[q.answer] : q.answer)}
                </p>
              )}
              <p className="q-explain">{q.explanation}</p>
              <button className="ask-nian" onClick={() => openChat({ prompt: q.passage ? `${q.passage}\n题目：${q.prompt}` : q.prompt, topic: q.skill || q.eyebrow, skill: q.skill, explanation: q.explanation })}>让念安换个讲法</button>
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
