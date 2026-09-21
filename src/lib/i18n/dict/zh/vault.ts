import type { vault as EnVault } from "../en/vault";

export const vault: typeof EnVault = {
  loading: "正在从 Robinhood Chain 加载你的信托…",
  notFoundTitle: "找不到这份信托。",
  notFoundBody: "它可能不存在，或者后端服务暂时无法连接。",
  backToWorkspace: "返回工作区",

  breadcrumbBack: "你的工作区",
  breadcrumbSample: "示例预览",
  breadcrumbLive: "实时信托金库",

  forPrefix: (name: string) => `受益人：${name}`,
  status: {
    successionTriggered: "已触发继承",
    activeFunded: "活跃且已注资",
    pendingFunding: "待注资",
  },
  tagline: "代际财富，在 Robinhood Chain 上以代码写就。",

  refresh: "刷新",
  refreshTitle: "从 Robinhood Chain 刷新余额",
  export: "导出",
  exportSuccess: "信托摘要已准备好下载。",
  exportFailed: "下载失败。",

  addressCard: {
    title: "金库地址",
    copy: "复制",
    copied: "已复制",
    explorer: "区块浏览器",
    deposit: "存入",
    activateLead: "激活这份信托：",
    activateBody:
      "把代币化资产直接存入这个金库地址即可完成注资。可以使用上方的「存入」按钮，也可以从你的钱包手动转账。",
  },

  summary: {
    eyebrow: "链上持仓与储备",
    noAssets: "金库当前持有 0.00 资产，等待存入。",
    configuredAssets: (n: number) => `已配置 ${n} 项资产`,
    termsRevocable: "可撤销条款",
    termsIrrevocable: "不可撤销条款",
  },

  tabsAriaLabel: "信托详情",
  tabs: {
    portfolio: "投资组合",
    schedule: "解锁时间表",
    letter: "信件",
  },

  portfolio: {
    title: "为明天打下的地基。",
    micro: "目标资产配置",
    colAsset: "资产",
    colAllocation: "配置比例",
    colBalance: "金库实时余额",
  },

  schedule: {
    title: "好事，自有它的时节。",
    micro: "解锁节点与时间线",
    hint: "解锁节点会在预定的里程碑日期解锁资产，或在继承程序执行时立即解锁。",
    cliffTooltip: (n: string, percent: number, date: string) =>
      `节点 ${n}：${percent}%（${date}）`,
    cliffBadge: (n: string) => `节点 ${n} · 里程碑`,
    transferred: "已转给受益人",
    reachedUnlocked: "里程碑已到达（已解锁）",
    milestoneReached: "里程碑已到达",
    inDays: (n: number) => `${n} 天后`,
    inMonths: (n: number) => `${n} 个月后`,
    inYears: (n: string) => `约 ${n} 年后`,
    claimed: "已领取",
    claimMilestone: "领取此里程碑",
    unlocked: "已解锁",
    locked: "已锁定",
    corpusShare: "本金份额",
    corpusShareSub: "占信托总资产的比例",
    tokenRelease: "代币释放",
    pendingDeposit: "等待链上存入",
    pendingDepositWithAmount: (amount: string) => `${amount}（等待链上存入）`,
    releaseTrigger: "释放触发条件",
    triggerReached: "日历里程碑已到达",
    triggerPending: "按日历解锁，或在委托人继承程序执行时解锁",
  },

  letter: {
    decryptedEyebrow: "已解密的个人信件",
    sealedTitle: "个人信件已在链上封存",
    sealedBody:
      "使用 AES-256-GCM 加密。当信托处于活跃或已触发状态时，受益人可解锁阅读。",
    unlockCta: "解锁并阅读信件",
    emptyTitle: "一个还没写下的故事。",
    emptyBody: "这份信托没有附上个人信件。",
    dialogTitle: "写给受益人的信",
  },

  heartbeat: {
    title: "失联开关",
    daysRemaining: "天后到期",
    missed: "已错过心跳窗口。继承方案现已对受益人生效。",
    window: (days: number) =>
      `窗口期：${days} 天。若错过签到，继承程序将自动执行。`,
    signing: "签名中…",
    checkIn: "签到（免 Gas）",
  },

  access: {
    title: "你的权限",
    isGrantor: "你是委托人（创建者）",
    isBeneficiary: "你是受益人",
    connectPrompt: "连接钱包后即可签到或领取",
    connectWallet: "连接钱包",
  },

  deposit: {
    title: "存入资产",
    intro:
      "选择要存入这个金库的资产与金额（在 Robinhood Chain 上）。你的钱包会提示你签署该交易。",
    assetLabel: "资产",
    amountLabel: "金额",
    walletPrefix: "钱包余额：",
    max: "全部",
    amountPlaceholder: "例如 10.5",
    zeroBalance: (symbol: string) =>
      `你当前连接的钱包在 Robinhood Chain 上持有 0 ${symbol}。请先为钱包充入 ${symbol}，然后再进行存入。`,
    toVault: "存入至金库",
    cancel: "取消",
    sending: "发送中…",
    send: "发送存入",
    pendingTitle: "交易已提交",
    pendingBody: "你的存入交易已广播至 Robinhood Chain，正在等待确认…",
    viewTransaction: "查看交易",
    successTitle: "存入已确认",
    successBodyPrefix: "你存入的",
    successBodySuffix: "已在 Robinhood Chain 上确认。金库余额正在刷新。",
    viewOnExplorer: "在区块浏览器中查看",
  },

  notices: {
    successTitle: "操作成功",
    done: "完成",
    errorTitle: "出了点问题",
    dismiss: "关闭",
  },

  errors: {
    loadFailed: "无法从 Robinhood Chain 加载该信托。",
    connectToDeposit: "请连接钱包后再存入资产。",
    selectAsset: "请选择要存入的资产。",
    invalidAmount: "请输入大于 0 的有效金额。",
    txFailed: "交易失败或已被拒绝。",
    connectGrantor: "请连接委托人钱包以提交签到。",
    onlyGrantor: "只有委托人钱包才能通过签到延长失联开关的期限。",
    heartbeatFailed: "提交心跳签名失败。",
    noDeposit: "链上尚未确认到新的存入。",
    unlockFailed: "解锁加密信件失败。",
    connectBeneficiary: "请连接受益人钱包后再领取。",
    claimFailed: "执行领取发放失败。",
  },

  success: {
    heartbeat: "心跳已确认！失联开关的期限已延长。",
    depositVerified: "本金存入已在 Robinhood Chain 上验证通过！",
  },

  beneficiaryFallback: "受益人",
  tokenSuffix: " 代币",
};
