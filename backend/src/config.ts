import dotenv from "dotenv";

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT || "3001", 10),
  databaseUrl: process.env.DATABASE_URL || "",

  // Robinhood Chain
  rhcId: parseInt(process.env.RHC_ID || "4663", 10),
  rhcRpcUrl: process.env.RHC_RPC_URL || "https://rpc.mainnet.chain.robinhood.com",

  // Vault & Cryptography
  vaultMasterMnemonic:
    process.env.VAULT_MASTER_MNEMONIC ||
    "test test test test test test test test test test test junk",
  encryptionKey:
    process.env.ENCRYPTION_KEY ||
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  protocolFeeWallet:
    process.env.PROTOCOL_FEE_WALLET || "0xAa780beBe4Aa01AA435E538f8A810C202850b727",

  // Relayer & Operator Wallets
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || process.env.OPERATOR_PRIVATE_KEY || "",
  operatorPrivateKey: process.env.OPERATOR_PRIVATE_KEY || "",

  // Orbio ($CREDIT / $ORBIO on Robinhood Chain) — addresses default to the
  // verified deployments (confirmed against robinhoodchain.blockscout.com);
  // override only for a fork/testnet.
  creditAddress: process.env.CREDIT_ADDRESS || "0xe33322da1380e61e5ae5dfb21e7f62924c73004c",
  orbioExchangeAddress:
    process.env.ORBIO_EXCHANGE_ADDRESS || "0x6951ffd32630b05e06f50062aea801625a58ebc0",
  // Basis points of tolerance above the $1.00 CREDIT peg a buy is allowed to
  // pay before the leg is deferred instead of executed. Doc spec: "never buys
  // above $1.00 + tolerance".
  orbioQuoteToleranceBps: parseInt(process.env.ORBIO_QUOTE_TOLERANCE_BPS || "200", 10),

  // Orbio Gateway (OpenAI-compatible inference endpoint) for Heirloom's own
  // concierge agent. Falls back to the deposit relayer key when unset — approved
  // tradeoff for now, but note the relayer wallet holds standing maxUint256
  // approvals to SwapRouter02/Permit2/Orbio Exchange, so reusing it means the
  // concierge path (the one surface here that handles third-party AI responses)
  // can reach those approvals too. Set ORBIO_STUDIO_PRIVATE_KEY explicitly to
  // split them again.
  orbioGatewayUrl: process.env.ORBIO_GATEWAY_URL || "https://www.orbio.so/api/v1",
  orbioStudioPrivateKey:
    process.env.ORBIO_STUDIO_PRIVATE_KEY ||
    process.env.RELAYER_PRIVATE_KEY ||
    process.env.OPERATOR_PRIVATE_KEY ||
    "",

  // How often the inference-release worker polls for due CREDIT allowance
  // releases (push, not pull — see inferenceReleaseWorker.ts). Same idiom as
  // ORBIO_QUOTE_TOLERANCE_BPS above; the heartbeat worker's interval is still
  // hardcoded in index.ts, this one isn't.
  inferenceReleaseIntervalMs: parseInt(process.env.INFERENCE_RELEASE_INTERVAL_MS || "60000", 10),

  // How often the stake-claim worker sweeps settled CREDIT from Orbio Staking
  // into each staked trust's vault. Orbio itself settles hourly on its own
  // keeper schedule — this just needs to poll more often than that to not
  // lag noticeably behind it.
  stakeClaimIntervalMs: parseInt(process.env.STAKE_CLAIM_INTERVAL_MS || "300000", 10),

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: (process.env.TELEGRAM_BOT_USERNAME || "@HeirloomRHBot").replace(/^@/, ""),
  // Sent to Telegram on setWebhook and echoed back on every update in the
  // X-Telegram-Bot-Api-Secret-Token header. No fallback value on purpose —
  // an anonymous POST to /api/telegram/webhook could otherwise forge
  // /unlink or /status against any chat_id with no real Telegram account
  // involved. Unset means the webhook route currently accepts unauthenticated
  // requests (logged loudly); set this in Render's env to close the gap.
  telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || "",

  // Frontend Origin for CORS
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",

  // EIP-712 domain shared by every off-chain typed-data signature scheme
  // (heartbeats, beneficiary key registration, private-mode signatures).
  // The zero address was a real gap: EIP-712's verifyingContract exists
  // specifically to stop a signature crafted for one app/contract from
  // verifying against another that happens to use the same domain
  // name/version/chainId — 0x000...000 defeats that. No TrustVault
  // contract is deployed yet (see docs/Heirloom Private Legacy.pdf §3), so
  // this is a deterministic, unique-to-Heirloom placeholder
  // (keccak256("heirloom.trust.protocol.eip712.v1"), last 20 bytes) rather
  // than a real deployed verifier. Bump eip712DomainVersion to invalidate
  // every previously-signed message at once if this placeholder is ever
  // replaced with a real contract address.
  eip712VerifyingContract:
    process.env.EIP712_VERIFYING_CONTRACT || "0x2F5a6FE666262c8361C74428451BE5A9914c7225",
  eip712DomainVersion: process.env.EIP712_DOMAIN_VERSION || "1",
};
