import type { Address } from "viem";

export const PRIVACY_CONTRACT_ADDRESSES = {
  trustFactory: "0x1111111111111111111111111111111111111111" as Address,
  scheduleExecutor: "0x2222222222222222222222222222222222222222" as Address,
  heartbeatRegistry: "0x3333333333333333333333333333333333333333" as Address,
  guardianModule: "0x4444444444444444444444444444444444444444" as Address,
  termsVault: "0x5555555555555555555555555555555555555555" as Address,
  stealthDistributor: "0x6666666666666666666666666666666666666666" as Address,
  privateHeartbeat: "0x7777777777777777777777777777777777777777" as Address,
  keyLadder: "0x8888888888888888888888888888888888888888" as Address,
  shieldedPool: "0x9999999999999999999999999999999999999999" as Address,
  disclosureRegistry: "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" as Address,
};

export const trustFactoryAbi = [
  {
    name: "createTrust",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "grantor", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "termsHash", type: "bytes32" },
      { name: "isPrivate", type: "bool" },
    ],
    outputs: [{ name: "vaultAddress", type: "address" }],
  },
] as const;

export const termsVaultAbi = [
  {
    name: "storeTerms",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trustId", type: "string" },
      { name: "cipherTerms", type: "string" },
      { name: "cipherLetter", type: "string" },
      { name: "termsHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "getTerms",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "trustId", type: "string" }],
    outputs: [
      { name: "cipherTerms", type: "string" },
      { name: "cipherLetter", type: "string" },
      { name: "termsHash", type: "bytes32" },
    ],
  },
] as const;

export const privateHeartbeatAbi = [
  {
    name: "checkIn",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trustId", type: "string" },
      { name: "relayedSig", type: "bytes" },
      { name: "timestamp", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getHeartbeatStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "trustId", type: "string" }],
    outputs: [
      { name: "lastHeartbeat", type: "uint256" },
      { name: "deadline", type: "uint256" },
      { name: "isLapsed", type: "bool" },
    ],
  },
] as const;

export const keyLadderAbi = [
  {
    name: "registerStageKey",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "trustId", type: "string" },
      { name: "stageIndex", type: "uint8" },
      { name: "keyHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "getStageKeyHash",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "trustId", type: "string" },
      { name: "stageIndex", type: "uint8" },
    ],
    outputs: [{ name: "keyHash", type: "bytes32" }],
  },
] as const;
