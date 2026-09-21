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
  vaultMasterMnemonic: process.env.VAULT_MASTER_MNEMONIC || "test test test test test test test test test test test junk",
  encryptionKey: process.env.ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
  protocolFeeWallet: process.env.PROTOCOL_FEE_WALLET || "0xAa780beBe4Aa01AA435E538f8A810C202850b727",
  
  // Relayer & Operator Wallets
  relayerPrivateKey: process.env.RELAYER_PRIVATE_KEY || process.env.OPERATOR_PRIVATE_KEY || "",
  operatorPrivateKey: process.env.OPERATOR_PRIVATE_KEY || "",

  // Telegram Bot
  telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || "",
  telegramBotUsername: (process.env.TELEGRAM_BOT_USERNAME || "@HeirloomRHBot").replace(/^@/, ""),

  // Frontend Origin for CORS
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
};
