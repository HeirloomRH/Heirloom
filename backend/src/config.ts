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

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: (process.env.TELEGRAM_BOT_USERNAME || "@HeirloomRHBot").replace(/^@/, ""),

  // Frontend Origin for CORS
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
