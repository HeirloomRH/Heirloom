import type { concierge as EnConcierge } from "../en/concierge";

export const concierge: typeof EnConcierge = {
  launcherLabel: "打开 Heirloom 智能助手",
  closeLabel: "关闭智能助手",
  title: "Heirloom 智能助手",
  subtitle: "咨询信托设置、心跳检查，或受益人可以获得什么。",
  poweredBy: "由 Orbio 推理驱动，由 Heirloom 自有的 CREDIT 支付，绝不使用你的资金。",

  inputPlaceholder: "输入你的问题…",
  send: "发送",
  sending: "发送中…",

  emptyState: "关于创建或管理信托，你可以问任何问题。",
  errorPrefix: "出了点问题：",

  offlineTitle: "智能助手正在准备中",
  offlineBody: "Heirloom 智能助手暂时无法回答问题，请稍后再试。",
};
