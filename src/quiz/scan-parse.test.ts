import { describe, it, expect } from 'vitest';
import {
  extractJsonArray, parseScanResult, scanQToQuestion, stableScanId, MAX_SCAN_QUESTIONS,
} from './scan-parse';
import { checkAnswer } from './engine';

const GOOD = JSON.stringify([
  { subject: 'math', type: 'choice', prompt: '2x+3=11，x=?', choices: ['3', '4', '5', '6'], answer: 1, explanation: '移项得 2x=8', source: '2023 年真题' },
  { subject: 'chinese', type: 'blank', prompt: '______，疑是银河落九天。', accepts: ['飞流直下三千尺', '飛流直下三千尺'], explanation: '李白《望庐山瀑布》' },
]);

describe('扫描结果解析', () => {
  it('标准 JSON 数组', () => {
    const { questions, issues } = parseScanResult(GOOD);
    expect(issues).toHaveLength(0);
    expect(questions).toHaveLength(2);
    expect(questions[0].subject).toBe('math');
    expect(questions[0].answer).toBe(1);
    expect(questions[1].type).toBe('blank');
  });

  it('容忍 ```json 围栏和前后废话', () => {
    const raw = `好的，识别结果如下：\n\`\`\`json\n${GOOD}\n\`\`\`\n以上。`;
    expect(parseScanResult(raw).questions).toHaveLength(2);
  });

  it('没有数组时报缺题目列表', () => {
    const { questions, issues } = parseScanResult('我看不懂这张图');
    expect(questions).toHaveLength(0);
    expect(issues[0]).toContain('找不到题目列表');
  });

  it('坏条目被跳过并记账：缺科目/选项只有一个/答案越界/题干缺失', () => {
    const raw = JSON.stringify([
      { type: 'choice', prompt: '没有科目', choices: ['1', '2'], answer: 0 },
      { subject: 'math', type: 'choice', prompt: '只有一个选项', choices: ['1'], answer: 0 },
      { subject: 'math', type: 'choice', prompt: '答案越界', choices: ['1', '2', '3', '4'], answer: 9 },
      { subject: 'english', type: 'choice', prompt: '' },
      { subject: 'math', type: 'choice', prompt: '两个选项也放行', choices: ['对', '错'], answer: 0, explanation: '判断题' },
      { subject: 'english', type: 'choice', prompt: '正常题', choices: ['a', 'b', 'c', 'd'], answer: 2, explanation: 'e' },
    ]);
    const { questions, issues } = parseScanResult(raw);
    expect(questions.map((x) => x.prompt)).toEqual(['两个选项也放行', '正常题']);
    expect(issues.length).toBeGreaterThanOrEqual(4);
  });

  it('同题重复只留一条', () => {
    const raw = JSON.stringify([
      { subject: 'math', type: 'choice', prompt: '1+1=?', choices: ['1', '2', '3', '4'], answer: 1 },
      { subject: 'math', type: 'choice', prompt: '1+1=?', choices: ['1', '2', '3', '4'], answer: 1 },
    ]);
    const { questions, issues } = parseScanResult(raw);
    expect(questions).toHaveLength(1);
    expect(issues.some((s) => s.includes('重复'))).toBe(true);
  });

  it('一卷最多取 20 题', () => {
    const raw = JSON.stringify(
      Array.from({ length: 30 }, (_, i) => ({ subject: 'math', type: 'choice', prompt: `第 ${i} 题`, choices: ['1', '2', '3', '4'], answer: 0 })),
    );
    const { questions } = parseScanResult(raw);
    expect(questions).toHaveLength(MAX_SCAN_QUESTIONS);
  });

  it('extractJsonArray 只认数组', () => {
    expect(extractJsonArray('{"a":1}')).toBeNull();
    expect(extractJsonArray('[1,2]')).toEqual([1, 2]);
  });

  it('同题干同科目 id 稳定（入库去重靠它）', () => {
    expect(stableScanId('math', '1+1=?')).toBe(stableScanId('math', '1+1=? '));
    expect(stableScanId('math', '1+1=?')).not.toBe(stableScanId('english', '1+1=?'));
  });

  it('转成 Question 后判分链路通：choice 对下标、blank 认等价答案', () => {
    const { questions } = parseScanResult(GOOD);
    const [choiceQ, blankQ] = questions.map(scanQToQuestion);
    expect(choiceQ.type).toBe('choice');
    expect(choiceQ.choices).toHaveLength(4);
    expect(checkAnswer(choiceQ, 1)).toBe(true);
    expect(checkAnswer(choiceQ, 0)).toBe(false);
    expect(blankQ.type).toBe('blank');
    expect(checkAnswer(blankQ, '飞流直下三千尺')).toBe(true);
    expect(checkAnswer(blankQ, '疑是银河落九天')).toBe(false);
  });
});
