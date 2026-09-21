import type { roadmap as EnRoadmap } from "../en/roadmap";

export const roadmap: typeof EnRoadmap = {
  eyebrow: "为长远而建",
  titleLine1: "始于一份开端。",
  titleLine2: "继而，代代相传。",
  subtitle: "从第一个金库，到长久传承的路径。",

  introLead: "愿景着眼长远，工作则一步一步来。",
  introNoteLine1: "各阶段描述的是产品意图，",
  introNoteLine2: "并非承诺的发布日期。",

  tags: {
    frontendPreview: "前端预览",
    planned: "计划中",
    research: "研究中",
  },

  phases: {
    h1: {
      title: "为明天打下地基。",
      description: "从真正重要的事情开始：一个投资组合、一个人，以及一份计划。",
      items: [
        "信托创建器与投资组合配置",
        "解锁节点与释放时间表",
        "继承签到界面",
        "信托页面与个人信件",
      ],
      note: "可体验交互式本地演示。金库合约与时间表执行仍属待完成的生产工作。",
    },
    h2: {
      title: "陪伴生活本来的样子。",
      description: "为一份长期计划，配上一套周到的支持体系。",
      items: [
        "每月津贴流",
        "股票代币或 USDG 分配",
        "有边界的监护人角色",
        "由监护人见证的里程碑解锁",
      ],
      note: "演示中已包含监护人地址录入。津贴发放与见证执行仍在计划中。",
    },
    h3: {
      title: "超越一代人的传承。",
      description: "让一份善意，成为另一份善意的开始。",
      items: [
        "$HEIR 协议代币",
        "高级产品功能",
        "多代金库链式传承",
        "协议费用机制",
      ],
      note: "代币合约、费率、高级功能规则与分配政策均未最终确定，也尚未上线。",
    },
    h4: {
      title: "隐私，同时可证明已作安排。",
      description: "探索在不牺牲清晰度的前提下保护隐私的方式。",
      items: [
        "私密金库模式",
        "屏蔽式投资组合研究",
        "基于见证的证明",
        "私密的受益人交付",
      ],
      note: "仅为研究方向。目前未实现任何屏蔽余额或私密证明系统。",
    },
  },

  endTitleLine1: "从一件值得",
  endTitleLine2: "传下去的事开始。",
  endCta: "体验信托创建器",
};
