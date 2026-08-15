// ╔══════════════════════════════════════╗
// ║         JIQX XMD — MAIN             ║
// ║       By Lord Benimaru 👑            ║
// ╚══════════════════════════════════════╝

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
  isJidStatusBroadcast,
} from "@whiskeysockets/baileys";
import pino from "pino";
import { Boom } from "@hapi/boom";
import fs from "fs";
import readline from "readline";
import chalk from "chalk";
import config from "./config.js";
import { handleMessage } from "./handler.js";
import { handleGroupEvent } from "./commands/group.js";
import { handleAutoMod } from "./commands/moderation.js";

const logger = pino({ level: "silent" });

if (!fs.existsSync(config.SESSION_DIR))
  fs.mkdirSync(config.SESSION_DIR, { recursive: true });

const ask = (q) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question(q, a => { rl.close(); res(a); }));
};

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState(config.SESSION_DIR);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ["JIQX XMD", "Chrome", "1.0.0"],
    getMessage: async () => ({ conversation: "" }),
    generateHighQualityLinkPreview: true,
  });

  // ── Pairing code ──
  if (!sock.authState.creds.registered) {
    let num = config.NUMERO;
    if (!num || num === "22870421276") {
      num = await ask(chalk.cyan("\n📱 Numéro WhatsApp (ex: 22891000000) : "));
    }
    num = num.replace(/\D/g, "");
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(num);
        const formatted = code.match(/.{1,4}/g)?.join("-") || code;
        console.log(chalk.green("\n╔══════════════════════════════════╗"));
        console.log(chalk.green("║      🔑 CODE DE PAIRING           ║"));
        console.log(chalk.yellow(`║          ${formatted}           ║`));
        console.log(chalk.green("╚══════════════════════════════════╝"));
        console.log(chalk.cyan("👉 WA → Appareils connectés → Associer → Code\n"));
      } catch (e) {
        console.error(chalk.red("❌ Erreur pairing:"), e.message);
      }
    }, 3000);
  }

  // ── Connexion ──
  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "close") {
      const code = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const reason = DisconnectReason;

      if (code === reason.badSession) {
        console.log(chalk.red("❌ Session corrompue. Supprime session/ et relance."));
        process.exit(1);
      } else if (code === reason.loggedOut) {
        console.log(chalk.red("❌ Déconnecté. Supprime session/ et relance."));
        fs.rmSync(config.SESSION_DIR, { recursive: true, force: true });
        process.exit(1);
      } else {
        console.log(chalk.yellow("🔄 Reconnexion en cours..."));
        setTimeout(() => startBot(), 3000);
      }
    }

    if (connection === "open") {
      const botNum = sock.user?.id?.split(":")[0];
      console.log(chalk.green(`\n✅ ${config.NOM_BOT} connecté ! [${botNum}]`));
      console.log(chalk.cyan(`👑 Owner : ${config.OWNER_NAME}\n`));
    }
  });

  sock.ev.on("creds.update", saveCreds);

  // ── Messages entrants ──
  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (!msg.message) continue;
      if (isJidBroadcast(msg.key.remoteJid)) continue;
      if (isJidStatusBroadcast(msg.key.remoteJid)) continue;

      try {
        // Auto-modération (antilink, antispam, etc.) — avant les commandes
        const blocked = await handleAutoMod(sock, msg);
        if (blocked) continue;

        // Commandes
        await handleMessage(sock, msg);
      } catch (e) {
        console.error(chalk.red("❌ Erreur:"), e.message);
      }
    }
  });

  // ── Événements groupe ──
  sock.ev.on("group-participants.update", async (event) => {
    try { await handleGroupEvent(sock, event); }
    catch (e) { console.error(chalk.red("❌ GroupEvent:"), e.message); }
  });

  return sock;
}

// ── Lancement ──
console.log(chalk.magenta(`
╔══════════════════════════════════════╗
║          🤖  JIQX  XMD              ║
║        By Lord Benimaru 👑           ║
║     Baileys MD — Pairing Code        ║
╚══════════════════════════════════════╝
`));

startBot();
