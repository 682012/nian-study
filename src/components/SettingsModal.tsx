import { useState } from 'react';
import { AiSettings, testNian } from '../lib/ai-client';

export default function SettingsModal({ settings, onClose, onSave }: {
  settings: AiSettings; onClose: () => void; onSave: (s: AiSettings) => void;
}) {
  const [draft, setDraft] = useState<AiSettings>(settings);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; detail: string } | null>(null);

  const test = async () => {
    setTesting(true); setResult(null);
    setResult(await testNian(draft));
    setTesting(false);
  };

  return (
    <div className="chat-mask">
      <div className="chat-dialog settings-dialog">
        <header className="chat-head">
          <div style={{ flex: 1 }}><strong>云端念安设置</strong><small>默认网关已配 · 高级用户可填自己的</small></div>
          <button className="quiz-close" onClick={onClose} aria-label="关闭">×</button>
        </header>
        <div className="settings-body">
          <label className="switch-row">
            <span>启用云端 AI<small>默认走念安的私有网关；关闭则用本地规则应答</small></span>
            <input type="checkbox" checked={draft.enabled} onChange={(e) => setDraft({ ...draft, enabled: e.target.checked })} />
          </label>
          <label>网关地址（Base URL）
            <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="留空 = 服务器默认网关" autoCapitalize="off" />
          </label>
          <label>模型
            <input value={draft.model} onChange={(e) => setDraft({ ...draft, model: e.target.value })} placeholder="留空 = 默认模型" autoCapitalize="off" />
          </label>
          <label>API Key
            <input value={draft.apiKey} type="password" onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })} placeholder="留空 = 服务器密钥（推荐）" autoCapitalize="off" />
          </label>
          {result && <div className={`test-result ${result.ok ? 'ok' : 'no'}`}>{result.ok ? '✓ ' : '✗ '}{result.detail}</div>}
          <div className="settings-actions">
            <button className="ghost-btn" disabled={testing} onClick={test}>{testing ? '测试中…' : '测试连接'}</button>
            <button className="primary-btn" onClick={() => { onSave(draft); onClose(); }}>保存</button>
          </div>
        </div>
      </div>
    </div>
  );
}
