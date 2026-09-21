import type {
  common as EnCommon,
  contractBadge as EnContractBadge,
  wallet as EnWallet,
} from "../en/common";

export const common: typeof EnCommon = {
  brand: "heirloom",
  skipToContent: "跳转到正文",

  nav: {
    home: "Heirloom 首页",
    mainNavigation: "主导航",
    howItWorks: "运作方式",
    docs: "文档",
    whitepaper: "白皮书",
    roadmap: "路线图",
    openApp: "打开应用",
    openMenu: "打开菜单",
    closeMenu: "关闭菜单",
  },

  language: {
    label: "语言",
    english: "EN",
    chinese: "中文",
    switchToEnglish: "Switch to English",
    switchToChinese: "切换到中文",
  },

  footer: {
    documentation: "文档",
    whitepaper: "白皮书",
    roadmap: "路线图",
    twitter: "Twitter / X",
    twitterTitle: "在 X 上关注 Heirloom",
    telegram: "Telegram",
    telegramTitle: "Telegram 社区",
    risks: "风险与边界",
    buildLegacy: "开始构建你的传承",
    copyright: "© 2026 Heirloom",
    tagline: "为将要到来的一切而造。",
    chain: "为 Robinhood Chain 而设计 ↗",
    finePrint:
      "前端预览版本。此处不存入也不管理任何资金。Heirloom 描述的是可编程金库，而非法定意义上的法律信托。股票代币属于代币化债务证券；能否使用取决于资格条件与所在司法辖区。投资有风险，本金可能受损。",
  },

  notFound: {
    eyebrow: "404 / 有点偏离了路径",
    title: "我们带你回到正轨。",
    body: "这个页面不在计划之内。",
    cta: "返回 Heirloom",
  },

  error: {
    title: "页面加载失败",
    body: "我们这边出了点问题。你可以尝试刷新，或返回首页。",
    retry: "重试",
    goHome: "返回首页",
  },

  demoNotice: {
    status: "Robinhood Chain · 运行中",
    explorer: "区块浏览器",
  },

  dialog: {
    close: "关闭对话框",
  },
};

export const wallet: typeof EnWallet = {
  connect: "连接钱包",
  switchChain: "切换到 Robinhood Chain",
  connectedTo: (chain: string) => `已连接到 ${chain}`,
  chainIconAlt: "链图标",
};

export const contractBadge: typeof EnContractBadge = {
  tag: "CA",
  comingSoon: "即将公布",
  copy: "复制",
  copied: "已复制",
  copyTitle: "复制合约地址",
  dexScreener: "DexScreener",
  dexScreenerTitle: "在 DexScreener 中打开",
};
