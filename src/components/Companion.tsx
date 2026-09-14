import { useEffect, useMemo, useRef, useState } from 'react';
import { useProgress } from '../store/progress-store';
import { useUi, type ChatContext } from '../store/ui-store';
import { subjectStats, dueWordCount, pendingMistakeIds } from '../lib/progress';
import { nianRespond, type Snapshot } from '../lib/nian-local';
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, streamNian, type AiSettings, type ChatTurn,
} from '../lib/ai-client';
import SettingsModal from './SettingsModal';
import type { Subject } from '../quiz/types';

const MOOD_IMG: Record<string, string> = {
  idle: 'idle', welcome: 'welcome', teaching: 'teaching', thinking: 'thinking',
  correct: 'correct', celebrate: 'celebrate', break: 'break', tease: 'tease', invite: 'invite',
};
interface Msg { role: 'user' | 'nian'; text: string; mood?: string; cloud?: boolean; streaming?: boolean }

export default function Companion() {
  const { chatOpen, chatContext, closeChat } = useUi();
  const p = useProgress();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [mood, setMood] = useState('welcome');
  const [busy, setBusy] = useState(false);
  const [settings, setSettings] = useState<AiSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contextHandled = useRef<string | null>(null);

  useEffect(() => { setSettings(loadSettings()); }, [chatOpen]);
  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      setMessages([{ role: 'nian', text: '来了？先做第一小卷，今天走多远等做完再定。哪道题卡住，直接发我。', mood: 'welcome' }]);
    }
  }, [chatOpen]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);

  // 从错题反馈“问念安”进来：带题目上下文自动提问
  useEffect(() => {
    if (chatOpen && chatContext && contextHandled.current !== chatContext.prompt) {
      contextHandled.current = chatContext.prompt;
      void ask(chatContext.prompt, chatContext);
    }
  }, [chatOpen, chatContext]);

  const snapshot = useMemo((): Snapshot => {
    const stats: Record<Subject, ReturnType<typeof subjectStats>> = {
      english: subjectStats(p, 'english'), math: subjectStats(p, 'math'), chinese: subjectStats(p, 'chinese'),
    };
    const weakest = (['english', 'math', 'chinese'] as Subject[])
      .sort((a, b) => stats[a].rate - stats[b].rate || stats[a].attempts - stats[b].attempts)[0];
    return {
      hour: new Date().getHours(), streak: p.streak, todayAttempts: p.today.attempts,
      dueWords: dueWordCount(p), totalMistakes: pendingMistakeIds(p).length,
      weakestSubject: weakest, weakestRate: stats[weakest].rate, bestCombo: p.arcadeV1.bestCombo,
    };
  }, [p]);

  if (!chatOpen) return null;

  const localReply = (text: string, ctx: ChatContext | null): Msg => {
    const r = nianRespond(text, snapshot, ctx ? { prompt: ctx.prompt, topic: ctx.topic, skill: ctx.skill, explanation: ctx.explanation } : null);
    setMood(r.mood);
    return { role: 'nian', text: r.reply, mood: r.mood };
  };

  async function ask(text: string, ctx: ChatContext | null = null) {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    const history: ChatTurn[] = messages
      .filter((m) => !m.streaming)
      .slice(-8)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    setMessages((m) => [...m, { role: 'user', text: content }]);
    setInput('');

    if (!settings.enabled) {
      setTimeout(() => { setMessages((m) => [...m, localReply(content, ctx)]); setBusy(false); }, 220);
      return;
    }

    const placeholderId = Date.now();
    setMessages((m) => [...m, { role: 'nian', text: '', mood: 'thinking', cloud: true, streaming: true }]);
    let acc = '';
    try {
      await streamNian(settings, {
        message: content, history, snapshot: snapshot as unknown as Record<string, unknown>,
        mistakeContext: ctx ? { prompt: ctx.prompt, topic: ctx.topic, skill: ctx.skill, explanation: ctx.explanation } : null,
      }, {
        onDelta: (delta) => {
          acc += delta;
          setMessages((m) => m.map((msg, i) => i === m.length - 1 && msg.streaming ? { ...msg, text: acc } : msg));
        },
      });
      if (!acc.trim()) throw new Error('EMPTY');
      setMessages((m) => m.map((msg) => msg.streaming ? { ...msg, streaming: false } : msg));
    } catch {
      // 云端失败：本地规则兜底，并提示
      const fallback = localReply(content, ctx).text;
      setMessages((m) => m.filter((_, i) => i !== m.length - 1).concat([
        { role: 'nian', text: fallback, mood: 'thinking' },
        { role: 'nian', text: '（云端暂时没接上，先用本地话回你；要点右上角齿轮检查网关和 Key。）', mood: 'idle' },
      ]));
    } finally {
      setBusy(false);
      void placeholderId;
    }
  }

  return (
    <div className="chat-mask">
      <div className="chat-dialog">
        <header className="chat-head">
          <img src={`/assets/nian-song/${MOOD_IMG[mood] || 'idle'}.webp`} alt="" className="chat-avatar" />
          <div><strong>林念安</strong><small>{settings.enabled ? '云端在席' : '同窗在席 · 本地应答'}</small></div>
          <button className="chat-gear" onClick={() => setShowSettings(true)} aria-label="设置">⚙</button>
          <button className="quiz-close" onClick={closeChat} aria-label="关闭">×</button>
        </header>
        <div className="chat-body" ref={scrollRef}>
          {messages.map((m, i) => (
            <div key={i} className={`bubble-row ${m.role}`}>
              {m.role === 'nian' && <img src={`/assets/nian-song/${MOOD_IMG[m.mood || mood] || 'idle'}.webp`} className="bubble-avatar" alt="" />}
              <div className={`bubble ${m.streaming ? 'streaming' : ''}`}>
                {m.text || (m.streaming ? '…' : '')}
              </div>
            </div>
          ))}
          {busy && !messages.some((m) => m.streaming) && <div className="bubble-row nian"><div className="bubble typing"><i /><i /><i /></div></div>}
        </div>
        <footer className="chat-input">
          <input
            value={input} placeholder="累了、想先学什么、哪道题不会……"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void ask(input)}
          />
          <button className="primary-btn" onClick={() => void ask(input)} disabled={!input.trim() || busy}>说</button>
        </footer>
      </div>
      {showSettings && (
        <SettingsModal settings={settings} onClose={() => setShowSettings(false)} onSave={(s) => { setSettings(s); saveSettings(s); }} />
      )}
    </div>
  );
}
