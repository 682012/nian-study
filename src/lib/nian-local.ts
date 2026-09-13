// 本地规则念安（移植自 V9 worker respond()）：离线、无 Key 也能回应。
// 云 AI 在阶段3接入同一接口，UI 层不感知差异。
import type { Subject } from '../quiz/types';

export interface Snapshot {
  hour: number; streak: number; todayAttempts: number; dueWords: number;
  totalMistakes: number; weakestSubject: Subject; weakestRate: number; bestCombo: number;
}
export interface MistakeContext { prompt: string; topic?: string; skill?: string; explanation?: string }
export interface NianReply { reply: string; mood: string; suggestedAction: string }

const subjectNames: Record<Subject, string> = { english: '英语', math: '数学', chinese: '语文' };

function choose(items: string[], seedText: string): string {
  let seed = 2166136261;
  for (const ch of String(seedText)) { seed ^= ch.charCodeAt(0); seed = Math.imul(seed, 16777619); }
  return items[(seed >>> 0) % items.length];
}

export function nianRespond(message: string, s: Snapshot, mistake?: MistakeContext | null): NianReply {
  const text = String(message || '').trim().slice(0, 300);
  const lower = text.toLowerCase();
  const weak = subjectNames[s.weakestSubject] || '英语';
  const seed = `${new Date().toISOString().slice(0, 10)}:${text}:${s.todayAttempts}`;

  if (mistake?.prompt) {
    const topic = mistake.topic || mistake.skill || '这道题';
    return {
      reply: `这道【${topic}】先别慌。错因往往不是记不住公式，而是第一步条件没对齐：${mistake.explanation ? mistake.explanation.slice(0, 80) : '注意先找准核心关系式'}。深吸一口气，我陪你再理一遍。`,
      mood: 'teaching', suggestedAction: 'wrongbook',
    };
  }
  if (/累|困|烦|撑不住|不想学|休息/.test(text)) {
    return { reply: choose([
      '那就不和疲惫硬碰。离开屏幕三分钟，回来只做三题；三题之后仍累，今天就收卷。',
      '先喝水，肩膀放下来。回来以后不许开二十题长卷，只开十二题私塾卷，我替你控量。',
      '休息可以，失踪不行。给我一个三分钟后的约定，回来先拿最简单的一题把心思接上。',
    ], seed), mood: 'break', suggestedAction: 'adaptive' };
  }
  if (/早|晚安|你好|在吗|hello|hi/.test(lower)) {
    const late = s.hour >= 23;
    return {
      reply: late ? '在。已经很晚了，今晚只收一处旧误，不许拿熬夜冒充认真。'
        : s.todayAttempts ? `在案前。你今天已经留下 ${s.todayAttempts} 次真实作答，接下来补薄处，不必从头表演一遍勤奋。`
          : '来了？先做第一小卷，今天走多远等做完再定。空白计划写得再漂亮也不记学识。',
      mood: late ? 'break' : 'welcome', suggestedAction: late ? 'wrongbook' : 'adaptive',
    };
  }
  if (/英语|单词|听力|听写|长对话|english/.test(lower)) {
    return { reply: s.dueWords
      ? `先处理 ${s.dueWords} 张到期词笺，再听一组长对话与情境理解。长对话先抓说话人关系、地点与转折逻辑。`
      : '今天从长对话听力与情境取意开始。第一遍只抓场景与意图，第二遍抓细节数字，第三遍核对关键实词。',
      mood: 'teaching', suggestedAction: s.dueWords ? 'wrongbook' : 'listening' };
  }
  if (/数学|方程|函数|几何|svg|图像|计算|math/.test(lower)) {
    return { reply: choose([
      '遇到几何与函数题，先看动态图像中的顶点、切点和坐标轴。把图读懂了，式子自然水落石出。',
      '这次别只盯选项。看清抛物线开口与对称轴，先在心里写出关系式，再看哪个答案配得上它。',
      '我会给你同类变式，几何图像也会随参数动态重绘。若又错在同一步，我们就把那一步单独拆开。',
    ], seed), mood: 'teaching', suggestedAction: 'math' };
  }
  if (/语文|阅读|文言|主观|采分|作文|chinese/.test(lower)) {
    return { reply: '现代文与主观题先看采分点：找准对象、动作、转折与深层主旨。按要点分条作答，答案必须指回原文依据。',
      mood: 'teaching', suggestedAction: 'reading' };
  }
  if (/错|薄弱|不会|拾遗|复习|讲题/.test(text)) {
    return { reply: s.totalMistakes
      ? `学录里还有 ${s.totalMistakes} 条待理旧误。别一口吞完，先挑最近的一组；做对时看清解析，才算真正把关卡打通。`
      : `暂时没有待理旧误。那就开一卷${weak}，真正的薄处会自己露面，不用靠猜。`,
      mood: 'thinking', suggestedAction: s.totalMistakes ? 'wrongbook' : 'adaptive' };
  }
  if (/奖励|游赏|玩|摆烂/.test(text)) {
    return { reply: s.bestCombo >= 10
      ? `最佳连击已经到 ${s.bestCombo}，游赏当然可以。但先把当前这一卷收口，别把“奖励自己”写成半途逃跑。`
      : '游赏时辰仍由真实作答换。签到领空气币这种事，清晖书院暂时还没荒唐到那个程度。',
      mood: 'tease', suggestedAction: 'daily' };
  }
  if (/谢谢|喜欢|想你|念安/.test(text)) {
    return { reply: choose([
      '……知道了。先把卷角压平，别忽然说这种让我接不上话的。',
      '我在。你不必每次满分，但真正卡住的地方不许藏。',
      '嗯。那就把下一题也认真做完，别只挑让我心软的话说。',
    ], seed), mood: 'tease', suggestedAction: 'adaptive' };
  }
  const accuracy = Math.round(s.weakestRate * 100);
  return {
    reply: `我替你省掉选择困难：先补${weak}。近期这一馆约 ${accuracy}% 的作答落得稳，十二题足够让我判断下一步；继续讨论学什么，容易把讨论本身学到满分。`,
    mood: 'invite', suggestedAction: 'adaptive',
  };
}
