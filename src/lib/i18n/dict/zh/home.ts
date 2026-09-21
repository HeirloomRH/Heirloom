import type { home as EnHome } from "../en/home";

export const home: typeof EnHome = {
  hero: {
    ariaLabel: "让你的家人拥有创造更好明天的自由。",
    lines: ["让你的家人拥有", "创造更好明天的", "自由。"],
    intro:
      "把你的投资组合、你在乎的人和你的心愿汇聚到一起，为他们建立一个可以成长其中的未来。",
    createCta: "创建信托",
    sampleCta: "查看示例工作区 ↗",
  },

  reference: {
    ariaLabel: "动态演示：一个投资组合先成为一份彼此关联的计划，再成为一个家庭工作区",
    sectionLabel: "Heirloom 如何运作",
    play: "播放首页动画",
    pause: "暂停首页动画",
    steps: [
      {
        title: "构建投资组合。",
        body: "用一篮子符合条件的股票代币与 ETF，把你的长期意图凝聚起来。",
      },
      {
        title: "把人和计划连接起来。",
        body: "设定受益人、里程碑与监护人权限。你的心愿，就是规则。",
      },
      {
        title: "看清接下来会发生什么。",
        body: "把投资组合、预定的释放安排与个人信件，收在同一个清晰的视图里。",
      },
    ],
    nodes: [
      "投资组合",
      "受益人",
      "里程碑",
      "监护人",
      "你的心愿",
      "一份长久的传承",
    ],
  },

  networkCards: [
    "Emma 的明天",
    "家庭投资组合",
    "第一个家",
    "一点起步的助力",
    "Leo 的下一章",
    "做梦的余地",
    "你的长期心愿",
    "一份教育",
    "一位可信赖的监护人",
    "写给明天的一封信",
    "Maya 踏出的第一步",
    "一份长久的心意",
  ],

  statement: {
    titleLine1: "你的心愿，",
    titleLine2: "就是唯一的准绳。",
    body: "把投资组合、相关的人和整份计划放进同一个清晰的视图。今天定下规则，让你爱的人在明天也能读懂。",
    cta: "了解金库",
  },

  atmosphere: {
    eyebrow: "把接下来的一切看清楚",
    titleLine1: "一份看得见的传承。",
    titleLine2: "一份他们能照着走的计划。",
    note: "示意金库 · 示例数值 · 不持有任何资金",
  },

  darkNote: {
    lead: "信任，写得明明白白。",
    body: "监护人权限在设计上就是有边界的。生产环境合约必须强制执行每一条规则。",
    cta: "阅读边界说明",
  },

  workflow: {
    eyebrow: "小小的步骤，长久的心意。",
    title: "把「总有一天」变成「第一天」。",
    steps: {
      create: {
        label: "01 / 创建",
        body: "为他们的未来做的第一笔投资。选择一个投资组合，并写下它属于谁。",
        artLabel: "起点",
        artTitle: "一份会生长的东西。",
        artBasket: "股票代币篮子",
        artNote: "示意性配置",
      },
      protect: {
        label: "02 / 守护",
        body: "为人生的重要时刻留出空间。设定日期、津贴，以及可以帮上忙的人。",
        artLabel: "计划",
      },
      passOn: {
        label: "03 / 传承",
        body: "留下的不只是一个投资组合。附上一封信，告诉他们你当初为何开始。",
        letterLabel: "写给你明天的一封信",
        letterLine1: "亲爱的 Emma：",
        letterLine2: "这是为你将要创造的人生准备的。",
        letterLine3: "愿你活成你自己最好的样子。",
        letterSignature: "永远爱你。",
      },
    },
  },

  capability: {
    headTitleLine1: "今天多想一点，",
    headTitleLine2: "明天就少操很多心。",
    headBody: "把真正重要的细节，收在同一个地方。",
    rows: {
      portfolio: {
        title: "投资组合",
        tag: "可供建造的地基",
        body: "符合条件的股票代币与 ETF，配置清晰明了。",
      },
      vesting: {
        title: "解锁安排",
        tag: "把「对的时机」写进规则",
        body: "围绕你的意图设计的解锁节点与释放时间表。",
      },
      heartbeat: {
        title: "心跳签到",
        tag: "一份能延续下去的计划",
        body: "为你的继承安排提供可配置的定期签到。",
      },
      guardians: {
        title: "监护人",
        tag: "搭把手，但有边界",
        body: "指定的监督角色，可暂停分配或批准里程碑。",
      },
      terms: {
        title: "金库条款",
        tag: "一次慎重的承诺",
        body: "在可撤销与不可撤销条款之间选择，并明确知情确认。",
      },
      letter: {
        title: "一封亲笔信",
        tag: "只有你能写的那部分",
        body: "用你自己的话，为这个投资组合赋予一个故事。",
      },
    },
  },

  roadmapStrip: {
    eyebrow: "为长远而建",
    body: "从一个金库开始，长成代代相传。",
    cta: "查看路线图",
  },

  dashboard: {
    eyebrow: "你家庭的全局图景",
    titleLine1: "你为他们",
    titleLine2: "所建造的一切。",
    body: "查看你的各份信托、即将到来的里程碑，以及每一份信托背后最重要的那个人。一个安静的地方，守住一个长期的承诺。",
    cta: "体验应用",
    mock: {
      overview: "总览",
      myTrusts: "我的信托",
      beneficiaries: "受益人",
      activity: "动态",
      workspace: "你的家庭工作区",
      breadcrumb: "工作区 / 总览",
      sampleLabel: "示例工作区",
      title: "为他们所有的明天。",
      subtitle: "善意的心愿，背后有一份计划。",
      portfolioValue: "投资组合价值",
      trustVaults: "信托金库",
      nextMilestone: "下一个里程碑",
      milestoneValue: "18 岁",
      milestoneUnit: "生日",
      vaultName: "Emma 的明天",
      scheduled: "已排期",
      chartNote: "示意图表 · 不代表投资业绩",
      viewTrust: "查看信托",
    },
  },

  vaultArt: {
    name: "Emma 的明天",
    scheduled: "已排期",
    micro: "一点点起步的助力，我送给你。",
    valueNote: "示意投资组合价值",
    assets: "3 项资产",
    milestones: [
      { label: "18 岁生日", share: "投资组合的 25%" },
      { label: "21 岁生日", share: "投资组合的 25%" },
      { label: "25 岁生日", share: "投资组合的 50%" },
    ],
    openSample: "打开示例信托",
  },

  miniSchedule: [
    { label: "18 岁生日", share: "25%" },
    { label: "21 岁生日", share: "25%" },
    { label: "25 岁生日", share: "50%" },
  ],

  faq: [
    {
      q: "Heirloom 是法律意义上的信托吗？",
      a: "Heirloom 是一种可编程金库的构想，而不是法定意义上的法律信托。它的规则由智能合约执行。你可能仍然需要做相应的法律遗产规划。",
    },
    {
      q: "我可以把真实资产放进这个预览版本吗？",
      a: "不可以。这个前端只允许你在浏览器中构建并保存一个演示金库。它不会连接已部署的 Heirloom 金库，不会转移资金，也不会执行任何分配。",
    },
    {
      q: "如果我错过了一次签到会怎样？",
      a: "在经过设定的签到窗口与宽限期之后，既定的继承方案才会启动。在本预览中，签到仅更新本地演示状态；不会发生任何转账或自动继承。",
    },
    {
      q: "监护人能拿走整个投资组合吗？",
      a: "拟定中的监护人角色可以暂停分配或见证里程碑。在设计上，它没有任何改变资产流向的权力。这些边界必须在生产环境合约中得到验证。",
    },
    {
      q: "$HEIR 是什么？",
      a: "$HEIR 是路线图中描述的一个计划中的协议代币。本前端不提供代币购买、质押，也没有经过验证的代币合约。",
    },
  ],

  finalCta: {
    eyebrow: "一件他们会一直带在身上的东西。",
    titleLine1: "开始一份传承的最好时机，",
    titleLine2: "就是今天。",
    cta: "创建你的第一份信托",
    note: "体验演示，想象各种可能。",
  },
};
