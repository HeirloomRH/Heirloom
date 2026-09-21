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

    modeLabel: "您希望如何注资？",
    modeDirect: "转入单一资产",
    modeDirectHint: "将单一代币直接转账至金库。",
    modeBasket: "使用 ETH 或 USDG 存入（自动拆分篮子）",
    modeBasketHint:
      "一次性支付 ETH 或 USDG。路由器将买入整个资产篮子，并在同一笔交易中交付至金库。",

    inputAssetLabel: "存入币种",
    inputAssetEth: "ETH",
    inputAssetUsdg: "USDG（美元稳定币）",

    basketIntro:
      "您的 ETH 将按本信托的目标配置比例拆分，并在同一笔交易中完成兑换。代币会直接交付至金库地址，不会经过您的钱包。",
    basketIntroUsdg:
      "您的 USDG 将按本信托的目标配置比例拆分。股票代币将通过 Robinhood Chain 流动池买入，USDG 目标比例将直接转入金库。",
    basketAmountLabel: "存入数量",
    basketAmountPlaceholder: "例如 0.5",
    basketBalance: "您的余额：",
    basketPreviewTitle: "您将收到",
    colTarget: "目标比例",
    colSpend: "投入份额",
    colReceive: "预计收到",
    estimateUnavailable: "无报价",
    passthroughNote: "原样持有",
    fallbackNote: (symbol: string) => `改为兑换成 ${symbol}`,
    basketRouted: "已兑换",
    basketPassthrough: "已转账",
    basketTotal: "合计",

    approveUsdg: "授权 USDG",
    approvingUsdg: "正在授权 USDG……",
    approvalSubmitted: "USDG 授权交易已提交至 Robinhood Chain……",
    approvalSuccess: "USDG 授权成功！",

    sealedExecutionLabel: "执行隐私",
    sealedExecutionPublic: "公开多重调用",
    sealedExecutionDarkpool: "加密中继（暗池模式）",
    sealedExecutionDarkpoolHint:
      "隐藏您的钱包身份。通过链下 Permit2 签名授权，并由 Heirloom 中继器在链上直接结算交付至信托金库。",

    approvePermit2: "授权 Permit2",
    approvingPermit2: "正在授权 Permit2……",
    permit2ApprovalSubmitted: "Permit2 授权交易已提交至 Robinhood Chain……",
    permit2ApprovalSuccess: "USDG 已成功授权至 Permit2！",

    signSealedDeposit: "签名并进行加密存入",
    signingSealedDeposit: "正在请求 Permit2 签名……",
    relayingSealedDeposit: "Heirloom 中继器正在链上执行……",
    relayerUnavailable: "Heirloom 中继器暂时离线，请使用公开多重调用模式。",

    slippageLabel: "滑点容忍度",
    slippageHint:
      "若某一腿无法在该容忍度内成交，将转为兑换 USDG，而不会导致整笔存入回滚。",
    slippageCustom: "自定义",

    routerCheckingTitle: "正在检查兑换流动性……",
    routerUnavailableTitle: "该网络暂不支持自动拆分",
    routerUnavailableRouter:
      "Robinhood Chain 上所配置的地址未部署 Uniswap 路由器，因此无处路由此次兑换。",
    routerUnavailableQuoter:
      "兑换路由器已在 Robinhood Chain 上运行，但其报价合约无法访问，因此无法保证您将收到的数量。请改为转入单一资产，而不要在无报价的情况下兑换。",
    routerUnavailableProbe:
      "无法连接 Robinhood Chain 以确认兑换流动性。请改为转入单一资产，或稍后重试。",
    routerUnavailableAction: "改为转入单一资产",
    quotesUnavailable:
      "实时报价不可用，因此无法显示您将收到的数量。下方的 ETH 拆分比例是精确的。",

    basketSend: "兑换并存入",
    basketReview: "查看拆分明细",
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

    // 篮子规划错误码，来自 src/lib/heirloom/basket.mjs。
    basket_empty: "本信托没有可供拆分的目标配置。",
    basket_allocation_positive: "每项配置比例都必须大于 0%，才能路由篮子存入。",
    basket_allocation_total: "目标配置比例之和必须为 100%。",
    basket_duplicate_symbol:
      "本信托中同一资产出现了两次；篮子存入要求每项资产仅一行。",
    basket_amount_positive: "请输入大于 0 的 ETH 数量。",
    slippage_invalid: "滑点容忍度必须为整数基点。",
    slippage_too_low: "滑点容忍度不得低于 0.01%。",
    slippage_too_high: "滑点容忍度不得超过 50%。",
    routerUnavailable: "该网络不支持兑换路由，因此无法执行篮子存入。",
    quotesRequired: "签署篮子存入前必须获取实时报价。",
    insufficientEth: (balance: string) =>
      `ETH 不足。您已连接的钱包在 Robinhood Chain 上持有 ${balance} ETH。`,
    insufficientUsdg: (balance: string) =>
      `USDG 余额不足。您当前连接的钱包在 Robinhood Chain 上持有 ${balance} USDG。`,
  },

  success: {
    heartbeat: "心跳已确认！失联开关的期限已延长。",
    depositVerified: "本金存入已在 Robinhood Chain 上验证通过！",
  },

  telegram: {
    title: "Telegram 停机开关警报",
    desc: "在心跳截止日期前接收私密倒计时提醒（30天、14天、7天、24小时），并在 Telegram 中一键完成签到。",
    connectButton: "连接 @HeirloomRHBot",
    connecting: "正在生成配对链接……",
    connected: "警报已激活 (@HeirloomRHBot)",
    disconnectButton: "断开连接",
    disconnecting: "正在断开……",
    modalTitle: "连接 Telegram 警报",
    modalDesc: "点击下方按钮在 Telegram 中打开并配对您的信托与 @HeirloomRHBot。配对链接将在 1 小时内有效。",
    openBot: "在 Telegram 中打开",
    copyLink: "复制链接",
    copied: "链接已复制！",
    close: "关闭",
    checkinBannerTitle: "Telegram 心跳签到",
    checkinBannerDesc: "您通过 @HeirloomRHBot 的警报打开了此金库。请在下方签名以重置 90 天心跳窗口。",
  },

  beneficiaryFallback: "受益人",
  tokenSuffix: " 代币",
};
