import type { Question, RubricPoint } from './types';
import { gradeBlank, toHalfWidth } from './blank-grade';

export interface SolveStepResult {
  correct: boolean;
  got: number;
  max: number;
  hinted: boolean;
}

export interface SolveResult {
  steps: SolveStepResult[];
  got: number;
  total: number;
  full: boolean;
}

/**
 * 解答题分步判分纯函数 (SPEC §3)
 * @param q 题目对象 (包含 solve 结构)
 * @param responses 学生的各步作答数组
 * @param hintsUsed 各步是否使用了提示 (看提示得 floor(score/2))
 */
export function gradeSolve(
  q: Question,
  responses: string[] = [],
  hintsUsed: boolean[] = []
): SolveResult {
  const steps = q.solve?.steps ?? [];
  const stepsResult: SolveStepResult[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const userAns = responses[i] ?? '';
    const hinted = Boolean(hintsUsed[i]);
    const max = step.score;

    const correct = gradeBlank(userAns, step.accepts);
    let got = 0;
    if (correct) {
      got = hinted ? Math.floor(max / 2) : max;
    }

    stepsResult.push({
      correct,
      got,
      max,
      hinted,
    });
  }

  const gotTotal = stepsResult.reduce((sum, s) => sum + s.got, 0);
  const total = q.solve?.total ?? stepsResult.reduce((sum, s) => sum + s.max, 0);
  const full = gotTotal === total && total > 0;

  return {
    steps: stepsResult,
    got: gotTotal,
    total,
    full,
  };
}

export interface LocalGradePointResult {
  point: string;
  score: number;
  max: number;
  comment: string;
}

export interface LocalGradeResult {
  points: LocalGradePointResult[];
  total: number;
  max: number;
  summary: string;
}

/**
 * 本地采分点批改纯函数 (SPEC §6)
 * 每个 rubric 点，work 中命中其 keywords 任一（经 halfWidth+去空格、小写）即得满分，否则 0。
 */
export function localGrade(rubric: RubricPoint[] = [], work = ''): LocalGradeResult {
  const cleanWork = toHalfWidth(work || '').replace(/\s+/g, '').toLowerCase();

  const points: LocalGradePointResult[] = rubric.map(r => {
    const max = r.score;
    let hit = false;

    if (cleanWork.length > 0 && Array.isArray(r.keywords)) {
      for (const kw of r.keywords) {
        const cleanKw = toHalfWidth(kw || '').replace(/\s+/g, '').toLowerCase();
        if (cleanKw.length > 0 && cleanWork.includes(cleanKw)) {
          hit = true;
          break;
        }
      }
    }

    return {
      point: r.point,
      score: hit ? max : 0,
      max,
      comment: hit ? '命中关键采分步骤' : '未检测到关键步骤',
    };
  });

  const gotTotal = points.reduce((sum, p) => sum + p.score, 0);
  const maxTotal = points.reduce((sum, p) => sum + p.max, 0);

  let summary = '未识别出有效采分步骤。';
  if (gotTotal === maxTotal && maxTotal > 0) {
    summary = '解答完整，采分点全部体现。';
  } else if (gotTotal > 0) {
    summary = `部分步骤正确，获得 ${gotTotal}/${maxTotal} 分。`;
  }

  return {
    points,
    total: gotTotal,
    max: maxTotal,
    summary,
  };
}
