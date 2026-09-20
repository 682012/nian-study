import { useEffect, useRef, useState } from 'react';
import { fileToCompressedDataUrl, makeThumbDataUrl } from '../lib/image-fit';
import { ScanError, scanPaperImage } from '../lib/scan-client';
import {
  clearScanBank, exportBankJson, loadScanBank, loadShots, removeScanQuestion, removeShot, saveScanQuestions, saveShot,
} from '../lib/scan-bank';
import type { ScannedQ } from '../quiz/scan-parse';
import { useSession } from '../store/session-store';

const SUBJECT_LABEL: Record<string, string> = { english: '英语', math: '数学', chinese: '语文' };
const HINTS: Array<[string, string]> = [['', '自动判断'], ['english', '英语卷'], ['math', '数学卷'], ['chinese', '语文卷']];

type Phase = 'pick' | 'scanning' | 'review' | 'done' | 'manage';

export default function ScanModal({ onClose }: { onClose: () => void }) {
  const [phase, setPhase] = useState<Phase>('pick');
  const [hint, setHint] = useState('');
  const [items, setItems] = useState<ScannedQ[]>([]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [keepImage, setKeepImage] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(0);
  const [bank, setBank] = useState<ScannedQ[]>(() => loadScanBank());
  const [shots, setShots] = useState(() => loadShots());
  const [preview, setPreview] = useState<string>('');
  const imageRef = useRef<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => { setBank(loadScanBank()); setShots(loadShots()); };
    window.addEventListener('scan-bank-change', sync);
    return () => window.removeEventListener('scan-bank-change', sync);
  }, []);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    setPhase('scanning');
    try {
      const image = await fileToCompressedDataUrl(file);
      imageRef.current = image;
      const qs = await scanPaperImage(image, hint);
      setItems(qs);
      setChecked(qs.map(() => true));
      setPhase('review');
    } catch (e) {
      setError(e instanceof ScanError ? e.message : '识别失败，再试一次');
      setPhase('pick');
    }
  };

  const patch = (i: number, next: Partial<ScannedQ>) => {
    setItems((prev) => prev.map((q, j) => (j === i ? { ...q, ...next } : q)));
  };

  const save = async () => {
    const chosen = items.filter((_, i) => checked[i]);
    const { added: n } = saveScanQuestions(chosen);
    setAdded(n);
    // 留档：缩略图 always（几 KB）；原图按开关（占空间，最多随 12 条记录淘汰）
    const thumb = await makeThumbDataUrl(imageRef.current);
    if (thumb) {
      saveShot({
        id: `shot-${Date.now()}`,
        at: Date.now(),
        count: chosen.length,
        source: chosen[0]?.source || '',
        thumb,
        image: keepImage ? imageRef.current : undefined,
      });
    }
    setBank(loadScanBank());
    setShots(loadShots());
    setPhase('done');
  };

  const startPractice = () => {
    onClose();
    useSession.getState().start('scan-bank');
  };

  const exportJson = () => {
    const blob = new Blob([exportBankJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `我的卷子-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  return (
    <div className="quiz-mask" role="dialog" aria-modal="true">
      <div className="quiz-dialog scan-dialog">
        <header className="quiz-head">
          <span className="quiz-seal tone-night">卷</span>
          <div className="quiz-head-title"><small>我的卷子</small><strong>拍下真题，导进来练</strong></div>
          <div className="quiz-head-right">
            <button className="quiz-close" onClick={onClose} aria-label="关闭">×</button>
          </div>
        </header>

        <div className="scan-body">
          {phase === 'pick' && (
            <>
              <p className="scan-tip">对着卷子拍清楚一点（光线足、不反光、边框全）。数学公式按卷面原样识别，识别后你可以逐题校对再入库。</p>
              <label className="scan-hint-row">科目提示
                <select value={hint} onChange={(e) => setHint(e.target.value)}>
                  {HINTS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                </select>
              </label>
              <input
                ref={fileRef} type="file" accept="image/*" capture="environment" className="scan-file"
                onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ''; }}
              />
              {error && <p className="scan-error">{error}</p>}
              <div className="scan-actions">
                <button className="ghost-btn" onClick={() => setPhase('manage')}>管理已有 {bank.length} 题 · {shots.length} 卷</button>
              </div>
            </>
          )}

          {phase === 'scanning' && (
            <div className="scan-scanning">
              <div className="scan-spinner" />
              <p>正在读卷……大题小题一起认，约需十几秒。</p>
              <button className="ghost-btn" onClick={() => setPhase('pick')}>取消</button>
            </div>
          )}

          {phase === 'review' && (
            <>
              <p className="scan-tip">认出 {items.length} 题。校对一下再入库——答案下标、填空答案都可以改。</p>
              <label className="scan-keep">
                <input type="checkbox" checked={keepImage} onChange={(e) => setKeepImage(e.target.checked)} />
                同时留下这张卷子的原图（占空间；不留也只存一小张缩略图供回看）
              </label>
              <div className="scan-list">
                {items.map((q, i) => (
                  <article className="scan-item" key={q.id}>
                    <div className="scan-item-head">
                      <label className="scan-check">
                        <input type="checkbox" checked={checked[i]} onChange={(e) => setChecked((c) => c.map((v, j) => (j === i ? e.target.checked : v)))} />
                        第 {i + 1} 题
                      </label>
                      <select value={q.subject} onChange={(e) => patch(i, { subject: e.target.value as ScannedQ['subject'] })}>
                        {Object.entries(SUBJECT_LABEL).map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                      </select>
                      <select value={q.type} onChange={(e) => patch(i, { type: e.target.value as ScannedQ['type'] })}>
                        <option value="choice">四选一</option>
                        <option value="blank">填空</option>
                      </select>
                      <button className="scan-del" onClick={() => { setItems((prev) => prev.filter((_, j) => j !== i)); setChecked((c) => c.filter((_, j) => j !== i)); }}>删</button>
                    </div>
                    <textarea className="scan-prompt" value={q.prompt} onChange={(e) => patch(i, { prompt: e.target.value })} rows={2} />
                    {q.type === 'choice' ? (
                      <div className="scan-choices">
                        {(q.choices ?? []).map((c, ci) => (
                          <div className="scan-choice-row" key={ci}>
                            <label className="scan-radio">
                              <input type="radio" name={`ans-${q.id}`} checked={q.answer === ci} onChange={() => patch(i, { answer: ci })} />
                              {String.fromCharCode(65 + ci)}
                            </label>
                            <input className="scan-choice-input" value={c} onChange={(e) => patch(i, { choices: (q.choices ?? []).map((old, oj) => (oj === ci ? e.target.value : old)) })} />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <input
                        className="scan-accepts" placeholder="可接受答案，用逗号分隔" value={(q.answer as string[]).join('，')}
                        onChange={(e) => patch(i, { answer: e.target.value.split(/[，,]/).map((s) => s.trim()).filter(Boolean) })}
                      />
                    )}
                    <div className="scan-item-foot">
                      <input className="scan-source" placeholder="出处（如 2023 年真题）" value={q.source} onChange={(e) => patch(i, { source: e.target.value })} />
                      <input className="scan-explain" placeholder="一句话解析" value={q.explanation} onChange={(e) => patch(i, { explanation: e.target.value })} />
                    </div>
                  </article>
                ))}
              </div>
              <div className="scan-actions">
                <button className="primary-btn" disabled={!checked.some(Boolean)} onClick={() => void save()}>入库 {checked.filter(Boolean).length} 题</button>
                <button className="ghost-btn" onClick={() => setPhase('pick')}>再拍一张</button>
              </div>
            </>
          )}

          {phase === 'done' && (
            <div className="scan-done">
              <p>已存入 <strong>{added}</strong> 题，「我的卷子」现在共 {bank.length} 题。</p>
              <p className="scan-tip">这一卷的缩略图已留在「管理题库」里，随时回看；题目存在本机，换设备用导出备份。</p>
              <div className="scan-actions">
                <button className="primary-btn" onClick={startPractice}>去练习</button>
                <button className="ghost-btn" onClick={() => setPhase('pick')}>再拍一张</button>
                <button className="ghost-btn" onClick={() => setPhase('manage')}>管理题库</button>
              </div>
            </div>
          )}

          {phase === 'manage' && (
            <>
              {shots.length > 0 && (
                <>
                  <p className="scan-tip">最近拍的卷子（缩略图本机保留，点图看原图）</p>
                  <div className="scan-shots">
                    {[...shots].reverse().map((s) => (
                      <div className="scan-shot" key={s.id}>
                        <button className="scan-shot-thumb" onClick={() => setPreview(s.image || s.thumb)} title="看大图">
                          <img src={s.thumb} alt={`卷子 ${s.count} 题`} />
                        </button>
                        <div className="scan-shot-meta">
                          <span>{new Date(s.at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })} · {s.count} 题</span>
                          <span className="muted">{s.source || '未注明出处'}{s.image ? ' · 有原图' : ''}</span>
                        </div>
                        <button className="scan-del" onClick={() => removeShot(s.id)}>删</button>
                      </div>
                    ))}
                  </div>
                </>
              )}
              <p className="scan-tip">已导入 {bank.length} 题（上限 300，超出会淘汰最旧的）。</p>
              <div className="scan-list">
                {bank.map((q) => (
                  <article className="scan-item scan-item-slim" key={q.id}>
                    <div className="scan-item-head">
                      <span className="scan-tag">{SUBJECT_LABEL[q.subject]} · {q.type === 'choice' ? '四选一' : '填空'}</span>
                      <span className="scan-tag muted">{q.source || '未注明出处'}</span>
                      <button className="scan-del" onClick={() => removeScanQuestion(q.id)}>删</button>
                    </div>
                    <div className="scan-item-prompt">{q.prompt}</div>
                  </article>
                ))}
                {!bank.length && <p className="muted">还是空的，去拍一张卷子吧。</p>}
              </div>
              <div className="scan-actions">
                <button className="ghost-btn" onClick={exportJson} disabled={!bank.length}>导出题库 JSON</button>
                <button className="ghost-btn" onClick={() => setPhase('pick')}>返回</button>
                {bank.length > 0 && <button className="ghost-btn" onClick={() => { if (confirm('清空后不能恢复，确定吗？')) clearScanBank(); }}>清空题库</button>}
              </div>
            </>
          )}

          {preview && (
            <div className="scan-preview" onClick={() => setPreview('')}>
              <img src={preview} alt="卷子原图" />
              <span className="scan-preview-close">点任意处关闭</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
