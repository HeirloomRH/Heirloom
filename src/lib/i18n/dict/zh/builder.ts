import type { builder as EnBuilder } from "../en/builder";

export const builder: typeof EnBuilder = {
  breadcrumbBack: "你的工作区",
  breadcrumbCurrent: "创建信托",

  progressAriaLabel: "创建进度",
  steps: ["投资组合", "受益人", "条款", "信件", "确认"],
  stepCounter: (n: number) => `第 ${String(n).padStart(2, "0")} 步 / 共 05 步`,

  titles: [
    "地基。",
    "值得你为之建造的那个人。",
    "把你的心愿写进规则。",
    "不只是一个投资组合。",
    "一份清清楚楚的承诺。",
  ],
  descriptions: [
    "为他们的明天找一个起点。",
    "把一个人放在你计划的中心。",
    "决定未来在何时、以何种方式展开。",
    "告诉他们你当初为何开始。",
    "保存信托之前，请仔细阅读这份计划。",
  ],

  errors: {
    nameRequired: "请为你的信托取一个名字。",
    beneficiaryRequired: "请输入受益人的姓名。",
    beneficiaryWallet:
      "请输入有效的受益人钱包地址（0x 开头，后跟 40 位十六进制字符）。",
    guardianWallet: "请输入有效的监护人钱包地址，或将此项留空。",
    guardianSameAsBeneficiary: "监护人与受益人请使用不同的钱包地址。",
    grantorRequired: "请连接你的钱包，或输入有效的委托人钱包地址。",
    ackRequired: "封存之前，请先确认知悉信托条款。",
    typeIrrevocable: "请输入 IRREVOCABLE，以确认你理解这些永久性条款。",
    createFailed: "在 Robinhood Chain 上创建信托失败，请重试。",
    amount_range: "请输入介于 $1 到 $100,000,000 之间的演示金额。",
    allocation_positive: "每个选中的资产，配置比例都必须大于 0%。",
    allocation_total: "你的投资组合配置比例之和必须为 100%。",
    schedule_empty: "请至少添加一个释放日期。",
    schedule_future: "请为每一次释放选择有效的未来日期。",
    schedule_order: "释放日期必须按时间先后排列，且不能重复。",
    release_range: "每次释放的比例必须大于 0%，且不超过 100%。",
    release_total: "你的释放比例之和必须为 100%。",
  },

  step0: {
    nameLabel: "信托名称",
    namePlaceholder: "例如：Emma 的明天",
    amountLabel: "初始投资组合金额",
    amountHint: "示意性的美元金额",
    amountAriaLabel: "初始投资组合金额",
    basketHeading: "构建你的资产篮子",
    basketHint: "为你的信托投资组合选择代币配置。",
    addAsset: (symbol: string) => `添加 ${symbol}`,
    removeAsset: (symbol: string) => `移除 ${symbol}`,
    allocationPercent: (symbol: string) => `${symbol} 配置百分比`,
    callout: "这个篮子只是一个起点，并不构成投资建议。",
  },

  step1: {
    nameLabel: "受益人姓名",
    namePlaceholder: "这份信托是为谁准备的？",
    walletLabel: "受益人钱包",
    hint: "这是预定的接收钱包。在创建任何金库之前，该地址必须准确无误。",
  },

  step2: {
    scheduleHeading: "解锁时间表",
    allocated: (percent: number) => `已分配 ${percent}%`,
    scheduleHint: "每个百分比都是最初投资组合配置的份额，而不是剩余余额的份额。",
    releaseDate: "释放日期",
    releasePercent: "释放比例 %",
    releaseDateAria: (n: number) => `第 ${n} 次释放的日期`,
    releasePercentAria: (n: number) => `第 ${n} 次释放的百分比`,
    removeRelease: (n: number) => `移除第 ${n} 次释放`,
    addRelease: "添加一次释放",
    modeLegend: "金库模式",
    revocable: "可撤销",
    revocableNote: "创建者保留预期中的撤销能力。",
    irrevocable: "不可撤销",
    irrevocableNote: "设计为一经链上封存即永久生效。",
    heartbeatLabel: "继承签到窗口",
    heartbeatDisabled: "已禁用 — 不自动触发继承",
    heartbeatEvery: (days: number) => `每 ${days} 天`,
    guardianLabel: "监护人钱包",
    guardianHint: "可选 · 计划中的有边界监督",
  },

  step3: {
    eyebrow: "写给他们明天的一封信",
    srLabel: "写给受益人的信",
    placeholder: (name: string) => `亲爱的 ${name}：\n\n这是为你将要创造的人生准备的……`,
    placeholderFallback: "你",
    counter: (used: string) => `${used} / 5,000 字符`,
    hint: "可选。你的信件通过 AES-256-GCM 端到端加密，并保持封存状态，直到里程碑释放或继承程序触发。",
  },

  review: {
    for: "受益人",
    corpus: "本金估值",
    terms: "条款",
    checkIns: "签到频率",
    checkInsEvery: (days: number) => `每 ${days} 天`,
    checkInsDisabled: "已禁用",
    guardian: "监护人",
    guardianRegistered: "已在链上登记",
    guardianNone: "无",
    letter: "信件",
    letterSealed: "已加密并封存",
    letterNone: "未添加",
    beneficiary: "受益人钱包",
    grantor: "委托人",
    connectedSuffix: "（已连接）",
    notConnected: "未连接",
    connectPrompt: "请连接钱包，或输入创建者地址：",
    connectWallet: "连接钱包",
    modeRevocable: "可撤销",
    modeIrrevocable: "不可撤销",
  },

  ack: {
    title: "永久，就是真的永久。",
    body: "在不可撤销金库中，委托人一经封存，便无法撤销、收回或改写这些条款。",
    typeLabel: "请输入 IRREVOCABLE 以示确认",
    checkbox:
      "我理解 Heirloom 会在 Robinhood Chain 上创建一个可编程的信托金库。我的资产将被隔离，并由代码按照这些条款进行管理。",
  },

  actions: {
    back: "返回",
    cancel: "取消",
    continue: "继续",
    sealing: "正在链上封存信托…",
    seal: "在 Robinhood Chain 上封存信托",
  },

  aside: {
    eyebrow: "你的传承，正在成形",
    untitled: "为明天准备的东西。",
    forSomeone: (name: string) => `为 ${name} 而建，满怀心意。`,
    noBeneficiary: "小小的开端，长久的心意。",
    illustrative: "示意投资组合",
    bottom: "围绕你的心愿而建。",
    disclaimer: "所有数值均为示意。已保存的信托会写入 Robinhood Chain。",
  },

  errorDialog: {
    title: "请检查你填写的内容",
    gotIt: "知道了",
  },

  success: {
    title: "信托已在链上封存",
    body: "你的信托已在 Robinhood Chain 上创建，并拥有一个专属金库地址：",
    opening: (seconds: number) => `${seconds} 秒后打开你的实时金库…`,
    viewVault: "立即查看金库",
  },
};
