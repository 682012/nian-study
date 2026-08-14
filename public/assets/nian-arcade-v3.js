(() => {
  "use strict";

  const STORAGE_KEY = "nian-study-progress-v2";
  const ARCADE_KEY = "arcadeV1";
  const DAY_MS = 86_400_000;
  const MODES = {
    adaptive: { seal: "安", title: "念安私塾", note: "按你最近的薄处，临场配一卷", count: 12, tone: "jade" },
    listen: { seal: "听", title: "听音辨词", note: "只给发音，四选一辨义", count: 12, tone: "jade" },
    listening: { seal: "闻", title: "听句寻意", note: "句子、通知与短对话听后取意", count: 10, tone: "blue" },
    dictation: { seal: "写", title: "听写巡夜", note: "听见什么，就完整写出来", count: 10, tone: "blue" },
    sentence: { seal: "句", title: "句阵重排", note: "点词成句，练语序与语感", count: 8, tone: "peach" },
    math: { seal: "算", title: "算学千变", note: "十类题型，每次参数都不同", count: 12, tone: "gold" },
    chinese: { seal: "文", title: "经史百问", note: "诗文、成语、语用与阅读策略", count: 12, tone: "rose" },
    reading: { seal: "阅", title: "短章取证", note: "读真实短文，回到原文找证据", count: 8, tone: "rose" },
    mixed: { seal: "巡", title: "三馆巡考", note: "英语、数学、语文混合十五题", count: 15, tone: "ink" },
    daily: { seal: "日", title: "念安今日卷", note: "按近期薄弱点生成的固定二十题", count: 20, tone: "sun" },
    endless: { seal: "百", title: "百连闯关", note: "三颗心，看看能走多远", count: 100, tone: "night" },
    mistakes: { seal: "追", title: "错题追击", note: "只追本馆里真正答错的题", count: 12, tone: "ember" },
  };

  const FALLBACK_WORDS = [
    [1, "all", "ɔːl", "完全；全部"], [2, "need", "niːd", "需要"],
    [3, "other", "ˈʌðə(r)", "其他的"], [4, "school", "skuːl", "学校"],
    [5, "student", "ˈstjuːdnt", "学生"], [6, "change", "tʃeɪndʒ", "改变；变化"],
    [7, "follow", "ˈfɒləʊ", "跟随"], [8, "library", "ˈlaɪbrəri", "图书馆"],
    [9, "problem", "ˈprɒbləm", "问题"], [10, "improve", "ɪmˈpruːv", "改善；提高"],
    [11, "prepare", "prɪˈpeə(r)", "准备"], [12, "continue", "kənˈtɪnjuː", "继续"],
    [13, "knowledge", "ˈnɒlɪdʒ", "知识"], [14, "practice", "ˈpræktɪs", "练习"],
    [15, "challenge", "ˈtʃælɪndʒ", "挑战"], [16, "convenient", "kənˈviːniənt", "方便的"],
    [17, "imagine", "ɪˈmædʒɪn", "想象"], [18, "success", "səkˈses", "成功"],
    [19, "careful", "ˈkeəfl", "仔细的"], [20, "environment", "ɪnˈvaɪrənmənt", "环境"],
    [21, "different", "ˈdɪfrənt", "不同的"], [22, "important", "ɪmˈpɔːtnt", "重要的"],
    [23, "remember", "rɪˈmembə(r)", "记得"], [24, "understand", "ˌʌndəˈstænd", "理解"],
    [25, "possible", "ˈpɒsəbl", "可能的"], [26, "language", "ˈlæŋɡwɪdʒ", "语言"],
    [27, "question", "ˈkwestʃən", "问题；提问"], [28, "answer", "ˈɑːnsə(r)", "回答；答案"],
    [29, "example", "ɪɡˈzɑːmpl", "例子"], [30, "future", "ˈfjuːtʃə(r)", "未来"],
  ].map(([id, word, phonetic, meaning]) => ({ id, word, phonetic, meaning }));

  const SENTENCES = [
    ["I review my notes before going to bed", "我睡前复习笔记", "before 后接动名词短语"],
    ["She has studied English for three years", "她学英语已有三年", "现在完成时与 for"],
    ["Could you tell me where the library is", "你能告诉我图书馆在哪里吗", "宾语从句用陈述语序"],
    ["The book that I borrowed was very useful", "我借的那本书很有用", "that 引导定语从句"],
    ["If it rains tomorrow we will stay at home", "如果明天下雨，我们就待在家", "条件句主将从现"],
    ["There are many ways to solve the problem", "解决这个问题有很多方法", "there be 与不定式"],
    ["Reading aloud helps me remember new words", "朗读帮助我记住新词", "动名词作主语"],
    ["He was too tired to finish the work", "他太累了，没能完成工作", "too ... to ..."],
    ["The more you practice the better you become", "练得越多，进步越大", "the more ... the better"],
    ["Neither Tom nor his sister likes coffee", "汤姆和妹妹都不喜欢咖啡", "neither ... nor 就近一致"],
    ["We should protect the environment from pollution", "我们应保护环境免受污染", "protect ... from ..."],
    ["It is important for us to keep learning", "持续学习对我们很重要", "It is + adj + for sb + to do"],
    ["The meeting was put off because of the storm", "会议因暴风雨延期", "被动语态与 because of"],
    ["I would rather walk than take a crowded bus", "我宁愿走路也不坐拥挤公交", "would rather ... than ..."],
    ["By the time I arrived the class had begun", "我到时课程已经开始", "过去完成时"],
    ["Please remember to turn off the light", "请记得关灯", "remember to do"],
    ["My teacher encouraged me to try again", "老师鼓励我再试一次", "encourage sb to do"],
    ["This is the most interesting story I have read", "这是我读过最有趣的故事", "最高级与现在完成时"],
    ["Although he was nervous he spoke clearly", "尽管紧张，他仍说得很清楚", "although 不与 but 连用"],
    ["We did not leave until the rain stopped", "直到雨停我们才离开", "not ... until ..."],
    ["The room is large enough for ten people", "房间足够十个人使用", "adj + enough"],
    ["You had better check your answer again", "你最好再检查答案", "had better do"],
    ["Both reading and listening are useful skills", "阅读和听力都是有用技能", "both ... and ..."],
    ["A new bridge will be built next year", "明年将建一座新桥", "一般将来时的被动语态"],
    ["I wonder whether she will join us", "我想知道她是否会加入", "whether 引导宾语从句"],
    ["He used to get up late on weekends", "他过去周末常晚起", "used to do"],
    ["The teacher made the difficult idea clear", "老师把难懂的概念讲清了", "make + 宾语 + 形容词"],
    ["We have no choice but to keep moving", "我们别无选择，只能继续前进", "have no choice but to do"],
    ["Not only the students but also the teacher was excited", "学生和老师都很兴奋", "not only ... but also 就近一致"],
    ["The question is so easy that everyone can answer it", "题目很简单，人人都能答", "so ... that ..."],
    ["Would you mind opening the window", "你介意开一下窗吗", "mind doing"],
    ["The boy whose bag was lost asked for help", "丢了书包的男孩寻求帮助", "whose 引导定语从句"],
    ["No matter how hard it is do not give up", "无论多难都别放弃", "no matter how"],
    ["I look forward to hearing from you", "我期待收到你的来信", "look forward to doing"],
    ["The purpose of the plan is to save time", "计划的目的是节省时间", "不定式作表语"],
    ["Only then did I understand the reason", "直到那时我才明白原因", "only 置前引起部分倒装"],
  ].map(([sentence, meaning, rule], index) => ({ id: `sentence-${index + 1}`, sentence, meaning, rule }));

  const V8_CONTENT = globalThis.NIAN_V8_CONTENT || {};
  if (Array.isArray(V8_CONTENT.sentences)) SENTENCES.push(...V8_CONTENT.sentences);
  const LISTENING_QUESTIONS = Array.isArray(V8_CONTENT.listening) ? V8_CONTENT.listening : [];
  const READING_QUESTIONS = Array.isArray(V8_CONTENT.readings) ? V8_CONTENT.readings : [];

  const CHINESE_QUESTIONS = [
    ["成语", "“他做事总能提前考虑风险，真是____。”填入最恰当的一项。", ["未雨绸缪", "临渴掘井", "画蛇添足", "守株待兔"], 0, "未雨绸缪比喻事先做好准备。"],
    ["成语", "形容文章或谈话内容深刻、使人醒悟，应使用：", ["振聋发聩", "耳濡目染", "不绝如缕", "首当其冲"], 0, "振聋发聩比喻用语言文字唤醒糊涂的人。"],
    ["成语", "“大家七手八脚，很快把教室整理好了。”成语使用：", ["恰当", "对象错误", "褒贬误用", "不合语境"], 0, "七手八脚形容人多手杂、动作纷乱，此处符合语境。"],
    ["成语", "下列成语中，含有“勤奋学习”意思的是：", ["韦编三绝", "缘木求鱼", "刻舟求剑", "买椟还珠"], 0, "韦编三绝形容读书勤奋。"],
    ["病句", "选出没有语病的一项。", ["通过阅读，使我开阔了视野。", "我们要防止类似事故不再发生。", "老师耐心地纠正并指出了我的错误。", "这次活动提高了大家的合作意识。"], 3, "A 缺主语，B 否定不当，C 语序应为“指出并纠正”。"],
    ["病句", "“能否坚持锻炼，是拥有健康体魄的关键。”主要语病是：", ["两面对一面", "成分残缺", "语序不当", "搭配恰当"], 0, "“能否”是两面，“拥有健康体魄”是一面。"],
    ["病句", "“同学们讨论并听取了校长的建议。”应改为：", ["听取并讨论", "讨论和听取", "听取或讨论", "无需修改"], 0, "先听取建议，再讨论建议，符合逻辑顺序。"],
    ["标点", "下列标点使用正确的是：", ["你去过北京吗。", "书桌上放着：书、本子和笔。", "“快走！”他喊道。", "我喜欢读《春》，《背影》。"], 2, "感叹号放在引号内，提示语在后时句末用句号。"],
    ["标点", "“一、要认真审题；二、要规范作答；三、要及时检查。”分号作用是：", ["分隔并列分句", "表示解释", "表示转折", "表示引用"], 0, "分号用于分隔层次清楚的并列分句。"],
    ["修辞", "“山朗润起来了，水涨起来了，太阳的脸红起来了。”主要使用：", ["排比、拟人", "比喻、借代", "反问、夸张", "对偶、引用"], 0, "三个结构相近分句构成排比，“太阳的脸”有拟人色彩。"],
    ["修辞", "“飞流直下三千尺”使用的修辞是：", ["夸张", "借代", "反问", "双关"], 0, "“三千尺”极言瀑布落差，是夸张。"],
    ["修辞", "“你难道不应该为自己的选择负责吗？”属于：", ["反问", "设问", "对偶", "借喻"], 0, "答案包含在问句中，用反问加强语气。"],
    ["古诗", "“海内存知己”的下一句是：", ["天涯若比邻", "江春入旧年", "归雁入胡天", "风正一帆悬"], 0, "出自王勃《送杜少府之任蜀州》。"],
    ["古诗", "“但愿人长久，千里共婵娟”中的“婵娟”借指：", ["明月", "美酒", "故乡", "友人"], 0, "此处以婵娟借指明月。"],
    ["古诗", "“春风又绿江南岸”中“绿”字的妙处是：", ["化静为动，写出春回江南", "只说明颜色", "表示作者嫉妒", "说明江水变绿"], 0, "“绿”作动词，使春风带来的变化可感。"],
    ["古诗", "“稻花香里说丰年，听取蛙声一片”调动了：", ["嗅觉和听觉", "视觉和味觉", "触觉和视觉", "只有听觉"], 0, "稻花香是嗅觉，蛙声是听觉。"],
    ["文言", "“学而时习之，不亦说乎”中“说”的意思是：", ["同“悦”，愉快", "说话", "解释", "劝说"], 0, "“说”通“悦”。"],
    ["文言", "“温故而知新”中“故”指：", ["学过的知识", "事故", "所以", "故意"], 0, "“故”在这里是旧的、学过的知识。"],
    ["文言", "“三人行，必有我师焉”强调：", ["善于向他人学习", "三人才能出行", "老师必须同行", "只向强者学习"], 0, "每个人都有可学习之处。"],
    ["文言", "“先天下之忧而忧，后天下之乐而乐”体现：", ["以天下为己任", "及时行乐", "归隐山林", "独善其身"], 0, "句子体现范仲淹的家国担当。"],
    ["文常", "《资治通鉴》的体例是：", ["编年体", "纪传体", "国别体", "章回体"], 0, "《资治通鉴》按年代顺序记事，是编年体通史。"],
    ["文常", "李清照号：", ["易安居士", "东坡居士", "六一居士", "香山居士"], 0, "李清照号易安居士。"],
    ["文常", "“唐宋八大家”中的“三苏”是：", ["苏洵、苏轼、苏辙", "苏武、苏轼、苏辙", "苏洵、苏秦、苏轼", "苏轼、苏辙、苏武"], 0, "三苏为苏洵及其子苏轼、苏辙。"],
    ["文常", "《梦溪笔谈》的作者是：", ["沈括", "司马光", "王安石", "欧阳修"], 0, "北宋沈括著《梦溪笔谈》。"],
    ["阅读", "概括段落主要内容，最稳妥的第一步是：", ["找叙述对象与核心事件", "抄最后一句", "只看标题", "先写个人感受"], 0, "概括需先确定“谁/什么 + 做了什么/怎样”。"],
    ["阅读", "分析人物形象时，证据最可靠的是：", ["人物的言行与事件选择", "读者的第一印象", "故事篇幅长短", "标题字体大小"], 0, "形象判断必须落回可核对的文本细节。"],
    ["阅读", "赏析句子中的动词，通常应先回答：", ["动词写出了什么动作或状态", "作者出生日期", "全文共有几段", "是否押韵"], 0, "先解释词语在语境中的具体表达，再谈效果。"],
    ["阅读", "环境描写的作用不包括：", ["直接替人物做出决定", "交代背景", "渲染气氛", "推动情节"], 0, "环境可以影响、烘托人物，但不会替人物作决定。"],
    ["阅读", "题目问“为什么”，答案最需要呈现：", ["原因链条", "漂亮形容词", "原文页码", "个人经历"], 0, "原因题应按文本证据梳理因果。"],
    ["阅读", "理解句子含义时，“表层义 + 深层义”中的深层义通常来自：", ["上下文与主题", "字数多少", "标点数量", "作者姓名"], 0, "深层含义不能脱离上下文和文章主旨。"],
    ["应用文", "通知中必须优先写清楚的是：", ["时间、地点、对象、事项", "作者心情", "修辞手法", "故事结局"], 0, "通知的首要目标是让接收者知道何时何地做什么。"],
    ["应用文", "请假条的称呼通常写在：", ["第一行顶格", "末行右下角", "标题之后居中", "正文最后"], 0, "应用文称呼一般第一行顶格写。"],
    ["应用文", "写建议书时，建议应当：", ["具体且可执行", "越抽象越好", "只批评不解决", "与问题无关"], 0, "建议要针对问题，并能落实到行动。"],
    ["语用", "把“我认为这个方案大概可能可行”改得简洁，应为：", ["我认为这个方案可能可行", "我大概认为可能这个方案可行", "这个方案我认为大概可能可行", "我认为大概这个方案可能也许可行"], 0, "“大概”和“可能”语义重复，删去一个。"],
    ["语用", "排列句序时，最适合放在开头的句子通常是：", ["提出话题或总领内容的句子", "含“因此”的句子", "含“但是”的句子", "总结全文的句子"], 0, "开头一般负责引出对象或总领下文。"],
    ["语用", "仿写句子首先要保持：", ["句式结构与修辞对应", "字数完全相同", "每个词都相同", "内容完全重复"], 0, "仿写看结构、修辞和语意关系，不是机械复制。"],
    ["写作", "议论文提出观点后，下一步最需要：", ["用事实或道理论证", "立刻结束", "改写标题", "只抒情"], 0, "观点必须有论据和分析支撑。"],
    ["写作", "记叙文让人物鲜活，最有效的方法是：", ["用具体动作、语言和细节", "连续评价人物优秀", "只介绍姓名", "大量使用口号"], 0, "细节让人物性格通过行为显现。"],
    ["写作", "材料作文审题时，应重点寻找：", ["材料中的核心关系与倾向", "生僻字数量", "材料出处页码", "最长的一句话"], 0, "立意来自材料核心矛盾、因果或价值倾向。"],
    ["写作", "文章结尾照应开头的主要作用是：", ["结构完整，强化中心", "增加人物数量", "改变叙述人称", "避免使用标点"], 0, "首尾照应能收束全文并突出主题。"],
    ["字词", "“锲而不舍”的“锲”读音是：", ["qiè", "qì", "kè", "jié"], 0, "锲而不舍：qiè ér bù shě。"],
    ["字词", "下列词语书写正确的是：", ["迫不及待", "再接再励", "谈笑风声", "金榜提名"], 0, "其余应为“再接再厉、谈笑风生、金榜题名”。"],
    ["字词", "“因地制宜”中的“宜”意思是：", ["适当、合适", "应该", "喜欢", "便宜"], 0, "因地制宜指根据各地具体情况制定适宜办法。"],
    ["字词", "“栩栩如生”最适合形容：", ["艺术形象非常生动", "天气十分寒冷", "道路非常拥挤", "声音非常微弱"], 0, "栩栩如生常形容艺术形象生动逼真。"],
    ["逻辑", "“所有认真复习的人都会进步，小林认真复习。”可推出：", ["小林会进步", "小林一定满分", "只有小林进步", "不复习也会进步"], 0, "按已给前提可推出小林会进步，不能扩大结论。"],
    ["逻辑", "“有些同学喜欢诗歌”不能推出：", ["所有同学都喜欢诗歌", "至少一名同学喜欢诗歌", "喜欢诗歌的是同学", "存在喜欢诗歌的人"], 0, "“有些”不能扩大为“所有”。"],
    ["衔接", "上句说“阅读让人看见更大的世界”，下句最自然的是：", ["因此，我们应给每天留一点阅读时间。", "但是桌子是木头做的。", "昨天的雨很大。", "他买了一双鞋。"], 0, "“因此”承接前句意义并提出行动。"],
    ["衔接", "句群先讲问题，再讲办法，中间最适合的过渡句是：", ["面对这些问题，我们可以从三方面改进。", "总之，故事结束了。", "与此同时，他很高。", "例如，问题很多。"], 0, "过渡句需承上概括问题、启下引出办法。"],
  ].map(([category, prompt, choices, answer, explanation], index) => ({
    id: `chinese-extra-${index + 1}`, subject: "chinese", category, type: "choice",
    prompt, choices, answer, explanation,
  }));

  const state = {
    words: FALLBACK_WORDS,
    mode: null,
    queue: [],
    index: 0,
    score: 0,
    combo: 0,
    bestCombo: 0,
    lives: 3,
    answered: false,
    lastCorrect: false,
    lastExplanation: "",
    chosenTokens: [],
    timer: null,
    seconds: 0,
    dirty: false,
    rng: Math.random,
    questionCycle: [],
  };
  const speechSupported = typeof window.speechSynthesis?.speak === "function"
    && typeof window.SpeechSynthesisUtterance === "function";
  let activeUtterance = null;
  let speechSequence = 0;
  let englishVoices = [];

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = (value) => String(value ?? "").replace(/[&<>"]/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;",
  })[char]);
  const todayKey = () => {
    const date = new Date();
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const hash = (value) => {
    let result = 2166136261;
    for (const char of String(value)) {
      result ^= char.charCodeAt(0);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };
  const seeded = (seedValue) => {
    let seed = hash(seedValue) || 1;
    return () => {
      seed += 0x6d2b79f5;
      let value = seed;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  };
  const pick = (items, rng = state.rng) => items[Math.floor(rng() * items.length)];
  const pickWeighted = (items, getWeight, rng = state.rng) => {
    if (!items.length) return undefined;
    const weighted = items.map((item) => ({ item, weight: Math.max(0.01, Number(getWeight(item)) || 0.01) }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    let cursor = rng() * total;
    for (const entry of weighted) {
      cursor -= entry.weight;
      if (cursor <= 0) return entry.item;
    }
    return weighted.at(-1).item;
  };
  const shuffle = (items, rng = state.rng) => {
    const copy = [...items];
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const next = Math.floor(rng() * (index + 1));
      [copy[index], copy[next]] = [copy[next], copy[index]];
    }
    return copy;
  };
  const normalize = (value) => String(value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const asRecord = (value) => value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const asNumber = (value) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const getArcade = () => loadProgress()[ARCADE_KEY];

  function pickAdaptiveWord(rng = state.rng) {
    const progress = loadProgress();
    const now = Date.now();
    return pickWeighted(state.words, (word) => {
      const record = asRecord(progress.words[String(word.id)]);
      const mastery = Math.max(0, Math.min(5, asNumber(record.mastery)));
      const wrong = asNumber(record.wrong);
      const due = asNumber(record.due);
      const unseen = !record.last && !record.correct && !record.wrong;
      const overdue = due > 0 && due <= now;
      return 1 + (5 - mastery) * 1.2 + Math.min(wrong, 5) * 1.8 + Number(unseen) * 2.2 + Number(overdue) * 7;
    }, rng) || pick(state.words, rng);
  }

  async function loadWordBank() {
    try {
      const response = await fetch("/assets/NianStudyApp-YImpRfNC.js", { cache: "no-cache" });
      if (!response.ok) return;
      const source = await response.text();
      const pattern = /\{id:(\d+),word:`([^`]*)`,phonetic:`([^`]*)`,meaning:`([^`]*)`\}/g;
      const words = [];
      const seen = new Set();
      for (const match of source.matchAll(pattern)) {
        const id = Number(match[1]);
        if (id < 1 || id > 822 || seen.has(id)) continue;
        seen.add(id);
        words.push({ id, word: match[2], phonetic: match[3], meaning: match[4] });
      }
      if (words.length >= 800) state.words = words.sort((a, b) => a.id - b.id);
    } catch {
      // The fallback set keeps the arcade usable offline on a first visit.
    }
  }

  function makeChoices(answer, candidates, rng = state.rng) {
    const alternatives = shuffle([...new Set(candidates.filter((item) => item !== answer))], rng).slice(0, 3);
    const choices = shuffle([answer, ...alternatives], rng);
    return { choices, answer: choices.indexOf(answer) };
  }

  function wordQuestion(kind, rng = state.rng) {
    const word = pickAdaptiveWord(rng);
    const others = state.words.filter((item) => item.id !== word.id);
    if (kind === "listen") {
      const options = makeChoices(word.meaning, others.map((item) => item.meaning), rng);
      return {
        id: `listen-${word.id}`, subject: "english", type: "choice", kind, wordId: word.id,
        eyebrow: "不显示英文 · 先用耳朵作答", prompt: "听清发音，选出正确释义。",
        speech: word.word.split("/")[0], phonetic: word.phonetic,
        choices: options.choices, answer: options.answer,
        explanation: `${word.word} /${word.phonetic}/：${word.meaning}`,
      };
    }
    if (kind === "dictation") {
      const answer = word.word.split("/")[0];
      return {
        id: `dictation-${word.id}`, subject: "english", type: "input", kind, wordId: word.id,
        eyebrow: "听写 · 不给首字母", prompt: "播放发音，把完整英文写下来。",
        speech: answer, phonetic: word.phonetic, hint: `${word.meaning} · ${answer.length} 个字母`,
        expected: answer, explanation: `${answer} /${word.phonetic}/：${word.meaning}`,
      };
    }
    const options = makeChoices(word.meaning, others.map((item) => item.meaning), rng);
    return {
      id: `meaning-${word.id}`, subject: "english", type: "choice", kind: "meaning", wordId: word.id,
      eyebrow: `NO.${String(word.id).padStart(3, "0")} · 识义`, prompt: word.word,
      subprompt: `/${word.phonetic}/`, choices: options.choices, answer: options.answer,
      explanation: `${word.word}：${word.meaning}`,
    };
  }

  function sentenceQuestion(rng = state.rng) {
    const item = pick(SENTENCES, rng);
    const tokens = item.sentence.split(" ");
    return {
      id: item.id, subject: "english", type: "tokens", kind: "sentence",
      eyebrow: "句阵重排 · 语序", prompt: item.meaning,
      tokens: shuffle(tokens.map((label, index) => ({ label, index })), rng),
      expected: normalize(item.sentence),
      explanation: `${item.sentence}. ${item.rule}。`,
    };
  }

  function listeningQuestion(rng = state.rng) {
    const item = pick(LISTENING_QUESTIONS, rng);
    if (!item) return wordQuestion("listen", rng);
    return {
      id: item.id, subject: "english", type: "choice", kind: "listening",
      eyebrow: `听句寻意 · ${item.skill || "关键信息"}`, prompt: item.prompt,
      speech: item.speech, choices: [...item.choices], answer: item.answer,
      explanation: item.explanation,
    };
  }

  function readingQuestion(rng = state.rng) {
    const item = pick(READING_QUESTIONS, rng);
    if (!item) return chineseQuestion(rng);
    return {
      id: item.id, subject: "chinese", type: "choice", kind: "reading",
      eyebrow: `短章取证 · ${item.skill || "阅读"}`, passage: item.passage,
      prompt: item.prompt, choices: [...item.choices], answer: item.answer,
      explanation: item.explanation,
    };
  }

  function numberChoices(answer, spread = 3, rng = state.rng) {
    const values = new Set([answer]);
    let step = 1;
    while (values.size < 4) {
      const sign = values.size % 2 ? 1 : -1;
      values.add(answer + sign * step * spread);
      step += 1;
    }
    return makeChoices(String(answer), [...values].map(String), rng);
  }

  const MATH_BUILDERS = [
    (rng) => {
      const x = 2 + Math.floor(rng() * 9), a = 2 + Math.floor(rng() * 7), b = 1 + Math.floor(rng() * 12);
      const c = a * x + b, options = numberChoices(x, 1, rng);
      return { topic: "一元一次方程", prompt: `解方程：${a}x + ${b} = ${c}`, ...options, explanation: `移项得 ${a}x=${c - b}，所以 x=${x}。` };
    },
    (rng) => {
      const a1 = 1 + Math.floor(rng() * 8), d = 2 + Math.floor(rng() * 7), n = 5 + Math.floor(rng() * 8);
      const answer = a1 + (n - 1) * d, options = numberChoices(answer, d, rng);
      return { topic: "等差数列", prompt: `等差数列首项为 ${a1}，公差为 ${d}，第 ${n} 项是？`, ...options, explanation: `aₙ=a₁+(n-1)d=${a1}+${n - 1}×${d}=${answer}。` };
    },
    (rng) => {
      const red = 2 + Math.floor(rng() * 7), blue = 2 + Math.floor(rng() * 7), total = red + blue;
      const answer = `${red}/${total}`;
      const candidates = [answer, `${blue}/${total}`, `${red}/${blue}`, `1/${total}`];
      const choices = shuffle([...new Set(candidates)], rng);
      while (choices.length < 4) choices.push(`${choices.length + 1}/${total}`);
      return { topic: "古典概率", prompt: `袋中有 ${red} 个红球和 ${blue} 个蓝球，随机取 1 个，取到红球的概率是？`, choices, answer: choices.indexOf(answer), explanation: `等可能结果共 ${total} 个，红球有 ${red} 个，概率为 ${answer}。` };
    },
    (rng) => {
      const price = (5 + Math.floor(rng() * 16)) * 10, discount = pick([8, 9, 75], rng);
      const rate = discount === 75 ? 0.75 : discount / 10, answer = price * rate;
      const options = numberChoices(answer, 10, rng);
      return { topic: "百分数", prompt: `一件商品原价 ${price} 元，打${discount === 75 ? "七五" : discount}折后售价多少元？`, ...options, explanation: `${price}×${rate}=${answer}（元）。` };
    },
    (rng) => {
      const k = 1 + Math.floor(rng() * 6), b = Math.floor(rng() * 8), x = 2 + Math.floor(rng() * 7);
      const answer = k * x + b, options = numberChoices(answer, k, rng);
      return { topic: "一次函数", prompt: `函数 y=${k}x+${b}，当 x=${x} 时，y 等于？`, ...options, explanation: `代入 x=${x}：y=${k}×${x}+${b}=${answer}。` };
    },
    (rng) => {
      const length = 4 + Math.floor(rng() * 10), width = 3 + Math.floor(rng() * 8);
      const answer = 2 * (length + width), options = numberChoices(answer, 2, rng);
      return { topic: "平面几何", prompt: `长方形长 ${length}、宽 ${width}，周长是？`, ...options, explanation: `周长=2×(长+宽)=2×(${length}+${width})=${answer}。` };
    },
    (rng) => {
      const base = pick([2, 3, 5], rng), m = 2 + Math.floor(rng() * 4), n = 1 + Math.floor(rng() * 3);
      const answer = base ** (m + n), options = numberChoices(answer, base ** Math.max(1, m + n - 2), rng);
      return { topic: "指数运算", prompt: `${base}${sup(m)} × ${base}${sup(n)} = ?`, ...options, explanation: `同底数幂相乘，指数相加：${base}${sup(m + n)}=${answer}。` };
    },
    (rng) => {
      const a = 1 + Math.floor(rng() * 8), x = a + 1 + Math.floor(rng() * 6);
      const correct = `x > ${a}`;
      const choices = shuffle([correct, `x < ${a}`, `x ≥ ${a}`, `x ≤ ${a}`], rng);
      return { topic: "不等式", prompt: `下列哪一项表示“x 比 ${a} 大”？`, choices, answer: choices.indexOf(correct), explanation: `“比 ${a} 大”不包含 ${a}，写作 x>${a}。示例 x=${x} 满足。` };
    },
    (rng) => {
      const a = 1 + Math.floor(rng() * 5), b = 1 + Math.floor(rng() * 5);
      const answer = Math.sqrt(a * a + b * b).toFixed(2);
      const candidates = [answer, String(a + b), String(a * b), Math.abs(a - b).toFixed(2)];
      const choices = shuffle([...new Set(candidates)], rng);
      while (choices.length < 4) choices.push(String(Number(answer) + choices.length));
      return { topic: "向量长度", prompt: `向量 a=(${a}, ${b}) 的模约为？（保留两位小数）`, choices, answer: choices.indexOf(answer), explanation: `|a|=√(${a}²+${b}²)≈${answer}。` };
    },
    (rng) => {
      const total = 5 + Math.floor(rng() * 8), chosen = 2;
      const answer = total * (total - 1) / 2, options = numberChoices(answer, total - 2, rng);
      return { topic: "排列组合", prompt: `从 ${total} 人中任选 ${chosen} 人，有多少种选法？`, ...options, explanation: `组合数 C(${total},2)=${total}×${total - 1}÷2=${answer}。` };
    },
    (rng) => {
      const a = 1 + Math.floor(rng() * 5), b = a + 1 + Math.floor(rng() * 5);
      const correct = `x=${a} 或 x=${b}`;
      const choices = shuffle([correct, `x=${a + b}`, `x=${a * b}`, `x=${b - a}`], rng);
      return { topic: "二次方程", prompt: `解方程：(x-${a})(x-${b})=0`, choices, answer: choices.indexOf(correct), explanation: `两个因式至少一个为 0，所以 x=${a} 或 x=${b}。` };
    },
    (rng) => {
      const a1 = 1 + Math.floor(rng() * 6), d = 1 + Math.floor(rng() * 5), n = 5 + Math.floor(rng() * 6);
      const last = a1 + (n - 1) * d, answer = n * (a1 + last) / 2;
      const options = numberChoices(answer, n, rng);
      return { topic: "数列求和", prompt: `等差数列首项 ${a1}、公差 ${d}，前 ${n} 项和为？`, ...options, explanation: `第 ${n} 项为 ${last}，Sₙ=${n}×(${a1}+${last})÷2=${answer}。` };
    },
    (rng) => {
      const base = (4 + Math.floor(rng() * 9)) * 10, rate = pick([10, 20, 25, 50], rng);
      const answer = base * (1 + rate / 100), options = numberChoices(answer, 10, rng);
      return { topic: "增长率", prompt: `某数为 ${base}，增长 ${rate}% 后是多少？`, ...options, explanation: `${base}×(1+${rate}%)=${answer}。` };
    },
    (rng) => {
      const start = 2 + Math.floor(rng() * 7), values = [start, start + 2, start + 4, start + 6];
      const answer = start + 3, options = numberChoices(answer, 1, rng);
      return { topic: "平均数", prompt: `数据 ${values.join("、")} 的平均数是？`, ...options, explanation: `总和为 ${values.reduce((sum, value) => sum + value, 0)}，除以 4 得 ${answer}。` };
    },
    (rng) => {
      const x1 = Math.floor(rng() * 6), y1 = Math.floor(rng() * 6), x2 = x1 + 2 * (1 + Math.floor(rng() * 4)), y2 = y1 + 2 * (1 + Math.floor(rng() * 4));
      const correct = `(${(x1 + x2) / 2}, ${(y1 + y2) / 2})`;
      const choices = shuffle([correct, `(${x1 + x2}, ${y1 + y2})`, `(${x2 - x1}, ${y2 - y1})`, `(${x1}, ${y2})`], rng);
      return { topic: "坐标中点", prompt: `A(${x1}, ${y1})、B(${x2}, ${y2}) 的中点坐标是？`, choices, answer: choices.indexOf(correct), explanation: `横、纵坐标分别取平均，得到 ${correct}。` };
    },
    (rng) => {
      const base = pick([2, 3, 5], rng), exponent = 2 + Math.floor(rng() * 4), value = base ** exponent;
      const options = numberChoices(exponent, 1, rng);
      return { topic: "对数", prompt: `log${sup(base)} ${value} = ?`, ...options, explanation: `因为 ${base}${sup(exponent)}=${value}，所以 log${sup(base)} ${value}=${exponent}。` };
    },
    (rng) => {
      const x = 2 + Math.floor(rng() * 6), y = 1 + Math.floor(rng() * 5), sum = x + y, difference = x - y;
      const correct = `x=${x}, y=${y}`;
      const choices = shuffle([correct, `x=${y}, y=${x}`, `x=${sum}, y=${difference}`, `x=${sum / 2}, y=${difference / 2}`], rng);
      return { topic: "方程组", prompt: `已知 x+y=${sum}，x-y=${difference}，则？`, choices, answer: choices.indexOf(correct), explanation: `两式相加得 2x=${sum + difference}，所以 x=${x}，再得 y=${y}。` };
    },
    (rng) => {
      const values = shuffle([3, 5, 7, 9].map((step) => step + Math.floor(rng() * 4)), rng);
      const answer = Math.max(...values) - Math.min(...values), options = numberChoices(answer, 1, rng);
      return { topic: "极差", prompt: `数据 ${values.join("、")} 的极差是？`, ...options, explanation: `极差=最大值 ${Math.max(...values)}-最小值 ${Math.min(...values)}=${answer}。` };
    },
  ];

  function sup(value) {
    const digits = { 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
    return String(value).split("").map((digit) => digits[digit] || digit).join("");
  }

  function mathQuestion(rng = state.rng) {
    const built = pick(MATH_BUILDERS, rng)(rng);
    return {
      id: `math-extra-${built.topic}-${Math.floor(rng() * 1e8)}`,
      subject: "math", type: "choice", kind: "math", eyebrow: `算学千变 · ${built.topic}`,
      ...built,
    };
  }

  function chineseQuestion(rng = state.rng) {
    return { ...pick(CHINESE_QUESTIONS, rng), kind: "chinese", eyebrow: "经史百问" };
  }

  function subjectStats(progress, subject) {
    const records = subject === "math" ? progress.mathQuestions
      : subject === "chinese" ? progress.chineseQuestions : progress.englishQuestions;
    const values = Object.entries(asRecord(records)).filter(([key]) => !key.startsWith("arcade:")).map(([, value]) => asRecord(value));
    let attempts = values.reduce((sum, record) => sum + asNumber(record.attempts), 0);
    let correct = values.reduce((sum, record) => sum + asNumber(record.correct), 0);
    for (const [key, value] of Object.entries(asRecord(progress[ARCADE_KEY]?.skills))) {
      if (!key.startsWith(`${subject}:`)) continue;
      const record = asRecord(value);
      attempts += asNumber(record.attempts);
      correct += asNumber(record.correct);
    }
    return { attempts, correct, rate: attempts ? correct / attempts : 0.58 };
  }

  function adaptiveCycle(progress) {
    const ordered = ["english", "math", "chinese"]
      .map((subject) => ({ subject, ...subjectStats(progress, subject) }))
      .sort((a, b) => a.rate - b.rate || a.attempts - b.attempts);
    const pools = {
      english: ["listening", "dictation", "sentence", "listen", "meaning"],
      math: ["math"],
      chinese: ["reading", "chinese"],
    };
    const positions = [0, 1, 0, 2, 0, 1, 0, 2, 1, 0];
    const offsets = { english: 0, math: 0, chinese: 0 };
    return positions.map((rank) => {
      const subject = ordered[rank].subject;
      const pool = pools[subject];
      const type = pool[offsets[subject] % pool.length];
      offsets[subject] += 1;
      return type;
    });
  }

  function questionForType(type, rng) {
    if (type === "math") return mathQuestion(rng);
    if (type === "chinese") return chineseQuestion(rng);
    if (type === "reading") return readingQuestion(rng);
    if (type === "sentence") return sentenceQuestion(rng);
    if (type === "listening") return listeningQuestion(rng);
    return wordQuestion(type, rng);
  }

  function createQuestion(mode, index, rng = state.rng) {
    if (mode === "listen") return wordQuestion("listen", rng);
    if (mode === "listening") return listeningQuestion(rng);
    if (mode === "dictation") return wordQuestion("dictation", rng);
    if (mode === "sentence") return sentenceQuestion(rng);
    if (mode === "math") return mathQuestion(rng);
    if (mode === "chinese") return chineseQuestion(rng);
    if (mode === "reading") return readingQuestion(rng);
    const cycle = ["daily", "adaptive"].includes(mode)
      ? (state.questionCycle.length ? state.questionCycle : adaptiveCycle(loadProgress()))
      : ["listen", "math", "reading", "meaning", "math", "chinese", "listening", "sentence", "dictation"];
    const type = cycle[index % cycle.length];
    return questionForType(type, rng);
  }

  function defaultToday(date = todayKey()) {
    return { date, english: 0, attempts: 0, reviewed: 0, math: 0, chinese: 0, focus: 0, boss: 0, ticketMilestones: 0 };
  }

  function loadProgress() {
    try {
      const progress = asRecord(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
      progress.version = asNumber(progress.version) || 4;
      progress.xp = asNumber(progress.xp);
      progress.words = asRecord(progress.words);
      progress.totals = { english: 0, reviewed: 0, math: 0, chinese: 0, focus: 0, ...asRecord(progress.totals) };
      for (const field of ["english", "reviewed", "math", "chinese", "focus"]) {
        progress.totals[field] = asNumber(progress.totals[field]);
      }
      progress.englishQuestions = asRecord(progress.englishQuestions);
      progress.mathQuestions = asRecord(progress.mathQuestions);
      progress.chineseQuestions = asRecord(progress.chineseQuestions);
      progress.history = asRecord(progress.history);
      const storedToday = asRecord(progress.today);
      progress.today = { ...defaultToday(storedToday.date || todayKey()), ...storedToday };
      if (typeof progress.today.date !== "string") progress.today.date = todayKey();
      if (progress.today.date !== todayKey()) {
        if (progress.today.date) progress.history[progress.today.date] = { ...progress.today };
        progress.today = defaultToday();
      }
      for (const field of ["english", "attempts", "reviewed", "math", "chinese", "focus", "boss", "ticketMilestones"]) {
        progress.today[field] = asNumber(progress.today[field]);
      }
      const storedArcade = asRecord(progress[ARCADE_KEY]);
      progress[ARCADE_KEY] = {
        attempts: 0, correct: 0, bestCombo: 0, bestEndless: 0, runs: 0,
        modes: {}, mistakes: {}, daily: {}, badges: [], skills: {}, recent: [],
        ...storedArcade,
      };
      const arcade = progress[ARCADE_KEY];
      for (const field of ["attempts", "correct", "bestCombo", "bestEndless", "runs"]) {
        arcade[field] = asNumber(arcade[field]);
      }
      arcade.modes = asRecord(arcade.modes);
      for (const [mode, storedMode] of Object.entries(arcade.modes)) {
        const modeProgress = asRecord(storedMode);
        arcade.modes[mode] = {
          ...modeProgress,
          attempts: asNumber(modeProgress.attempts),
          correct: asNumber(modeProgress.correct),
          best: asNumber(modeProgress.best),
        };
      }
      arcade.mistakes = asRecord(arcade.mistakes);
      arcade.daily = asRecord(arcade.daily);
      arcade.badges = Array.isArray(arcade.badges) ? arcade.badges.filter((badge) => typeof badge === "string") : [];
      arcade.skills = asRecord(arcade.skills);
      for (const [key, storedSkill] of Object.entries(arcade.skills)) {
        const skill = asRecord(storedSkill);
        arcade.skills[key] = {
          attempts: asNumber(skill.attempts), correct: asNumber(skill.correct),
          wrongStreak: asNumber(skill.wrongStreak), correctStreak: asNumber(skill.correctStreak),
          last: asNumber(skill.last), due: asNumber(skill.due),
        };
      }
      arcade.recent = Array.isArray(arcade.recent) ? arcade.recent.filter((item) => item && typeof item === "object").slice(-80) : [];
      arcade.mistakes = Object.fromEntries(Object.entries(arcade.mistakes)
        .sort(([, a], [, b]) => asNumber(b?.wrongAt) - asNumber(a?.wrongAt)).slice(0, 120));
      arcade.daily = Object.fromEntries(Object.entries(arcade.daily).sort(([a], [b]) => b.localeCompare(a)).slice(0, 60));
      return progress;
    } catch {
      return {
        version: 4, xp: 0, words: {}, totals: { english: 0, reviewed: 0, math: 0, chinese: 0, focus: 0 },
        englishQuestions: {}, mathQuestions: {}, chineseQuestions: {}, history: {}, today: defaultToday(),
        [ARCADE_KEY]: { attempts: 0, correct: 0, bestCombo: 0, bestEndless: 0, runs: 0, modes: {}, mistakes: {}, daily: {}, badges: [], skills: {}, recent: [] },
      };
    }
  }

  function showStorageWarning() {
    let warning = $("#nian-arcade-storage-warning");
    if (!warning) {
      warning = document.createElement("div");
      warning.id = "nian-arcade-storage-warning";
      warning.className = "nian-arcade-storage-warning";
      warning.setAttribute("role", "alert");
      warning.textContent = "本轮可以继续，但浏览器暂时无法保存学习记录。请检查无痕模式或存储权限。";
      document.body.appendChild(warning);
    }
  }

  function saveProgress(progress) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      return true;
    } catch {
      showStorageWarning();
      return false;
    }
  }

  function touchStreak(progress) {
    const today = todayKey();
    if (progress.lastStudyDay === today) return;
    const previous = new Date();
    previous.setDate(previous.getDate() - 1);
    const previousKey = `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}-${String(previous.getDate()).padStart(2, "0")}`;
    progress.streak = progress.lastStudyDay === previousKey ? (Number(progress.streak) || 0) + 1 : 1;
    progress.lastStudyDay = today;
  }

  function awardBadges(arcade) {
    const earned = new Set(arcade.badges || []);
    if ((arcade.modes?.listen?.correct || 0) >= 10) earned.add("闻声识义");
    if ((arcade.modes?.dictation?.correct || 0) >= 10) earned.add("十词听写");
    if ((arcade.modes?.sentence?.correct || 0) >= 8) earned.add("句阵初成");
    if ((arcade.modes?.math?.correct || 0) >= 20) earned.add("算学百变");
    if ((arcade.modes?.chinese?.correct || 0) >= 20) earned.add("经史通关");
    if ((arcade.bestCombo || 0) >= 10) earned.add("十连不坠");
    if ((arcade.bestEndless || 0) >= 30) earned.add("百连三十关");
    arcade.badges = [...earned];
  }

  function skillKeyFor(question) {
    if (question.subject === "math") return `math:${question.topic || "综合"}`;
    if (question.subject === "chinese") return `chinese:${question.skill || question.category || question.kind || "综合"}`;
    return `english:${question.skill || question.kind || "综合"}`;
  }

  function recordAnswer(question, correct) {
    const progress = loadProgress();
    const arcade = progress[ARCADE_KEY];
    touchStreak(progress);
    arcade.attempts += 1;
    arcade.correct += Number(correct);
    arcade.bestCombo = Math.max(arcade.bestCombo || 0, state.combo);
    const storedMode = asRecord(arcade.modes[state.mode]);
    arcade.modes[state.mode] = {
      ...storedMode,
      attempts: asNumber(storedMode.attempts) + 1,
      correct: asNumber(storedMode.correct) + Number(correct),
      best: Math.max(asNumber(storedMode.best), state.score),
    };
    progress.today.attempts = (Number(progress.today.attempts) || 0) + 1;

    const points = correct ? 10 + Math.min(state.combo, 8) : 2;
    progress.xp += points;
    if (correct && arcade.correct % 5 === 0) progress.mutuality = (Number(progress.mutuality) || 0) + 1;

    const recordKey = `arcade:${question.id}`;
    const records = question.subject === "math" ? progress.mathQuestions
      : question.subject === "chinese" ? progress.chineseQuestions : progress.englishQuestions;
    const previousRecord = asRecord(records[recordKey]);
    records[recordKey] = {
      ...previousRecord,
      attempts: asNumber(previousRecord.attempts) + 1,
      correct: asNumber(previousRecord.correct) + Number(correct),
      last: Date.now(),
      lastCorrect: correct,
    };

    const skillKey = skillKeyFor(question);
    const previousSkill = asRecord(arcade.skills[skillKey]);
    const correctStreak = correct ? asNumber(previousSkill.correctStreak) + 1 : 0;
    const wrongStreak = correct ? 0 : asNumber(previousSkill.wrongStreak) + 1;
    arcade.skills[skillKey] = {
      attempts: asNumber(previousSkill.attempts) + 1,
      correct: asNumber(previousSkill.correct) + Number(correct),
      correctStreak,
      wrongStreak,
      last: Date.now(),
      due: correct
        ? Date.now() + [DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS][Math.min(3, Math.max(0, correctStreak - 1))]
        : Date.now() + 10 * 60 * 1000,
    };
    arcade.recent.push({ id: question.id, skill: skillKey, subject: question.subject, correct, at: Date.now() });
    arcade.recent = arcade.recent.slice(-80);

    if (question.subject === "english") {
      progress.today.english += Number(correct);
      progress.totals.english += Number(correct);
      if (question.wordId) {
        const wordKey = String(question.wordId);
        const storedWord = asRecord(progress.words[wordKey]);
        const wordRecord = {
          ...storedWord,
          mastery: asNumber(storedWord.mastery),
          wrong: asNumber(storedWord.wrong),
          correct: asNumber(storedWord.correct),
          due: asNumber(storedWord.due),
          last: asNumber(storedWord.last),
        };
        wordRecord.last = Date.now();
        if (correct) {
          wordRecord.correct += 1;
          wordRecord.mastery = Math.min(5, wordRecord.mastery + 1);
          wordRecord.due = Date.now() + [0, DAY_MS, 3 * DAY_MS, 7 * DAY_MS, 14 * DAY_MS, 30 * DAY_MS][wordRecord.mastery];
          const milestone = Math.floor(progress.today.english / 10);
          if (milestone > (progress.today.ticketMilestones || 0)) {
            progress.gameMinutes = (Number(progress.gameMinutes) || 0) + (milestone - progress.today.ticketMilestones) * 10;
            progress.today.ticketMilestones = milestone;
          }
        } else {
          wordRecord.wrong += 1;
          wordRecord.mastery = Math.max(0, wordRecord.mastery - 1);
          wordRecord.due = Date.now() + 10 * 60 * 1000;
        }
        progress.words[wordKey] = wordRecord;
      }
    } else if (question.subject === "math") {
      progress.today.math += Number(correct);
      progress.totals.math += Number(correct);
    } else {
      progress.today.chinese += Number(correct);
      progress.totals.chinese += Number(correct);
    }

    if (correct) {
      if (state.mode === "mistakes") delete arcade.mistakes[question.id];
    } else {
      arcade.mistakes[question.id] = {
        question: { ...question },
        wrongAt: Date.now(),
        attempts: (arcade.mistakes[question.id]?.attempts || 0) + 1,
      };
    }
    awardBadges(arcade);
    state.dirty = saveProgress(progress) || state.dirty;
    document.dispatchEvent(new CustomEvent("nian:study-result", { detail: {
      correct, points, mode: state.mode, subject: question.subject, skill: skillKey,
      combo: state.combo, score: state.score, attempts: arcade.attempts, totalCorrect: arcade.correct,
    } }));
    return points;
  }

  function refreshEnglishVoices() {
    if (!speechSupported) return [];
    englishVoices = window.speechSynthesis.getVoices().filter((voice) => /^en(?:-|$)/i.test(voice.lang));
    return englishVoices;
  }

  function setSpeechStatus(message, status = "idle") {
    const label = $("[data-nian-speech-status]");
    if (!label) return;
    label.textContent = message;
    label.closest(".nian-audio-orb")?.setAttribute("data-speech-state", status);
  }

  function speak(text, rate = 0.82) {
    if (!text) return false;
    if (!speechSupported) {
      setSpeechStatus("当前浏览器没有系统朗读", "error");
      return false;
    }

    const synthesis = window.speechSynthesis;
    const requestId = ++speechSequence;
    if (synthesis.speaking || synthesis.pending || synthesis.paused) synthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = rate;
    utterance.pitch = 1;
    const voices = refreshEnglishVoices();
    utterance.voice = voices.find((voice) => /^en-US$/i.test(voice.lang))
      || voices.find((voice) => /^en-GB$/i.test(voice.lang))
      || voices[0]
      || null;
    utterance.onstart = () => {
      if (requestId === speechSequence) setSpeechStatus("正在播放 · 点此可重播", "playing");
    };
    utterance.onend = () => {
      if (requestId !== speechSequence) return;
      activeUtterance = null;
      setSpeechStatus("播放完毕 · 点此重播", "idle");
    };
    utterance.onerror = (event) => {
      if (requestId !== speechSequence || ["canceled", "interrupted"].includes(event.error)) return;
      activeUtterance = null;
      setSpeechStatus("系统朗读失败，请检查英语语音包", "error");
    };

    activeUtterance = utterance;
    setSpeechStatus("正在唤起系统朗读…", "pending");
    try {
      synthesis.resume();
      synthesis.speak(utterance);
    } catch {
      activeUtterance = null;
      setSpeechStatus("系统朗读不可用，请检查媒体音量", "error");
      return false;
    }

    window.setTimeout(() => {
      if (requestId !== speechSequence || !activeUtterance) return;
      if (!synthesis.speaking && !synthesis.pending) {
        activeUtterance = null;
        setSpeechStatus("没有检测到朗读，请点此重试", "error");
      }
    }, 1500);
    return true;
  }

  function modeQueue(mode) {
    const config = MODES[mode];
    const rng = seeded(mode === "daily" ? `${todayKey()}-daily-v8` : `${mode}-${Date.now()}-${Math.random()}`);
    state.rng = rng;
    state.questionCycle = ["daily", "adaptive"].includes(mode) ? adaptiveCycle(loadProgress()) : [];
    if (mode === "mistakes") {
      const stored = Object.values(getArcade().mistakes || {}).map((item) => item.question).filter(Boolean);
      return shuffle(stored, rng).slice(0, config.count);
    }
    const queue = [];
    const seen = new Set();
    let attempts = 0;
    while (queue.length < config.count && attempts < config.count * 12) {
      const question = createQuestion(mode, queue.length, rng);
      attempts += 1;
      if (seen.has(question.id)) continue;
      seen.add(question.id);
      queue.push(question);
    }
    return queue;
  }

  function mount() {
    if ($("#nian-arcade-hub")) return true;
    const anchor = $(".hero-layout") || $(".academy-overview") || $("main");
    if (!anchor) return false;
    const arcade = getArcade();
    const section = document.createElement("section");
    section.id = "nian-arcade-hub";
    section.className = "nian-arcade-hub";
    section.innerHTML = `
      <div class="nian-arcade-heading">
        <div><span class="nian-arcade-kicker">清晖书院 · 百戏楼新开</span><h2>不只翻词笺，今天换一种赢法。</h2><p>听、写、拼、排、算、读都能真的作答；题目按词库、日期与参数轮换，不再刷两轮就见底。</p></div>
        <button type="button" class="nian-arcade-main" data-arcade-mode="daily"><span>念安今日卷</span><strong>自适应 20 题</strong><i>开卷 →</i></button>
      </div>
      <div class="nian-arcade-ledger" aria-label="闯关进度">
        <span><b>${Number(arcade.correct) || 0}</b> 累计答对</span>
        <span><b>${Number(arcade.bestCombo) || 0}</b> 最佳连击</span>
        <span><b>${Object.keys(arcade.mistakes || {}).length}</b> 待追错题</span>
        <span><b>${(arcade.badges || []).length}</b> 枚闯关印记</span>
      </div>
      <div class="nian-arcade-grid">
        ${["adaptive", "listen", "listening", "dictation", "sentence", "math", "chinese", "reading", "mixed", "endless"].map((mode) => modeCard(mode)).join("")}
      </div>
      <div class="nian-arcade-foot">
        <span>英语：822 词 × 单词 / 句子 / 对话听力</span><span>数学：${MATH_BUILDERS.length} 类参数变式</span><span>语文：专项题 + ${READING_QUESTIONS.length} 篇短章</span>
        <button type="button" data-arcade-mode="mistakes" ${Object.keys(arcade.mistakes || {}).length ? "" : "disabled"}>追击错题 ${Object.keys(arcade.mistakes || {}).length}</button>
      </div>`;
    anchor.insertAdjacentElement("afterend", section);

    const fab = document.createElement("button");
    fab.type = "button";
    fab.className = "nian-arcade-fab";
    fab.dataset.arcadeMode = "daily";
    fab.innerHTML = "<span>闯</span><strong>百戏楼</strong>";
    document.body.appendChild(fab);

    const modal = document.createElement("div");
    modal.id = "nian-arcade-modal";
    modal.className = "nian-arcade-modal";
    modal.hidden = true;
    modal.innerHTML = `<div class="nian-arcade-backdrop" data-arcade-action="close"></div><section class="nian-arcade-sheet" role="dialog" aria-modal="true" aria-labelledby="nian-arcade-title"><div id="nian-arcade-stage"></div></section>`;
    document.body.appendChild(modal);

    document.addEventListener("click", handleClick);
    document.addEventListener("submit", handleSubmit);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !modal.hidden) closeArcade();
    });
    return true;
  }

  function modeCard(mode) {
    const item = MODES[mode];
    const banks = {
      adaptive: "按薄弱点配卷", listen: "822 词发音", listening: `${LISTENING_QUESTIONS.length} 组句段`,
      dictation: "822 词听写", sentence: `${SENTENCES.length} 组句阵`, math: `${MATH_BUILDERS.length} 类变式`,
      chinese: `${CHINESE_QUESTIONS.length} 道专项`, reading: `${READING_QUESTIONS.length} 篇短章`,
      mixed: "三科轮换", endless: "三心百关",
    };
    const bank = banks[mode] || "随学录变化";
    return `<button type="button" class="nian-mode-card tone-${item.tone}" data-arcade-mode="${mode}"><span>${item.seal}</span><small>${bank}</small><strong>${item.title}</strong><p>${item.note}</p><i>入楼挑战 →</i></button>`;
  }

  function startMode(mode) {
    if (!MODES[mode]) return;
    const queue = modeQueue(mode);
    if (!queue.length) {
      showEmptyMistakes();
      return;
    }
    const hadUnsyncedPanel = state.dirty;
    Object.assign(state, {
      mode, queue, index: 0, score: 0, combo: 0, bestCombo: 0, lives: 3,
      answered: false, lastCorrect: false, lastExplanation: "", chosenTokens: [], dirty: hadUnsyncedPanel,
    });
    const modal = $("#nian-arcade-modal");
    modal.hidden = false;
    document.body.classList.add("nian-arcade-open");
    renderQuestion();
  }

  function showEmptyMistakes() {
    const modal = $("#nian-arcade-modal");
    modal.hidden = false;
    document.body.classList.add("nian-arcade-open");
    $("#nian-arcade-stage").innerHTML = `<div class="nian-empty-arcade"><span>净</span><h2>这里暂时没有旧误。</h2><p>去任意一馆闯几关；答错的题会自动来这里排队，不需要手抄第二本错题册。</p><button type="button" data-arcade-mode="mixed">去三馆巡考</button><button type="button" data-arcade-action="close">返回书院</button></div>`;
  }

  function currentQuestion() {
    return state.queue[state.index];
  }

  function renderQuestion() {
    const question = currentQuestion();
    if (!question || (state.mode === "endless" && state.lives <= 0)) {
      finishSession();
      return;
    }
    state.answered = false;
    state.chosenTokens = [];
    const config = MODES[state.mode];
    const progress = state.mode === "endless" ? `${state.index + 1} / 100` : `${state.index + 1} / ${state.queue.length}`;
    $("#nian-arcade-stage").innerHTML = `
      <header class="nian-arcade-sheet-head">
        <div class="nian-arcade-mode-seal tone-${config.tone}">${config.seal}</div>
        <div><span>${config.title}</span><h2 id="nian-arcade-title">${question.eyebrow || config.note}</h2></div>
        <div class="nian-arcade-run"><strong>${progress}</strong><small>连击 ${state.combo}</small></div>
        <button type="button" class="nian-arcade-close" data-arcade-action="close" aria-label="退出闯关">×</button>
      </header>
      <div class="nian-arcade-status"><i style="width:${Math.min(100, ((state.index + 1) / state.queue.length) * 100)}%"></i></div>
      <div class="nian-arcade-scorebar"><span>答对 <b>${state.score}</b></span><span>最佳连击 <b>${state.bestCombo}</b></span>${state.mode === "endless" ? `<span>余心 <b>${"♥".repeat(state.lives)}${"♡".repeat(3 - state.lives)}</b></span>` : ""}</div>
      <main class="nian-question-card" aria-live="polite">
        ${question.speech ? `<div class="nian-audio-tools"><button type="button" class="nian-audio-orb" data-arcade-action="speak" data-speech-state="${speechSupported ? "idle" : "error"}" aria-label="播放英文发音"><span>▶</span><strong>播放发音</strong><small data-nian-speech-status>${speechSupported ? (question.kind === "listen" ? "英文暂不显示" : question.phonetic ? `/${esc(question.phonetic)}/` : "先听完整内容") : "当前浏览器没有系统朗读"}</small></button>${question.kind === "listening" ? `<button type="button" class="nian-audio-slow" data-arcade-action="speak-slow">慢速再听</button>` : ""}</div>` : ""}
        <span class="nian-question-eyebrow">${esc(question.eyebrow || "本题")}</span>
        ${question.passage ? `<blockquote class="nian-reading-passage">${esc(question.passage)}</blockquote>` : ""}
        <h3>${esc(question.prompt)}</h3>
        ${question.subprompt ? `<p class="nian-question-sub">${esc(question.subprompt)}</p>` : ""}
        ${question.hint ? `<p class="nian-question-hint">提示：${esc(question.hint)}</p>` : ""}
        ${questionBody(question)}
      </main>`;
    if (question.speech) speak(question.speech);
    if (question.type === "input") window.setTimeout(() => $("#nian-arcade-answer")?.focus(), 120);
  }

  function questionBody(question) {
    if (question.type === "choice") {
      return `<div class="nian-choice-grid">${question.choices.map((choice, index) => `<button type="button" data-arcade-choice="${index}"><i>${String.fromCharCode(65 + index)}</i><span>${esc(choice)}</span></button>`).join("")}</div>`;
    }
    if (question.type === "input") {
      return `<form class="nian-answer-form"><label for="nian-arcade-answer">听写答案</label><div><input id="nian-arcade-answer" name="answer" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="输入完整英文"><button type="submit">落笔核对</button></div></form>`;
    }
    return `<div class="nian-token-workbench"><div class="nian-built-line" id="nian-built-line"><span>依次点下方词块组成句子</span></div><div class="nian-token-pool">${question.tokens.map((token, index) => `<button type="button" data-arcade-token="${index}">${esc(token.label)}</button>`).join("")}</div><button type="button" class="nian-token-submit" data-arcade-action="submit-tokens">核对句阵</button></div>`;
  }

  function evaluateAnswer(value) {
    if (state.answered) return;
    const question = currentQuestion();
    let correct = false;
    if (question.type === "choice") correct = Number(value) === question.answer;
    else if (question.type === "input") correct = normalize(value) === normalize(question.expected);
    else {
      const assembled = state.chosenTokens.map((index) => question.tokens[index]?.label).filter(Boolean).join(" ");
      correct = normalize(assembled) === question.expected;
    }
    state.answered = true;
    state.lastCorrect = correct;
    state.combo = correct ? state.combo + 1 : 0;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.score += Number(correct);
    if (!correct && state.mode === "endless") state.lives -= 1;
    const points = recordAnswer(question, correct);
    renderFeedback(question, correct, points, value);
  }

  function renderFeedback(question, correct, points, value) {
    const card = $(".nian-question-card");
    card.classList.add(correct ? "is-correct" : "is-wrong");
    card.querySelectorAll("button[data-arcade-choice]").forEach((button) => {
      const index = Number(button.dataset.arcadeChoice);
      button.disabled = true;
      if (index === question.answer) button.classList.add("is-correct");
      else if (index === Number(value)) button.classList.add("is-wrong");
    });
    const feedback = document.createElement("div");
    feedback.className = `nian-answer-feedback ${correct ? "is-correct" : "is-wrong"}`;
    feedback.innerHTML = `<span>${correct ? (state.combo >= 5 ? `${state.combo} 连！` : "落笔准确") : "这一处先收进拾遗"}</span><strong>${correct ? `+${points} 学识` : "答案已经拆开"}</strong><p>${esc(question.explanation)}</p><button type="button" data-arcade-action="next">${nextLabel()}</button>`;
    card.appendChild(feedback);
    document.dispatchEvent(new CustomEvent("nian:sound", { detail: { type: correct ? "correct" : "wrong" } }));
  }

  function nextLabel() {
    if (state.mode === "endless" && state.lives <= 0) return "查看闯关战果";
    return state.index >= state.queue.length - 1 ? "结卷看战果" : "下一题 →";
  }

  function nextQuestion() {
    if (!state.answered) return;
    if (state.mode === "endless" && state.lives <= 0) {
      finishSession();
      return;
    }
    state.index += 1;
    if (state.mode === "endless" && state.index < 100 && !state.queue[state.index]) {
      state.queue.push(createQuestion("endless", state.index, state.rng));
    }
    if (state.index >= state.queue.length) finishSession();
    else renderQuestion();
  }

  function finishSession() {
    clearInterval(state.timer);
    const progress = loadProgress();
    const arcade = progress[ARCADE_KEY];
    arcade.runs += 1;
    arcade.bestCombo = Math.max(arcade.bestCombo || 0, state.bestCombo);
    if (state.mode === "endless") arcade.bestEndless = Math.max(arcade.bestEndless || 0, state.score);
    if (state.mode === "daily") arcade.daily[todayKey()] = { score: state.score, total: state.queue.length, finishedAt: Date.now() };
    awardBadges(arcade);
    state.dirty = saveProgress(progress) || state.dirty;
    const config = MODES[state.mode];
    const total = state.mode === "endless" ? Math.max(state.index + 1, state.score) : state.queue.length;
    const rate = total ? Math.round((state.score / total) * 100) : 0;
    const weakest = Object.entries(asRecord(arcade.skills))
      .map(([key, value]) => ({ key, value: asRecord(value), rate: asNumber(value?.attempts) ? asNumber(value?.correct) / asNumber(value?.attempts) : 1 }))
      .filter((item) => asNumber(item.value.attempts) >= 2)
      .sort((a, b) => a.rate - b.rate)[0];
    const nextAdvice = weakest
      ? `下一卷先补“${weakest.key.split(":").slice(1).join(":")}”，我已经把它往前排了。`
      : "再完成一卷，我就能更准确地判断下一处该补哪里。";
    $("#nian-arcade-stage").innerHTML = `
      <div class="nian-session-result tone-${config.tone}">
        <button type="button" class="nian-arcade-close" data-arcade-action="close" aria-label="退出闯关">×</button>
        <span class="nian-result-seal">${config.seal}</span><small>${config.title} · 结卷</small>
        <h2>${rate >= 85 ? "这一卷，赢得很漂亮。" : rate >= 60 ? "路已经走通，薄处也照出来了。" : "先不硬撑，错处已经排好队。"}</h2>
        <div class="nian-result-numbers"><span><b>${state.score}</b>答对</span><span><b>${state.bestCombo}</b>最高连击</span><span><b>${rate}%</b>正确率</span></div>
        <p>${rate >= 85 ? "念安把卷角压平了：这次不是手感，是你真的听清、想过、算对了。" : "答错的题已自动放进“错题追击”，下次只补薄处，不用整卷重刷。"} ${esc(nextAdvice)}</p>
        <div class="nian-result-actions"><button type="button" data-arcade-mode="${state.mode}">再开一卷</button><button type="button" data-arcade-action="close" class="primary">带战果回书院</button></div>
        <div class="nian-badge-strip">${(arcade.badges || []).length ? arcade.badges.map((badge) => `<span>${esc(badge)}</span>`).join("") : "<span>再过几关，第一枚闯关印记就会出现。</span>"}</div>
      </div>`;
    document.dispatchEvent(new CustomEvent("nian:session-finished", { detail: {
      mode: state.mode, score: state.score, total, rate, bestCombo: state.bestCombo,
      weakestSkill: weakest?.key || "",
    } }));
  }

  function updateTokens() {
    const question = currentQuestion();
    const built = $("#nian-built-line");
    if (!built) return;
    built.innerHTML = state.chosenTokens.length
      ? state.chosenTokens.map((index, order) => `<button type="button" data-arcade-remove-token="${order}">${esc(question.tokens[index].label)}</button>`).join("")
      : "<span>依次点下方词块组成句子</span>";
    document.querySelectorAll("[data-arcade-token]").forEach((button) => {
      button.disabled = state.chosenTokens.includes(Number(button.dataset.arcadeToken));
    });
  }

  function closeArcade() {
    clearInterval(state.timer);
    speechSequence += 1;
    window.speechSynthesis?.cancel();
    activeUtterance = null;
    const modal = $("#nian-arcade-modal");
    if (modal) modal.hidden = true;
    document.body.classList.remove("nian-arcade-open");
    if (state.dirty) window.location.reload();
  }

  function handleClick(event) {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest("button, [data-arcade-action]");
    if (!target) return;
    const mode = target.dataset.arcadeMode;
    if (mode) {
      event.preventDefault();
      startMode(mode);
      return;
    }
    if (target.dataset.arcadeChoice !== undefined) {
      evaluateAnswer(Number(target.dataset.arcadeChoice));
      return;
    }
    if (target.dataset.arcadeToken !== undefined && !state.answered) {
      state.chosenTokens.push(Number(target.dataset.arcadeToken));
      updateTokens();
      return;
    }
    if (target.dataset.arcadeRemoveToken !== undefined && !state.answered) {
      state.chosenTokens.splice(Number(target.dataset.arcadeRemoveToken), 1);
      updateTokens();
      return;
    }
    const action = target.dataset.arcadeAction;
    if (action === "close") closeArcade();
    if (action === "speak") speak(currentQuestion()?.speech);
    if (action === "speak-slow") speak(currentQuestion()?.speech, 0.64);
    if (action === "next") nextQuestion();
    if (action === "submit-tokens") evaluateAnswer(state.chosenTokens);
  }

  function handleSubmit(event) {
    if (!event.target.matches(".nian-answer-form")) return;
    event.preventDefault();
    evaluateAnswer(new FormData(event.target).get("answer"));
  }

  async function start() {
    if (speechSupported) {
      refreshEnglishVoices();
      window.speechSynthesis.addEventListener?.("voiceschanged", refreshEnglishVoices);
    }
    await loadWordBank();
    if (mount()) return;
    const observer = new MutationObserver(() => {
      if (mount()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 10_000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
