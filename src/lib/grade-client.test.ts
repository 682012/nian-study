import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateGradeReply, aiGrade } from './grade-client';
import type { RubricPoint } from '../quiz/types';
import type { AiSettings } from './ai-client';

vi.mock('../quiz/solve-grade', () => ({
  localGrade: vi.fn((rubric: RubricPoint[], work: string) => ({
    points: rubric.map((r) => ({
      point: r.point,
      score: work.includes('命中') ? r.score : 0,
      max: r.score,
      comment: work.includes('命中') ? '本地命中' : '本地未体现',
    })),
    total: work.includes('命中') ? rubric.reduce((sum, r) => sum + r.score, 0) : 0,
    max: rubric.reduce((sum, r) => sum + r.score, 0),
    summary: '离线批改（关键词匹配）',
  })),
}));

const mockRubric: RubricPoint[] = [
  { point: '写出正弦定理公式', score: 3, keywords: ['正弦定理', 'sin'] },
  { point: '代入已知数据求得边 b', score: 4, keywords: ['b='] },
  { point: '利用面积公式计算最终面积', score: 5, keywords: ['S=', '面积'] },
];

const mockAiSettings: AiSettings = {
  enabled: true,
  apiKey: 'test-key',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
};

describe('validateGradeReply', () => {
  it('正确解析符合标准的 JSON 对象并重算 total', () => {
    const raw = {
      points: [
        { point: '写出正弦定理公式', score: 3, max: 3, comment: '公式规范' },
        { point: '代入已知数据求得边 b', score: 4, max: 4, comment: '计算正确' },
        { point: '利用面积公式计算最终面积', score: 3, max: 5, comment: '计算有误' },
      ],
      total: 999, // 故意传错误 total，应被服务端/客户端重算
      summary: '过程大部分正确，最终面积计算有小失误。',
    };

    const result = validateGradeReply(raw, mockRubric);
    expect(result).not.toBeNull();
    expect(result?.total).toBe(10);
    expect(result?.max).toBe(12);
    expect(result?.points).toHaveLength(3);
    expect(result?.points[0].score).toBe(3);
    expect(result?.points[2].score).toBe(3);
    expect(result?.offline).toBe(false);
  });

  it('分数超 max 或为负数时被严格钳制，浮点数被取整', () => {
    const raw = {
      points: [
        { point: '写出正弦定理公式', score: 10, max: 3, comment: '超分' },
        { point: '代入已知数据求得边 b', score: -5, max: 4, comment: '负分' },
        { point: '利用面积公式计算最终面积', score: 4.6, max: 5, comment: '小数' },
      ],
      summary: '分数测试',
    };

    const result = validateGradeReply(raw, mockRubric);
    expect(result).not.toBeNull();
    expect(result?.points[0].score).toBe(3);
    expect(result?.points[1].score).toBe(0);
    expect(result?.points[2].score).toBe(5);
    expect(result?.total).toBe(8);
  });

  it('采分点乱序时按 rubric 顺序严格对齐', () => {
    const raw = {
      points: [
        { point: '利用面积公式计算最终面积', score: 5, max: 5, comment: '后置项' },
        { point: '写出正弦定理公式', score: 3, max: 3, comment: '首项' },
        { point: '代入已知数据求得边 b', score: 4, max: 4, comment: '中项' },
      ],
      summary: '乱序输入测试',
    };

    const result = validateGradeReply(raw, mockRubric);
    expect(result).not.toBeNull();
    expect(result?.points[0].point).toBe('写出正弦定理公式');
    expect(result?.points[1].point).toBe('代入已知数据求得边 b');
    expect(result?.points[2].point).toBe('利用面积公式计算最终面积');
    expect(result?.total).toBe(12);
  });

  it('条目多于 rubric 时截取并对齐 rubric 条目，忽略多余项', () => {
    const raw = {
      points: [
        { point: '写出正弦定理公式', score: 3, max: 3, comment: '1' },
        { point: '代入已知数据求得边 b', score: 4, max: 4, comment: '2' },
        { point: '利用面积公式计算最终面积', score: 5, max: 5, comment: '3' },
        { point: '额外多余步骤', score: 2, max: 2, comment: '多余项' },
      ],
      summary: '多条目测试',
    };

    const result = validateGradeReply(raw, mockRubric);
    expect(result).not.toBeNull();
    expect(result?.points).toHaveLength(3);
    expect(result?.total).toBe(12);
  });

  it('条目少于 rubric 时认为评判不完整，返回 null', () => {
    const raw = {
      points: [
        { point: '写出正弦定理公式', score: 3, max: 3, comment: '1' },
        { point: '代入已知数据求得边 b', score: 4, max: 4, comment: '2' },
      ],
      summary: '少条目',
    };

    const result = validateGradeReply(raw, mockRubric);
    expect(result).toBeNull();
  });

  it('非 JSON 字符串直接返回 null', () => {
    expect(validateGradeReply('不好意思，我不理解你的作答', mockRubric)).toBeNull();
    expect(validateGradeReply('{ invalid json string', mockRubric)).toBeNull();
    expect(validateGradeReply(null, mockRubric)).toBeNull();
    expect(validateGradeReply(12345, mockRubric)).toBeNull();
  });

  it('带 ```json 围栏及前后杂质文字时也能正确抽取 JSON', () => {
    const rawString = `你好！批改结果如下：
\`\`\`json
{
  "points": [
    { "point": "写出正弦定理公式", "score": 3, "max": 3, "comment": "很好" },
    { "point": "代入已知数据求得边 b", "score": 4, "max": 4, "comment": "正确" },
    { "point": "利用面积公式计算最终面积", "score": 5, "max": 5, "comment": "计算无误" }
  ],
  "total": 12,
  "summary": "表现优异"
}
\`\`\`
请继续加油！`;

    const result = validateGradeReply(rawString, mockRubric);
    expect(result).not.toBeNull();
    expect(result?.total).toBe(12);
    expect(result?.summary).toBe('表现优异');
  });

  it('summary 超过 120 字时被截断至 120 字', () => {
    const longSummary = 'A'.repeat(200);
    const raw = {
      points: [
        { point: '写出正弦定理公式', score: 3, max: 3, comment: '1' },
        { point: '代入已知数据求得边 b', score: 4, max: 4, comment: '2' },
        { point: '利用面积公式计算最终面积', score: 5, max: 5, comment: '3' },
      ],
      summary: longSummary,
    };

    const result = validateGradeReply(raw, mockRubric);
    expect(result).not.toBeNull();
    expect(result?.summary.length).toBe(120);
  });
});

describe('aiGrade', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('settings.enabled 为 false 时直接回退本地批改且 offline 为 true', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const result = await aiGrade(
      { ...mockAiSettings, enabled: false },
      {
        prompt: '求三角形面积',
        solution: ['由正弦定理得 b=2', 'S=1/2 absinC = √3'],
        rubric: mockRubric,
        work: '由于命中关键词...',
      }
    );

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(result.offline).toBe(true);
    expect(result.total).toBe(12);
  });

  it('fetch 抛出网络异常时安全回退本地批改且 offline 为 true', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    const result = await aiGrade(
      mockAiSettings,
      {
        prompt: '求三角形面积',
        solution: ['由正弦定理得 b=2'],
        rubric: mockRubric,
        work: '未写任何采分内容',
      }
    );

    expect(result.offline).toBe(true);
    expect(result.total).toBe(0);
    expect(result.summary).toContain('离线批改');
  });

  it('fetch 返回非 2xx 状态码时安全回退本地批改且 offline 为 true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ ok: false, code: 'UPSTREAM_AI_FAILED' }),
      })
    );

    const result = await aiGrade(
      mockAiSettings,
      {
        prompt: '求三角形面积',
        solution: ['由正弦定理得 b=2'],
        rubric: mockRubric,
        work: '命中部分',
      }
    );

    expect(result.offline).toBe(true);
    expect(result.total).toBe(12);
  });

  it('服务端返回校验失败的响应格式时安全回退本地批改且 offline 为 true', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: { points: [] }, // 空 points 导致二次校验失败
        }),
      })
    );

    const result = await aiGrade(
      mockAiSettings,
      {
        prompt: '求三角形面积',
        solution: ['由正弦定理得 b=2'],
        rubric: mockRubric,
        work: '命中',
      }
    );

    expect(result.offline).toBe(true);
  });

  it('调用成功且数据合法时返回完整批改结果且 offline 为 false', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          data: {
            points: [
              { point: '写出正弦定理公式', score: 3, max: 3, comment: '标准' },
              { point: '代入已知数据求得边 b', score: 4, max: 4, comment: '计算准确' },
              { point: '利用面积公式计算最终面积', score: 5, max: 5, comment: '解答完整' },
            ],
            total: 12,
            summary: '完全正确，书写规范！',
          },
        }),
      })
    );

    const result = await aiGrade(
      mockAiSettings,
      {
        prompt: '求三角形面积',
        solution: ['由正弦定理得 b=2'],
        rubric: mockRubric,
        work: '详细解答...',
      }
    );

    expect(result.offline).toBe(false);
    expect(result.total).toBe(12);
    expect(result.summary).toBe('完全正确，书写规范！');
  });
});
