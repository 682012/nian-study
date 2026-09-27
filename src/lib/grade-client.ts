import type { AiSettings } from './ai-client';
import type { RubricPoint } from '../quiz/types';
import { localGrade } from '../quiz/solve-grade';

export interface GradePoint {
  point: string;
  score: number;
  max: number;
  comment: string;
}

export interface GradeResult {
  points: GradePoint[];
  total: number;
  max: number;
  summary: string;
  offline: boolean;
}

function extractJsonObject(raw: unknown): Record<string, unknown> | null {
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== 'string') {
    return null;
  }

  const str = raw.trim();
  const fenced = str.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1].trim() : str;

  try {
    const parsed = JSON.parse(candidate);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        const parsed = JSON.parse(candidate.slice(start, end + 1));
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return null;
      }
    }
  }

  return null;
}

export function validateGradeReply(raw: unknown, rubric: RubricPoint[]): GradeResult | null {
  if (!Array.isArray(rubric) || rubric.length === 0) {
    return null;
  }

  const obj = extractJsonObject(raw);
  if (!obj || !Array.isArray(obj.points)) {
    return null;
  }

  const rawPoints = obj.points as unknown[];
  if (rawPoints.length < rubric.length) {
    return null;
  }

  const matchedPoints: GradePoint[] = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < rubric.length; i++) {
    const r = rubric[i];
    const rMax = typeof r.score === 'number' && Number.isFinite(r.score) ? Math.max(0, Math.round(r.score)) : 0;

    let foundIdx = rawPoints.findIndex((p, idx) => {
      if (usedIndices.has(idx) || typeof p !== 'object' || p === null) return false;
      const ptName = (p as Record<string, unknown>).point;
      return typeof ptName === 'string' && ptName.trim() === r.point.trim();
    });

    if (foundIdx === -1) {
      if (i < rawPoints.length && !usedIndices.has(i)) {
        foundIdx = i;
      }
    }

    if (foundIdx === -1) {
      return null;
    }

    usedIndices.add(foundIdx);
    const item = (rawPoints[foundIdx] || {}) as Record<string, unknown>;

    const rawScore = Number(item.score);
    let score = Number.isFinite(rawScore) ? Math.round(rawScore) : 0;
    score = Math.max(0, Math.min(rMax, score));

    const comment = typeof item.comment === 'string' ? item.comment.trim() : '';

    matchedPoints.push({
      point: r.point,
      score,
      max: rMax,
      comment,
    });
  }

  const total = matchedPoints.reduce((sum, p) => sum + p.score, 0);
  const max = rubric.reduce((sum, r) => sum + (typeof r.score === 'number' ? r.score : 0), 0);
  const summary = typeof obj.summary === 'string' ? obj.summary.trim().slice(0, 120) : '';

  return {
    points: matchedPoints,
    total,
    max,
    summary,
    offline: false,
  };
}

export async function aiGrade(
  settings: AiSettings,
  req: { prompt: string; solution: string[]; rubric: RubricPoint[]; work: string },
  signal?: AbortSignal
): Promise<GradeResult> {
  if (!settings.enabled) {
    const local = localGrade(req.rubric, req.work);
    return { ...local, offline: true };
  }

  try {
    const res = await fetch('/api/nian/ai/grade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: req.prompt,
        solution: req.solution,
        rubric: req.rubric,
        work: req.work,
        apiKey: settings.apiKey,
        baseUrl: settings.baseUrl,
        model: settings.model,
      }),
      signal,
    });

    if (!res.ok) {
      const local = localGrade(req.rubric, req.work);
      return { ...local, offline: true };
    }

    const json = await res.json();
    if (!json || !json.ok || !json.data) {
      const local = localGrade(req.rubric, req.work);
      return { ...local, offline: true };
    }

    const validated = validateGradeReply(json.data, req.rubric);
    if (!validated) {
      const local = localGrade(req.rubric, req.work);
      return { ...local, offline: true };
    }

    return validated;
  } catch {
    const local = localGrade(req.rubric, req.work);
    return { ...local, offline: true };
  }
}
