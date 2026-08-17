(() => {
  "use strict";

  const sentenceRows = [
    ["I have already finished the work you gave me", "你交给我的工作我已经完成了", "现在完成时与定语从句"],
    ["Unless you hurry you will miss the last bus", "除非快一点，否则你会错过末班车", "unless 引导条件状语从句"],
    ["The girl sitting by the window is my cousin", "坐在窗边的女孩是我的表妹", "现在分词作后置定语"],
    ["What matters most is how we solve the problem", "最重要的是我们如何解决问题", "主语从句与表语从句"],
    ["He apologized for keeping us waiting so long", "他为让我们久等而道歉", "apologize for doing"],
    ["The road was so narrow that two cars could not pass", "道路太窄，两辆车无法同时通过", "so ... that ..."],
    ["It took her two hours to complete the report", "她花了两个小时完成报告", "It takes sb time to do"],
    ["The museum is worth visiting more than once", "这座博物馆值得多次参观", "be worth doing"],
    ["We were asked to hand in the forms before Friday", "我们被要求在周五前交表格", "被动语态与 ask sb to do"],
    ["The harder the task becomes the calmer she gets", "任务越难，她反而越冷静", "the more ... the more ..."],
    ["I did not realize the truth until he explained it", "直到他解释我才明白真相", "not ... until ..."],
    ["There is no point in worrying about what has happened", "为已经发生的事担心没有意义", "There is no point in doing"],
    ["She speaks English as confidently as her teacher", "她说英语和老师一样自信", "as ... as 同级比较"],
    ["Neither answer seems completely correct to me", "两个答案在我看来都不完全正确", "neither 与主谓一致"],
    ["The letter should have been sent yesterday", "这封信昨天就应该寄出", "情态动词完成式的被动语态"],
    ["Having checked the door he went downstairs", "检查门锁后，他下了楼", "现在分词完成式作状语"],
    ["I prefer reading at home to studying in a noisy cafe", "比起在嘈杂咖啡馆学习，我更喜欢在家阅读", "prefer doing A to doing B"],
    ["The reason why he left early remains unclear", "他提前离开的原因仍不清楚", "why 引导定语从句"],
    ["No sooner had we arrived than it began to rain", "我们刚到就开始下雨", "no sooner 置前引起倒装"],
    ["You are supposed to keep your phone silent here", "你在这里应该把手机调成静音", "be supposed to do"],
    ["The plan needs discussing before we make a decision", "作决定前，这个计划需要讨论", "need doing 表被动"],
    ["She had her bicycle repaired near the station", "她在车站附近找人修了自行车", "have sth done"],
    ["Even though the answer was wrong his method was useful", "尽管答案错了，他的方法仍有用", "even though 引导让步状语从句"],
    ["Hardly had the bell rung when the students rushed out", "铃声刚响，学生们就冲了出去", "hardly 置前引起倒装"],
    ["The teacher suggested that we review the lesson again", "老师建议我们再复习一次课文", "suggest 后的宾语从句"],
    ["Anyone who finishes early may check the answers", "提前完成的人可以检查答案", "who 引导定语从句"],
    ["The project turned out to be easier than expected", "这个项目结果比预想的容易", "turn out to be"],
    ["Only by practicing regularly can you improve steadily", "只有规律练习才能稳定进步", "only 置前引起部分倒装"],
    ["She found it difficult to concentrate in the crowded room", "她发现在拥挤房间里很难集中注意力", "find it + adj + to do"],
    ["Whether we leave today depends on the weather", "我们今天是否出发取决于天气", "whether 引导主语从句"],
    ["The more carefully you read the fewer mistakes you make", "读得越仔细，犯错越少", "比较级关联结构"],
    ["He is used to getting up before sunrise", "他习惯在日出前起床", "be used to doing"],
    ["Not all useful lessons are learned in a classroom", "并非所有有用的经验都在课堂里学到", "部分否定"],
    ["The old bridge is believed to be over three hundred years old", "人们认为这座古桥已有三百多年历史", "主语 + be believed to do"],
    ["If I had known the truth I would have acted differently", "如果早知道真相，我会采取不同做法", "与过去事实相反的虚拟语气"],
    ["There used to be a small bookstore on this corner", "这个街角过去有一家小书店", "there used to be"],
    ["In spite of the heavy fog the flight landed safely on time", "尽管大雾弥漫，航班仍安全准点降落", "in spite of 让步介词短语"],
    ["The professor whose lecture we attended yesterday is from Oxford", "我们昨天去听讲座的那位教授来自牛津", "whose 引导定语从句"],
    ["It was not until midnight that the storm finally stopped", "直到午夜，暴风雨才终于停止", "It was not until ... that 强调句"],
    ["Had you followed my advice you would have avoided the trouble", "如果你早听我的建议，就能避免这个麻烦", "虚拟语气省略 if 倒装"],
    ["The experiment proved far more challenging than they had imagined", "这项实验证明远比他们想象的更具挑战性", "prove + 形容词比较级"],
    ["Under no circumstances should you share your personal password", "在任何情况下你都不应透露个人密码", "否定介词短语置前完全倒装"],
    ["What surprised us was that she mastered the skill in two days", "让我们惊讶的是她只用两天就掌握了这门技能", "主语从句与表语从句并用"],
    ["He devoted all his spare time to helping disadvantaged children", "他把所有业余时间都奉献给帮助弱势儿童", "devote time to doing"],
    ["The new policy is intended to protect the ecological environment", "这项新政策旨在保护生态自然环境", "be intended to do"],
    ["No matter how difficult the situation is we must keep going", "无论处境多么艰难，我们都必须坚持前行", "no matter how 引导让步状语从句"],
    ["So fast did the news spread that everyone knew it by noon", "消息传播得如此之快，以至于中午人尽皆知", "so + 副词置前倒装"],
    ["It is essential that every student be fully prepared for the exam", "每个学生都必须为考试做好充分准备", "It is essential that + (should) do"],
  ];

  const listeningRows = [
    ["The train leaves at a quarter past seven.", "火车什么时候出发？", ["七点一刻", "七点半", "六点四十五", "八点一刻"], 0, "a quarter past seven 表示 7:15。", "时间"],
    ["Please put the blue folder on the second shelf.", "蓝色文件夹应放在哪里？", ["第二层架子", "桌子下面", "第一个抽屉", "门边"], 0, "关键信息是 on the second shelf。", "地点"],
    ["Lucy stayed home because she had a bad headache.", "Lucy 为什么待在家？", ["她头痛得厉害", "她错过了公交", "她要等快递", "她忘了作业"], 0, "because 后说明原因：a bad headache。", "原因"],
    ["The meeting has been moved from Monday to Wednesday.", "会议改到了哪一天？", ["星期三", "星期一", "星期二", "星期五"], 0, "from Monday to Wednesday 表示从周一改到周三。", "日期"],
    ["You can borrow the book but you must return it within two weeks.", "借书后需要多久归还？", ["两周内", "两天内", "一个月内", "当天"], 0, "within two weeks 表示两周以内。", "规则"],
    ["I ordered tea, but the waiter brought me coffee instead.", "服务员端来了什么？", ["咖啡", "茶", "果汁", "牛奶"], 0, "but 后是真实发生的结果：brought me coffee。", "转折"],
    ["Although the coat was expensive, Mia bought it because it was warm.", "Mia 为什么买下外套？", ["它很保暖", "它正在打折", "颜色特别", "朋友推荐"], 0, "because it was warm 给出购买原因。", "原因"],
    ["Turn left at the bank and the library will be across from the park.", "图书馆在什么地方？", ["公园对面", "银行里面", "车站后面", "学校旁边"], 0, "across from the park 表示在公园对面。", "路线"],
    ["Ben usually walks to school, but today his father drove him.", "Ben 今天怎样去学校？", ["父亲开车送他", "步行", "骑自行车", "乘地铁"], 0, "but today 后给出今天的不同情况。", "变化"],
    ["The red bag is cheaper, while the black one is more durable.", "黑色包的优势是什么？", ["更耐用", "更便宜", "更轻", "容量更小"], 0, "more durable 表示更加耐用。", "比较"],
    ["A: Shall we meet at the school gate at five? B: I have piano class then. How about six thirty?", "两人最后建议几点见面？", ["六点半", "五点", "六点", "七点半"], 0, "第二个人用 How about six thirty 提出新时间。", "对话"],
    ["A: Did you enjoy the movie? B: The music was wonderful, but the story was hard to follow.", "第二个人怎样评价电影？", ["音乐好但故事难懂", "故事精彩但音乐吵", "整部电影都很无聊", "没有看完电影"], 0, "wonderful music 与 hard-to-follow story 形成转折。", "态度"],
    ["A: Can I use your dictionary? B: Sure, but I need it back before lunch.", "字典什么时候需要归还？", ["午饭前", "放学后", "明天早上", "晚饭前"], 0, "before lunch 是明确的归还期限。", "请求"],
    ["A: Why are you carrying an umbrella? B: The forecast says it may rain this afternoon.", "第二个人为什么带伞？", ["天气预报说下午可能下雨", "现在正在下雨", "太阳太强", "要借给朋友"], 0, "forecast 与 may rain 是关键。", "推断"],
    ["A: This soup tastes a little salty. B: I will add some water to it.", "第二个人准备怎么做？", ["加一些水", "再加盐", "倒掉汤", "换一个碗"], 0, "add some water 可以减淡咸味。", "解决办法"],
    ["A: I cannot find my student card. B: Check the pocket of the jacket you wore yesterday.", "第二个人建议去哪里找？", ["昨天穿的外套口袋", "书包夹层", "教室讲台", "图书馆柜台"], 0, "建议句直接指出 jacket pocket。", "建议"],
    ["A: The printer is not working again. B: Have you checked whether there is any paper left?", "第二个人首先建议检查什么？", ["打印机里是否还有纸", "电费是否缴清", "电脑是否关机", "文件是否保存"], 0, "whether there is any paper left 是检查重点。", "排障"],
    ["A: Would you like the window open? B: Just a little. The wind is quite strong today.", "第二个人希望窗户怎样？", ["只开一点", "完全打开", "保持关闭", "换一扇窗"], 0, "Just a little 表示只开一条小缝。", "意图"],
    ["The museum is free for children under twelve, but adults pay fifteen dollars.", "谁可以免费进入博物馆？", ["十二岁以下儿童", "所有学生", "十五岁以下儿童", "老年人"], 0, "under twelve 指十二岁以下。", "规则"],
    ["Students should submit the form online instead of handing in a paper copy.", "学生应怎样提交表格？", ["在线提交", "交纸质版", "邮寄", "拍照发短信"], 0, "instead of 排除了纸质提交。", "通知"],
    ["The football match was canceled because the field was covered with water.", "比赛为什么取消？", ["场地积水", "队员迟到", "观众太少", "天气太冷"], 0, "field was covered with water 说明场地积水。", "原因"],
    ["Nora saved money for three months so that she could buy a new camera.", "Nora 存钱的目的是什么？", ["买新相机", "旅行", "参加课程", "送朋友礼物"], 0, "so that 后说明目的：buy a new camera。", "目的"],
    ["The shop closes at nine on weekdays and an hour earlier on Sundays.", "商店星期日几点关门？", ["八点", "九点", "十点", "七点半"], 0, "比九点早一小时，即八点。", "计算"],
    ["Kevin missed the beginning of the lecture because the bus broke down.", "Kevin 错过讲座开头的原因是什么？", ["公交车抛锚", "他睡过头", "记错时间", "找不到教室"], 0, "the bus broke down 是直接原因。", "原因"],
    // 扩展多轮长对话与情境听力
    [
      "M: Excuse me, Professor Chen. I'm wondering if I can sign up for the advanced data analysis course next semester.\nW: Well, that course requires Python programming as a prerequisite. Have you completed that introductory class yet?\nM: Yes, I took it last term and got an A in the final project.\nW: Excellent. Then submit your application through the academic portal before this Friday afternoon.",
      "长对话情境：男生选修高级数据分析课的先决条件是什么？",
      ["已修完 Python 编程先修课", "通过英语水平六级考试", "导师必须出具书面推荐信", "必须在大四第一学期方可申请"],
      0,
      "对话中教授明确指出：'that course requires Python programming as a prerequisite'。",
      "长对话·选课与考务"
    ],
    [
      "W: Good morning! I'd like to return these three history reference books and renew the biology textbook for another week.\nM: Let me check your account. The history books are all in good condition, but the biology textbook has a reservation list. You won't be able to renew it.\nW: Oh, I see. When do I have to return the biology book then?\nM: By tomorrow evening at five o'clock at the latest.",
      "长对话情境：女生为什么不能续借生物学教材？",
      ["该教材已有其他读者预约", "她的借书借阅权限已到期", "教材存在页面污损破损", "图书馆下周进行闭馆盘点"],
      0,
      "图书管理员说明：'the biology textbook has a reservation list. You won't be able to renew it.'",
      "长对话·图书借阅"
    ],
    [
      "M: Welcome to Central Station Information Desk. How can I assist you?\nW: Hi, I'm heading to Brighton for a conference. Is the 10:15 train running on schedule?\nM: Let me see... Platform 4 is closed for maintenance, so the Brighton train has been moved to Platform 9 and delayed by twenty minutes.\nW: Thank you. Do I need to get my ticket revalidated at the counter?\nM: No need. Your current digital QR ticket remains fully valid.",
      "长对话情境：前往布莱顿的列车发生了什么变动？",
      ["改在 9 号站台并晚点 20 分钟", "因暴雨全面取消该班次列车", "旅客必须重新在窗口人工验票", "原定 4 号站台提前 10 分钟发车"],
      0,
      "管理员告知：'moved to Platform 9 and delayed by twenty minutes'。",
      "情境·车站问路"
    ],
    [
      "W: David, have you finished preparing the slides for tomorrow's chemistry presentation?\nM: Almost done, Sarah. I've organized the lab data and graphs, but I'm still struggling with the conclusion section.\nW: Why don't we emphasize how temperature variations directly influenced the reaction rate?\nM: That's a brilliant perspective! That connects perfectly with our initial hypothesis.",
      "长对话情境：两人决定在展示文稿的结论部分着重强调什么？",
      ["温度变化对反应速率的直接影响", "实验器材在低温下的测量误差", "化学实验经费的整体预算分配", "团队成员在不同阶段的分工细节"],
      0,
      "女生建议：'emphasize how temperature variations directly influenced the reaction rate'，男生表示赞同。",
      "长对话·实验研讨"
    ],
    [
      "M: Doctor Miller's clinic, how may I help you?\nW: Hello, I'd like to reschedule my dental appointment originally booked for Thursday at 2:00 PM.\nM: Let's see what's available. The doctor is fully booked on Friday, but has an opening on next Monday morning at 9:30.\nW: Monday at 9:30 AM works perfectly for me. Please put me down for that slot.",
      "长对话情境：女士最终将就诊时间重新调整到了何时？",
      ["下周一上午九点半", "本周五下午两点整", "下周二上午九点整", "本周四下午三点半"],
      0,
      "根据对话，周五已约满，最终敲定：'Monday morning at 9:30'。",
      "情境·预约改期"
    ],
    [
      "W: Look at the weather radar, Jason! A severe thunderstorm is approaching our coastal camp route.\nM: You're right. Pitching tents near the riverbank tonight would be far too dangerous.\nW: Should we pack our gear and check into the youth hostel near the foot of the hill instead?\nM: Agreed. Safety always comes first. Let's call the hostel to book two rooms right away.",
      "长对话情境：面对雷暴天气，他们最终作出的安全决定是：",
      ["收起装备入住山脚下的青年旅社", "留在河岸边加固露营帐篷支架", "立即徒步攀登至山顶避风港", "在车内过夜并等待次日风暴结束"],
      0,
      "对话中两人商定：'check into the youth hostel near the foot of the hill instead'。",
      "长对话·应急决策"
    ],
    [
      "M: Hi Emma, are you joining the university hiking club this Saturday?\nW: I'd love to, but my hiking boots wore out completely during last month's trip.\nM: The outdoor shop downtown is offering a thirty percent discount for student members this week.\nW: That sounds great! Could you send me the address so I can pick up a new pair tomorrow?",
      "长对话情境：女生目前没有立刻答应周六徒步的主要原因是：",
      ["徒步登山鞋已经完全磨损破旧", "周六当天需要参加学生会会议", "近期脚踝受伤尚未完全恢复", "没有获得徒步俱乐部的会员资格"],
      0,
      "女生说明：'my hiking boots wore out completely during last month's trip'。",
      "情境·活动邀请"
    ],
    [
      "W: Good evening, sir. Have you decided on your main course for tonight's dinner?\nM: I'm allergic to peanuts and shellfish. Could you recommend something suitable?\nW: Absolutely. Our grilled salmon with roasted asparagus is completely nut-free and prepared in a separate cooking area.\nM: Perfect, I will have that along with a glass of sparkling mineral water, please.",
      "长对话情境：服务员向顾客推荐烤三文鱼的主要原因是：",
      ["完全不含坚果且在独立区域烹饪", "三文鱼是今晚半价优惠主推菜", "三文鱼含有丰富的花生调味汁", "该菜品烹饪速度最快无需等待"],
      0,
      "针对顾客花生过敏，服务员明确说明：'completely nut-free and prepared in a separate cooking area'。",
      "情境·餐饮点单"
    ],
    [
      "M: Sophie, congratulations on winning first prize in the national robotics contest!\nW: Thank you so much! Our team worked through countless late nights debugging the sensor modules.\nM: What was the most critical factor that set your robot apart from the competitors?\nW: Our adaptive navigation algorithm—it could recalibrate paths in less than 0.1 seconds when encountering obstacles.",
      "长对话情境：获胜机器人在比赛中最突出的核心优势是：",
      ["遇障碍0.1秒内重校路径的自适应算法", "采用了极为轻量化的钛合金外壳材质", "续航能力比其他队伍长两倍以上", "机械臂可以抓取两倍自重的物体"],
      0,
      "女生回答：'adaptive navigation algorithm—it could recalibrate paths in less than 0.1 seconds'。",
      "长对话·科技竞赛"
    ],
    [
      "W: Tom, I've noticed you've been listening to English podcasts during your daily commute.\nM: Yes, it really helps my listening fluency. I started with 5-minute news clips and now listen to 30-minute academic discussions.\nW: Don't you find the speaking rate in academic debates a bit overwhelming?\nM: At first, yes. But I use the 0.8x speed option when encountering complex arguments, then replay at normal speed.",
      "长对话情境：Tom 在遇到复杂的学术讨论听力时采用的学习技巧是：",
      ["先以 0.8 倍速慢听理解再常速复听", "只记录对话中出现的生词与拼写", "完全依赖英文字幕不开启原音频", "跳过复杂辩论只听简单新闻片段"],
      0,
      "Tom 说明：'I use the 0.8x speed option when encountering complex arguments, then replay at normal speed'。",
      "情境·学习策略"
    ],
    [
      "M: Excuse me, is this seat taken? The flight is completely full today.\nW: No, it's free. Are you traveling to Toronto for the international green energy summit?\nM: Exactly! I'm presenting our university's solar cell efficiency research on Wednesday morning.\nW: What a coincidence! I'm attending the wind power turbine panel in the same conference hall.",
      "长对话情境：两位旅客在飞机上的对话表明他们：",
      ["前往同一场国际绿色能源峰会参会", "是同一所大学同专业的研究生同窗", "正在商讨共同创办风力发电公司", "因为航班延误而在候机厅初次相识"],
      0,
      "对话确认两人都是去 Toronto 参加国际绿色能源峰会。",
      "长对话·机上交谈"
    ],
    [
      "W: Mr. Roberts, our community garden project has gathered over fifty enthusiastic volunteers.\nM: That's remarkable news! Have we secured the water supply permit from the municipal department?\nW: Yes, the permit was approved yesterday, and the local hardware store donated twenty irrigation hoses.\nM: Excellent! Let's schedule the inaugural planting weekend for next Saturday morning at 8:00 AM.",
      "长对话情境：社区花园项目接下来确定的启动时间是：",
      ["下周六上午八点整开始首次种植", "本周五下午向市政部门递交申请", "下周日由五位志愿者进行管道测试", "下周一上午与五金店商讨捐赠事宜"],
      0,
      "男士建议：'schedule the inaugural planting weekend for next Saturday morning at 8:00 AM'。",
      "情境·社区营造"
    ],
  ];

  const readingRows = [
    ["夜里下过一场雨。清晨，石阶仍湿，卖豆花的老人把摊子向屋檐里挪了半尺，又在最外侧放下一块干布。第一个顾客踩着布走来时，他只是低头擦碗，像什么也没做。", "老人放下干布的主要原因是：", ["避免顾客在湿石阶上滑倒", "展示新买的布", "擦拭豆花碗", "挡住清晨的风"], 0, "动作发生在湿石阶与顾客到来之间，体现的是不声张的体贴。", "人物细节"],
    ["小城的旧钟楼每天慢三分钟。修表匠说零件已经停产，却仍会在每个周一爬上窄梯，把齿轮上的灰一点点刷净。钟没有因此变准，但它继续响着，提醒人们那些不能恢复如初的东西，也值得被认真照看。", "文段最想表达的是：", ["有些维护的价值不只在彻底修复", "旧钟必须立即更换", "修表匠不懂钟表", "城市生活节奏太慢"], 0, "结尾把“不能恢复”与“认真照看”并置，强调维护本身的意义。", "主旨"],
    ["她第一次上台时，把准备好的开场白忘得一干二净。台下安静得能听见纸张翻动。她看见第一排的老师没有催，只把手里的笔轻轻放下。于是她说：‘我有点紧张，我们从最简单的地方开始吧。’笑声过后，演讲反而顺了起来。", "老师“把笔轻轻放下”的作用是：", ["用无声动作缓解她的压力", "表示不再记录成绩", "提醒她演讲时间结束", "说明老师感到困倦"], 0, "动作没有直接替她解围，却传递了等待和接纳。", "作用题"],
    ["河岸边原有一条人们踩出的捷径。公园修整后，工人没有立刻铺设石板，而是等了一个月，观察雨天之后大家仍愿意走哪一条线。后来铺成的小路略微弯曲，却几乎没人再踩草坪。", "公园为什么先观察一个月？", ["让道路符合真实使用习惯", "等待石板降价", "避免工人雨天施工", "计算草坪面积"], 0, "观察人们实际选择的路线，是为了让设计顺应使用习惯。", "原因链"],
    ["父亲教我削铅笔，总把最后几刀削得很慢。我嫌他耽误时间，他把笔递给我：木屑薄而长，笔芯没有一处裂纹。后来我才明白，所谓熟练，并不是动作永远很快，而是知道哪里必须慢下来。", "“哪里必须慢下来”在文中的深层含义是：", ["关键环节需要耐心与分寸", "削铅笔只能由成年人完成", "所有工作都应放慢速度", "工具越旧越难使用"], 0, "削铅笔是表层，深层指向做事时对关键环节的判断。", "含义题"],
    ["图书馆新设了‘无人借阅书架’，管理员把长期无人问津的书轮流摆在入口。有人担心这只是换个位置积灰。三个月后，其中近一半被借走。书没有突然变好，只是终于被看见。", "文段中的做法有效，主要因为：", ["提高了冷门书籍被发现的机会", "管理员重写了书的内容", "读者不能选择其他书", "入口处光线更暗"], 0, "位置变化带来了可见性，结尾“终于被看见”点明原因。", "信息提取"],
    ["班里讨论是否取消每周小测。有人说小测让人紧张，也有人说它能及时发现遗漏。班主任最后没有简单投票，而是把小测改成可订正、只记录进步幅度的形式。争论没有消失，但问题从‘要不要测’变成了‘怎样测得更有用’。", "班主任处理问题的思路是：", ["调整评价方式以兼顾反馈和压力", "完全服从多数意见", "取消所有考试", "维持原办法不变"], 0, "她没有在两个极端中二选一，而是改造了测验的用途。", "概括题"],
    ["山村邮路的最后两公里没有车道。邮递员每次都把车停在老槐树旁，背着包走上去。有人建议把信件统一放在村口，他摇头：‘路远的人，往往更盼着有人把消息送到门前。’", "邮递员的话表现了他怎样的特点？", ["理解他人需要并愿意负责到底", "固执地拒绝新技术", "喜欢在山路上散步", "担心车辆被偷"], 0, "他关注的是路远者更强的需要，体现体谅和责任感。", "人物形象"],
    ["实验失败后，组员们急着寻找是谁量错了数据。组长却先把所有步骤写到白板上，从仪器预热到最后读数逐项核对。错误最终来自一条没有写进操作说明的默认设置。那天之后，他们在报告末尾增加了一栏：‘我们以为不必说明的事。’", "新增这一栏的目的是什么？", ["暴露并检查隐藏的假设", "记录组员姓名", "缩短实验时间", "替代操作说明"], 0, "错误源于默认设置，新栏目专门提醒团队检查未被说出的前提。", "推断"],
    ["街角新开了一家修补铺，门上写着：‘拉链、伞骨、旧书脊，先别急着扔。’店里没有华丽橱窗，柜台上却摆着一只补了三种颜色的书包。老板说，那不是样品，是一个孩子用了六年的伙伴。", "彩色补丁书包在文中的作用是：", ["具体表现修补让旧物继续陪伴人的价值", "说明老板不会搭配颜色", "证明新书包价格昂贵", "介绍店铺的促销商品"], 0, "书包把抽象的修补价值变成可见的陪伴故事。", "物象作用"],
    ["植物课上，老师让大家连续两周记录同一片叶子。第一天的表格写得最满，后来只剩颜色变深、边缘卷曲之类的短句。到第十四天，同学们把记录排开，才发现那些不起眼的变化连成了一条清晰的季节轨迹。", "文段说明持续记录的意义是：", ["让细小变化在时间中显现规律", "保证每天都有新发现", "使叶子停止变化", "减少观察所需时间"], 0, "单日变化不起眼，连续排列后形成规律。", "主旨"],
    ["车站广播临时更换站台，许多人拖着行李往楼梯跑。一位年轻人已经走出几步，又折回来把消息写在纸板上，举给刚进站、听不清广播的老人看。列车没有等他，但旁边的人替他守住了队伍中的位置。", "结尾“替他守住位置”有什么表达效果？", ["表现善意会引出新的善意", "说明列车严重晚点", "批评年轻人行动缓慢", "交代老人最终没有上车"], 0, "年轻人的帮助得到旁人的回应，形成善意的传递。", "结尾作用"],
    ["编辑退回我的稿子，只写了一句：‘你知道结论，却还没有让我看见你如何走到那里。’我把原文中三个漂亮的形容词删掉，补上调查失败、重新提问和修改假设的过程。第二次，稿子通过了。", "稿件通过的关键变化是：", ["补充了得出结论的真实过程", "增加了更多形容词", "更换了文章标题", "删掉了调查数据"], 0, "编辑需要的是推理和过程，而非只给结论。", "写作方法"],
    ["社区把一面旧墙改成留言板，最初贴满失物招领和维修通知。后来有人写下‘今晚七点，免费教孩子修自行车’，旁边很快多了‘我带工具’‘我会补胎’。一面发布问题的墙，渐渐也开始组织答案。", "“组织答案”指的是：", ["留言促成居民共同解决问题", "工作人员统一回复通知", "墙面自动生成文字", "所有失物都被找到"], 0, "居民从发布信息走向协作，留言板成为行动连接点。", "语句含义"],
    ["跑步训练的前两周，我每天都想刷新最快成绩。教练把计时器收走，只让我记录呼吸是否稳定、动作是否变形。一个月后重新计时，我反而比之前快了。", "教练收走计时器的用意是：", ["让训练先关注可持续的过程质量", "防止计时器损坏", "取消跑步训练", "隐瞒真实成绩"], 0, "稳定呼吸和动作是过程指标，先改善过程才带来速度提升。", "目的题"],
    ["老木匠接到一张尺寸含糊的桌子草图，没有马上开料。他带着卷尺去了使用者家里，看椅子的高度、门的宽度，还问桌边是否要放轮椅。回来后，他在草图空白处写：‘尺寸不是数字，是人在空间里的动作。’", "这句话强调设计尺寸应当：", ["从真实使用场景和人的动作出发", "尽量采用最大的数字", "完全照搬旧家具", "只考虑材料价格"], 0, "前文的测量对象都与实际使用动作有关。", "观点题"],
    // 扩展主观分点采分试题
    [
      "【分点采分】古人云：‘不积跬步，无以至千里；不积小流，无以成江海。’骐骥一跃，不能十步；驽马十驾，功在不舍。锲而舍之，朽木不折；锲而不舍，金石可镂。",
      "主观分析：文段通过正反对比论证了什么道理？请结合文意概括采分要点。",
      ["坚持不懈与持之以恒是成就学问事业的根本所在", "骏马虽然跑得快但不能用于长途运输", "朽木容易腐朽而金石永远不会磨损", "古人积累小步只是为了锻炼体魄"],
      0,
      "【采分点解析】① 采分点一（论点）：强调坚持不懈、循序渐进的决定性作用（关键词：坚持、积累、持之以恒，占2分）；② 采分点二（论证方法）：运用骐骥与驽马、舍与不舍的正反对比论证（关键词：对比论证、形象鲜明，占2分）。",
      "主观采分·论证对比",
      [
        { point: "采分点一：准确概括文章核心论点（坚持与积累）", score: 2, keywords: ["积累", "坚持", "持之以恒", "毅力"] },
        { point: "采分点二：指出对比论证修辞手法及其表达效果", score: 2, keywords: ["对比", "正反", "生动", "鲜明"] },
      ]
    ],
    [
      "【分点采分】老街的旧茶馆里，跑堂的伙计总在茶客快喝尽时才提起铜壶。他不问续不续水，只看茶客的茶盖：虚掩着，便添滚水一注；扣严了，便微笑收杯。在这条老街上，体面不需要大声交代。",
      "主观赏析：文段中‘茶盖虚掩与扣严’的细节描写有何深意？请结合上下文分点阐述。",
      ["以茶盖暗号展现人际交往中的默契、尊重与含蓄体面", "说明茶馆水温过高需要通过茶盖散热降温", "反映茶客经济困难无法支付整壶茶水费用", "表现伙计服务态度敷衍不愿主动与顾客沟通"],
      0,
      "【采分点解析】① 采分点一（物象细节）：茶盖虚掩/扣严作为无声暗号，反映传统礼仪与心照不宣的默契（关键词：细节描写、无声、默契，占2分）；② 采分点二（主题升华）：表现人际交往中互不打扰、给彼此留余地的体面与温情（关键词：体面、分寸、温情，占2分）。",
      "主观采分·物象细节",
      [
        { point: "采分点一：分析细节描写的表层作用（无声动作与默契）", score: 2, keywords: ["动作", "细节", "默契", "暗号"] },
        { point: "采分点二：阐释深层主题思想（体面、尊重与温情）", score: 2, keywords: ["体面", "分寸", "尊重", "温情"] },
      ]
    ],
    [
      "【分点采分】治学如筑塔，基不固则塔必倾。昔者学者研读一经，必通其训诂，晓其章句，而后求其大义。今人急于立言，未及辨析字义，已肆意引申，此所谓凌空蹈虚也。",
      "主观阐释：作者对‘治学如筑塔’与‘凌空蹈虚’分别持何种态度？请分点概括答题要点。",
      ["倡导求真务实、夯实基础的治学态度，批判急功近利、空谈引申的不良学风", "认为建筑技艺应当全面应用于古籍经典的编纂之中", "主张所有人都不必探求大义只需记住字词注释即可", "赞赏今人思维活跃勇于跳过基础概念直接发表言论"],
      0,
      "【采分点解析】① 采分点一（立论）：以‘筑塔’为喻，倡导由浅入深、先辨训诂后求大义的扎实学风（关键词：基础、踏实、严谨，占2分）；② 采分点二（驳论）：以‘凌空蹈虚’批评急于求成、浮躁空洞的治学弊端（关键词：批评、浮躁、急功近利，占2分）。",
      "主观采分·态度观点",
      [
        { point: "采分点一：概括作者肯定的治学方法与主张（扎实基础）", score: 2, keywords: ["扎实", "严谨", "基础", "训诂"] },
        { point: "采分点二：概括作者批驳的不良现象与风气（浮躁急躁）", score: 2, keywords: ["浮躁", "急功近利", "空泛", "批判"] },
      ]
    ],
    [
      "【分点采分】林徽因在谈及古建筑测绘时写道：‘一梁一柱，皆有古人营造之规矩；尺规所至，非徒画线条，乃与前代匠人晤谈也。’",
      "主观理解：为什么说测绘‘非徒画线条，乃与前代匠人晤谈’？请按采分要点作答。",
      ["测绘超越了技术层面，是理解古代营造智慧与精神的情感共鸣", "古代工匠在梁柱内部留有文字笔记需要现场阅读", "测绘工作必须严格按照现代电脑制图标准进行绘制", "古代建筑规矩复杂繁琐导致测绘效率极其低下"],
      0,
      "【采分点解析】① 采分点一（技术与精神）：指出测绘不仅是技术测量，更包含对营造法则与工匠智慧的理解（关键词：智慧、匠心、法则，占2分）；② 采分点二（情感跨越）：跨越时空的情感共鸣与文化传承（关键词：对话、传承、敬畏，占2分）。",
      "主观采分·语句理解",
      [
        { point: "采分点一：理解‘非徒画线条’的表层与深层技术超越", score: 2, keywords: ["技术", "超越", "智慧", "匠心"] },
        { point: "采分点二：阐述‘与匠人晤谈’的精神共鸣与文化传承", score: 2, keywords: ["共鸣", "传承", "跨越时空", "敬畏"] },
      ]
    ],
    [
      "【分点采分】深秋清晨，老农在麦田边点燃一堆枯草。浓烟低回不散，缓缓笼罩了整片幼苗。路人问何故熏烟，老农答：‘霜重之夜，浓烟如被，可护幼苗免遭冻伤。看似污浊之烟，实为御寒之衣。’",
      "主观分析：文末‘看似污浊之烟，实为御寒之衣’蕴含了怎样的生活哲理？请分点写出得分要点。",
      ["事物的作用不能仅看表面表象，要在具体情境中把握其实际价值与功用", "浓烟会对大气造成污染必须立即彻底禁止在田间点火", "秋季麦田不需要任何水分与肥料只需要防冻即可", "霜冻天气过后麦苗无论如何都会自然恢复生长"],
      0,
      "【采分点解析】① 采分点一（辨证认识）：事物表象（污浊之烟）与实际效用（御寒之衣）具有辩证性（关键词：表象与实质、辩证，占2分）；② 采分点二（现实指导）：看待人或事物不能浮于表面，要看其实际贡献与真实价值（关键词：实际价值、不以貌取人，占2分）。",
      "主观采分·哲理阐发",
      [
        { point: "采分点一：指出表象与实质的辩证关系（矛盾统一）", score: 2, keywords: ["表象", "实质", "辩证", "本质"] },
        { point: "采分点二：结合生活实际阐发指导意义（全面评价）", score: 2, keywords: ["实际价值", "全面", "实践", "效用"] },
      ]
    ],
    [
      "【分点采分】古琴断纹，乃历经百年岁月木漆自然开裂之痕。初学者或以为瑕疵，善琴者则视若瑰宝：‘琴之有断，如人之有阅历；音色因松透而愈发沉古，非新材所能仿也。’",
      "主观探究：古琴‘断纹’与‘阅历’之间的相似点体现在何处？请分点列出采分点。",
      ["两者皆由岁月历练沉淀而成，虽带沧桑痕迹，却赋予事物深厚沉稳的内在韵味", "古琴断纹会导致琴弦无法正常调音必须全部打磨重刷", "年纪越大的人弹奏古琴音准必然越精确完美", "现代制作的古琴必须用刀刻出断纹才能提升售价"],
      0,
      "【采分点解析】① 采分点一（形成过程）：两者都需要时间的积累与磨砺（关键词：岁月积淀、磨砺，占2分）；② 采分点二（内在品质）：表面的磨损转化为内在的厚重、深沉与通透（关键词：内在韵味、沉古、厚重，占2分）。",
      "主观采分·比喻联想",
      [
        { point: "采分点一：分析两者在时间积淀与磨砺过程上的契合", score: 2, keywords: ["时间", "岁月", "积淀", "历练"] },
        { point: "采分点二：阐述两者在由表及里、升华内在韵味上的共同特质", score: 2, keywords: ["沉古", "韵味", "厚重", "通透"] },
      ]
    ],
    [
      "【分点采分】苏轼在《题西林壁》中写道：‘横看成岭侧成峰，远近高低各不同。不识庐山真面目，只缘身在此山中。’",
      "主观阐释：后两句诗揭示了怎样的认识论哲理？在学习中应如何避免‘身在此山中’？请分点作答。",
      ["当局者迷，客观看待事物需跳出局部局限；学习中应善于宏观审视与跳出固有思维", "庐山常年云雾缭绕因此任何人都不可能看清其真实地貌", "只要登上最高山顶就必然能彻底解决所有学科的所有难题", "写诗只需记录视觉看到的景象无需思考背后的深层规律"],
      0,
      "【采分点解析】① 采分点一（哲学原理）：指出受主观位置与局部视角的局限，容易产生片面认识（关键词：局部局限、主观片面、当局者迷，占2分）；② 采分点二（方法启示）：学习中要建立知识全貌图谱、善于跳出局部题海做宏观复盘（关键词：整体视野、全局思维、跳出局限，占2分）。",
      "主观采分·名句哲理",
      [
        { point: "采分点一：解析诗句揭示的认识论原理（视角局限与片面性）", score: 2, keywords: ["视角", "局部", "片面", "当局者迷"] },
        { point: "采分点二：结合实际提出跳出局限、宏观审视的解决路径", score: 2, keywords: ["全局", "宏观", "全貌", "复盘"] },
      ]
    ],
    [
      "【分点采分】《战国策》载：‘行百里者半九十。’此言末路之难也。夫涉远途者，前八九十里凭初发之锐气尚可支撑；至最后十里，气力已衰，惰意渐生，若无坚韧意志，往往功亏一篑。",
      "主观探究：为何说‘末路之难’？请分点提炼文章的逻辑采分点。",
      ["越接近终点越面临体力消耗与心理懈怠的双重考验，更需要意志力坚持到底", "最后十里路的道路质量普遍比前段更加崎岖难行", "古代计量单位不准确导致最后十里的实际距离等于九十里", "远行者应当在走到九十里时直接返回以避免过度疲劳"],
      0,
      "【采分点解析】① 采分点一（主客观困境）：末段面临身心疲惫、惰性滋生与锐气耗尽的双重危机（关键词：身心疲惫、惰性、考验，占2分）；② 采分点二（结论警示）：越是关键收尾阶段，越需要咬牙坚持，防止功亏一篑（关键词：坚持到底、克服懈怠、防功亏一篑，占2分）。",
      "主观采分·文言事理",
      [
        { point: "采分点一：分析末路阶段身心处于极限的困难成因", score: 2, keywords: ["极限", "疲劳", "惰性", "衰竭"] },
        { point: "采分点二：总结临近成功更需咬牙坚持的警示意义", score: 2, keywords: ["坚持到底", "关键时刻", "功亏一篑", "意志"] },
      ]
    ],
  ];

  globalThis.NIAN_V8_CONTENT = Object.freeze({
    sentences: sentenceRows.map(([sentence, meaning, rule], index) => ({ id: `sentence-v8-${index + 1}`, sentence, meaning, rule })),
    listening: listeningRows.map(([speech, prompt, choices, answer, explanation, skill], index) => ({
      id: `listening-v8-${index + 1}`, speech, prompt, choices, answer, explanation, skill,
    })),
    readings: readingRows.map(([passage, prompt, choices, answer, explanation, skill, rubric], index) => ({
      id: `reading-v8-${index + 1}`, passage, prompt, choices, answer, explanation, skill, rubric: Array.isArray(rubric) ? rubric : null,
    })),
  });
})();
