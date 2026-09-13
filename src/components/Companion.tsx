import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../store/progress-store';
import { subjectStats, dueWordCount } from '../lib/progress';
import { nianRespond, type Snapshot } from '../lib/nian-local';
import type { Subject } from '../quiz/types';

const MOOD_IMG: Record<string, string> = {
  idle: 'idle', welcome: 'welcome', teaching: 'teaching', thinking: 'thinking',
  correct: 'correct', celebrate: 'celebrate', break: 'break', tease: 'tease', invite: 'invite',
};

interface Msg { role: 'user' | 'nian'; text: string; mood?: string }

export default function Companion({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = useProgress();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState('welcome');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: 'nian', text: '来了？先做第一小卷，今天走多远等做完再定。想问什么，直接说。', mood: 'welcome' }]);
    }
  }, [open]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);

  if (!open) return null;

  const snapshot = (): Snapshot => {
    const stats: Record<Subject, ReturnType<typeof subjectStats>> = {
      english: subjectStats(p, 'english'), math: subjectStats(p, 'math'), chinese: subjectStats(p, 'chinese'),
    };
    const weakest = (['english', 'math', 'chinese'] as Subject[])
      .sort((a, b) => stats[a].rate - stats[b].rate || stats[a].attempts - stats[b].attempts)[0];
    return {
      hour: new Date().getHours(), streak: p.streak, todayAttempts: p.today.attempts,
      dueWords: dueWordCount(p), totalMistakes: Object.keys(p.arcadeV1.mistakes).length,
      weakestSubject: weakest, weakestRate: stats[weakest].rate, bestCombo: p.arcadeV1.bestCombo,
    };
  };

  const send = () => {
    const text = input.trim();
    if (!text || busy) return;
    setBusy(true);
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    // 轻微延迟模拟“想一下”，也给云 AI 接入留同一个位置
    setTimeout(() => {
      const r = nianRespond(text, snapshot());
      setMood(r.mood);
      setMessages((m) => [...m, { role: 'nian', text: r.reply, mood: r.mood }]);
      setBusy(false);
    }, 260);
  };

  return (
    <div className="chat-mask">
      <div className="chat-dialog">
        <header className="chat-head">
          <img src={`/assets/nian-song/${MOOD_IMG[mood] || 'idle'}.webp`} alt="" className="chat-avatar" />
          <div><strong>林念安</strong><small>同窗在席 · 本地应答</small></div>
          <button className="quiz-close" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="chat-body" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble-row ${m.role}`}>
              {m.role === 'nian' && <img src={`/assets/nian-song/${MOOD_IMG[m.mood || mood] || 'idle'}.webp`} className="bubble-avatar" alt="" />}
              <div className="bubble">{m.text}</div>
            </div>
          ))}
          {busy && <div className="bubble-row nian"><div className="bubble typing"><i /><i /><i /></div></div>}
        </div>
        <footer className="chat-input">
          <input
            value={input} placeholder="累了、想先学什么、哪道题不会……"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="primary-btn" onClick={send} disabled={!input.trim() || busy}>说</button>
        </footer>
      </div>
    </div>
  );
}
