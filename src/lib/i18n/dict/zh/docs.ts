import type { docs as EnDocs } from "../en/docs";

export const docs: typeof EnDocs = {
  ui: {
    label: "文档",
    breadcrumbRoot: "文档",
    navAriaLabel: "文档导航",
    openMenu: "打开文档菜单",
    closeMenu: "关闭文档菜单",
    closeNav: "关闭导航",
    searchPlaceholder: "搜索你想了解的内容…",
    searchAriaLabel: "搜索文档",
    resultsSuffix: "条结果",
    noMatches: "换一个关键词试试。",
    sidebarStatus: "前端预览",
    sidebarNote: "一个长期构想的可用演示。",
    sidebarCta: "试用创建器",
    openApp: "打开应用",

    searchResultsAriaLabel: "搜索结果",
    searchKicker: "搜索手册",
    closeResults: "关闭搜索结果",
    resultsFor: (query: string) => `“${query}” 的搜索结果`,
    articlesFound: (n: number) => `找到 ${n} 篇文章`,
    noResultsTitle: "还没有找到答案。",
    noResultsBody: "试试「监护人」「时间表」或「投资组合」。",
    clearSearch: "清除搜索",

    minRead: (n: number) => `阅读约 ${n} 分钟`,
    copyLink: "复制链接",
    linkCopied: "链接已复制",
    copyFallback: (id: string) => `请复制此链接：/docs/#${id}`,

    overviewHeading: "概述",
    previewHeading: "在当前预览版本中",
    primarySource: "原始资料",

    previousLabel: "上一篇",
    nextLabel: "下一篇",
    footerLabel: "Heirloom 文档",
    footerCta: "查看路线图",

    tocLabel: "本页内容",
    tocOverview: "概述",
    tocPreview: "预览版本说明",
    tocNext: "制定你的第一份计划",
    tocAsideTitle: "带着心意建造。",
    tocAsideBody: "从小处开始，把细节做到位。",
    tocAsideCta: "创建信托",
  },

  intro: {
    titleLine1: "一份清晰的计划。",
    titleLine2: "一份长久的传承。",
    deck: "Heirloom 的核心要点：从你的第一个投资组合，到指引它的那些心愿。",
    deckTemplate: (topic: string) => `关于 Heirloom 中${topic}的实用指南。`,
    coverTop: "HEIRLOOM 手册",
    coverIndex: "01 — 从这里开始",
    coverLine1: "善意的心愿。",
    coverLine2: "清晰的指令。",
    coverA: "投资组合",
    coverB: "相关的人",
    coverC: "目的",
    startHeading: "制定你的第一份计划",
    start1Title: "创建一个演示信托",
    start1Body: "投资组合、受益人、条款与信件。",
    start2Title: "浏览一个示例",
    start2Body: "看看各个部分如何组合在一起。",
  },

  groups: {
    gettingStarted: "新手入门",
    buildYourPlan: "制定你的计划",
    protocol: "协议",
  },

  shortNames: {
    preview: "简介",
    vaults: "金库如何运作",
    portfolio: "投资组合与资产",
    schedules: "释放时间表",
    heartbeat: "心跳签到",
    guardians: "监护人",
    modes: "金库条款",
    letters: "个人信件",
    network: "Robinhood Chain",
    boundaries: "风险与边界",
    token: "$HEIR 路线图",
  },

  articles: {
    preview: {
      title: "从这里开始：前端预览版",
      tag: "新手入门",
      text: "本站是 Heirloom 的交互式演示。你可以创建一个演示信托、选择示意性的资产配置、编写释放时间表，并把它保存在这个浏览器里。此处不持有任何资金，不对钱包做身份认证，也不会调用任何智能合约。",
      extra:
        "保存的演示数据仅存在于这个浏览器和这台设备上。清除站点存储即会删除它们。你可以在信托页面导出 JSON 演示方案以留存副本；导出内容包含受益人钱包地址与信件。当前版本不支持重新导入已导出的方案。对示例信托所做的更改会在刷新后重置。",
      sourceLabel: "",
    },
    vaults: {
      title: "金库：有目的的投资组合",
      tag: "核心概念",
      text: "Heirloom 金库的设计目标，是在明确的分配规则下持有一个投资组合。创建者设定受益人与条款。生产系统必须在经过验证的智能合约中强制执行这些条款。",
      extra:
        "本前端每个演示信托支持一位受益人、一篮子示例资产，以及最多六个预定的释放节点。多受益人、资产存入、每月定投与真实余额，均属未来的集成工作。",
      sourceLabel: "",
    },
    portfolio: {
      title: "股票代币与资格要求",
      tag: "基础",
      text: "本产品围绕符合条件的代币化股票与 ETF 设计。前端的资产列表仅为示意，既不是经过验证的资产注册表，也不构成购买任何资产的要约。",
      extra:
        "Robinhood 将股票代币描述为代币化债务证券，提供对标的证券的经济敞口，但不赋予对这些标的证券的法定或实益所有权。生产环境的访问必须核查司法辖区、参与者资格、代币注册状态以及发行方的现行限制。",
      sourceLabel: "Robinhood 股票代币文档",
    },
    schedules: {
      title: "解锁与释放时间表",
      tag: "你的条款",
      text: "选择未来的释放日期，以及分配给每个日期的百分比。各百分比之和必须为 100%，且日期必须按时间先后排列。25% / 25% / 50% 的时间表指的是最初的配置比例，而不是剩余投资组合。",
      extra:
        "演示只保存日期与配置百分比，并不会真正释放资产。生产环境需要明确的时区策略、确定性的代币单位分配、取整规则、分配执行器、最终性处理，以及防止重复执行的保护。",
      sourceLabel: "",
    },
    heartbeat: {
      title: "心跳签到与继承",
      tag: "延续性",
      text: "心跳是创建者定期进行的一次签到。设计思路是：在签到窗口耗尽并经过宽限期后，启动预先设定的继承方案。",
      extra:
        "在本预览中，「我在」只会更新一个本地时间戳。错过签到不会触发任何转账。生产环境需要约定的宽限期、安全的通知机制、所有权证明，以及经过独立验证的执行流程。错过签到并不构成法律意义上的死亡证明。",
      sourceLabel: "",
    },
    guardians: {
      title: "监护人，以及他们的边界",
      tag: "人与权限",
      text: "监护人是一个被指定的钱包，用于提供有边界的监督。拟定中的权力包括暂停分配与见证里程碑。监护人不应具备改变投资组合流向的能力。",
      extra:
        "本预览仅记录一个可选的监护人地址。它不会对该钱包做身份认证，不实现多重签名批准，也不执行里程碑见证。生产环境合约必须逐条列明并强制执行每一项权限。",
      sourceLabel: "",
    },
    modes: {
      title: "可撤销与不可撤销条款",
      tag: "一个慎重的选择",
      text: "可撤销模式的设计目标，是在最终合约政策下保留创建者撤销的能力。不可撤销模式的设计目标，则是在封存之后移除这一能力。请慎重选择。",
      extra:
        "创建器会要求你手动输入 IRREVOCABLE 进行确认，才会保存该演示模式。这只是一次教育性质的确认；并没有任何金库被真正封存。即便标记为不可撤销的演示，也可以从本地存储中删除，因为它只是一份本地计划。",
      sourceLabel: "",
    },
    letters: {
      title: "只有你能写的那封信",
      tag: "个人心意",
      text: "添加一封可选的信件，告诉受益人你当初为何开始。它会显示在信托的「信件」标签页，并包含在下载的演示方案中。",
      extra:
        "本前端中的信件以纯文本保存在浏览器存储里。它们没有加密，对任何能访问这个浏览器的人都是可见的。请不要输入机密或敏感的个人信息。加密存储、密钥恢复与受益人交付，都需要在生产环境中实现。",
      sourceLabel: "",
    },
    network: {
      title: "为 Robinhood Chain 而设计",
      tag: "网络",
      text: "目标网络是 Robinhood Chain，使用 ETH 支付 Gas。",
      extra:
        "Heirloom 连接 Robinhood Chain，以获取实时的金库状态、余额与数字心跳。",
      sourceLabel: "官方网络配置说明",
    },
    boundaries: {
      title: "风险与诚实的边界",
      tag: "使用前请阅读",
      text: "Heirloom 描述的是可编程的托管规则，而不是法定意义上的法律信托。本前端不构成法律、税务或投资建议。遗产规划可能需要相应的专业支持与针对特定司法辖区的安排。",
      extra:
        "生产环境的风险包括：本金损失、发行方与交易对手风险、智能合约缺陷、密钥被盗、数据不准确、服务不可用，以及交易不可逆。本预览不对任何收益、费率、可用性、安全审计或永久执行作出保证。市场价值可能下跌。此处不会核查资格条件。",
      sourceLabel: "",
    },
    token: {
      title: "计划中的 $HEIR 代币",
      tag: "路线图",
      text: "产品规划中包含一个未来的协议代币、高级功能，以及可能的协议费用机制。商业政策与合约配置尚未确定。",
      extra:
        "本前端没有任何代币购买或质押流程。没有任何代币合约或奖励率经过验证。路线图是一份产品计划，不构成发布日期或投资承诺。",
      sourceLabel: "",
    },
  },
};
