import { useEffect, useState } from 'react';
import TodayPage from './pages/TodayPage';
import PracticePage from './pages/PracticePage';
import LibraryPage from './pages/LibraryPage';
import CourtyardPage from './pages/CourtyardPage';
import QuizModal from './components/QuizModal';
import Companion from './components/Companion';
import { useUi } from './store/ui-store';
import { useProgress } from './store/progress-store';
import { useSession } from './store/session-store';

const TABS = [
  { id: 'today', label: '书案' },
  { id: 'practice', label: '练习' },
  { id: 'library', label: '藏书' },
  { id: 'courtyard', label: '书院' },
] as const;

export default function App() {
  const startSession = useSession((s) => s.start);
  const openChat = useUi((s) => s.openChat);
  useEffect(() => {
    const action = new URLSearchParams(location.search).get('action');
    if (action === 'daily' || action === 'adaptive') startSession(action);
    if (action === 'chat') openChat();
  }, [startSession]);
  const [tab, setTab] = useState<typeof TABS[number]['id']>('today');
  const streak = useProgress((p) => p.streak);
  return (
    <div className="app">
      <header className="topbar">
        <span className="seal">安</span>
        <div className="brand"><strong>念安今天也不准我摆烂</strong><small>清晖书院 · 陪你把 3+证书一课一课读通</small></div>
        <span className="streak-badge">连课 {streak} 天</span>
      </header>
      <main className="content">
        {tab === 'today' && <TodayPage onChat={() => openChat()} />}
        {tab === 'practice' && <PracticePage />}
        {tab === 'library' && <LibraryPage />}
        {tab === 'courtyard' && <CourtyardPage />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </nav>
      <QuizModal />
      <Companion />
      {tab !== 'today' && <button className="chat-fab" onClick={() => openChat()}>安</button>}
    </div>
  );
}
