import type { dashboard as EnDashboard } from "../en/dashboard";

export const dashboard: typeof EnDashboard = {
  eyebrow: "你的链上信托工作区",
  title: "为他们所有的明天。",
  description: "由 Robinhood Chain 驱动的非托管代币化股票信托。",
  createCta: "创建信托",

  unnamedTrust: "未命名信托",
  notAvailable: "暂无",

  connectPrompt: {
    title: "连接你的 Robinhood Chain 钱包",
    body: "连接后即可查看你作为委托人的金库、签署链下心跳，并领取作为受益人的继承资产。",
  },

  stats: {
    trustsLabel: "链上信托",
    trustsNote: "在 Robinhood Chain 上实时运行",
    fundedLabel: "已注资并激活",
    fundedNote: "本金已存入并已就绪",
    beneficiariesLabel: "受益人钱包",
    beneficiariesNote: "已指定的继承接收方",
  },

  tools: {
    heading: "信托",
    refresh: "刷新",
    refreshTitle: "从 Robinhood Chain 刷新",
    searchAriaLabel: "搜索信托",
    searchPlaceholder: "按名称、地址或金库搜索…",
    filterAriaLabel: "按状态筛选信托",
    showGrid: "显示为网格",
    showList: "显示为列表",
  },

  filters: {
    all: "全部状态",
    grantor: "我创建的（委托人）",
    beneficiary: "我继承的（受益人）",
    active: "活跃（已就绪）",
    pendingFunding: "待注资",
    successionTriggered: "已触发继承",
    paused: "已暂停",
  },

  status: {
    active: "活跃 · 已就绪",
    pendingFunding: "待注资",
    successionTriggered: "已触发继承",
    paused: "已暂停",
  },

  loading: "正在查询 Robinhood Chain 信托索引…",
  loadError: "无法从 Robinhood Chain 加载链上信托。",

  card: {
    grantorBadge: "委托人",
    beneficiaryBadge: "受益人",
    forPrefix: "受益人：",
    dedicatedVault: (index: number) => `专属金库 #${index}`,
    revocable: "可撤销信托",
    irrevocable: "不可撤销信托",
    createdPrefix: "创建于",
  },

  empty: {
    noMatchTitle: "没有匹配的信托。",
    noMatchBody: "试着调整搜索关键词或筛选条件。",
    clearFilters: "清除筛选",
    firstTitle: "每一份传承，都要有个起点。",
    firstBody:
      "在 Robinhood Chain 上创建你的第一个非托管信托基金，或查看一个实时的链上金库。",
    firstCta: "创建你的第一份信托",
    inspectCta: "查看已验证的实时金库 #4",
  },

  bottom: {
    title: "计划只是故事的一部分。",
    body: "一封加密的亲笔信，会让你的投资组合拥有长久的意义。",
    cta: "了解信件功能",
  },

  errorDialog: {
    title: "出了点问题",
    dismiss: "关闭",
    retry: "重试",
  },
};
