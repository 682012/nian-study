// 学录备份：支持 V10 全量档与 V9/V2 老档（nian-study-progress-v2）导入。
import { useProgress } from '../store/progress-store';
import { migrateFromV2, type ProgressState } from './progress';
import { V2_KEY, V10_KEY } from './progress';

export function exportBackup(): void {
  const full = useProgress.getState() as unknown as ProgressState & Record<string, unknown>;
  const { answer, recordRun, replaceAll, resetAll, ...data } = full;
  const payload = { app: 'nian-study', backupVersion: 10, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nian-xuelu-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// 兼容三种形态：{app,data} / 直接 V10 state / V9 老档
export function parseBackup(raw: string): ProgressState {
  const parsed = JSON.parse(raw);
  const candidate = parsed && parsed.app === 'nian-study' && parsed.data ? parsed.data : parsed;
  return migrateFromV2(candidate);
}

export async function importBackup(file: File): Promise<ProgressState> {
  const text = await file.text();
  const state = parseBackup(text);
  useProgress.getState().replaceAll(state);
  return state;
}

export { V2_KEY, V10_KEY };
