// ╔══════════════════════════════════════╗
// ║     JIQX XMD — OWNER COMMANDS       ║
// ╚══════════════════════════════════════╝

import { Bans, Vip, Stats } from "../database.js";
import config from "../config.js";

// ── Guard owner ──
async function requireOwner(ctx) {
  if (!ctx.isOwner) {
    await ctx.sock.sendMessage(ctx.jid, { text: "❌ Commande réservée au *owner* du bot." }, { quoted: ctx.msg });
    return false;
  }
  return true;
}

export async function ownerCmd(ctx, action) {
  const { sock, msg, jid, args, senderJid, PREFIX, NOM_BOT, OWNER_NAME } = ctx;

  switch (action) {

    // ── BAN ──
    case "ban": {
      if (!await requireOwner(ctx)) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}ban @user raison*` }, { quoted: msg });
      const reason = args.slice(1).join(" ") || "Banni par l'owner";
      Bans.ban(target, reason);
      await sock.sendMessage(jid, {
        text: `🚫 *@${target.split("@")[0]}* est maintenant *banni* du bot.\n📝 Raison : ${reason}`,
        mentions: [target],
      });
      break;
    }

    // ── UNBAN ──
    case "unban": {
      if (!await requireOwner(ctx)) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}unban @user*` }, { quoted: msg });
      Bans.unban(target);
      await sock.sendMessage(jid, {
        text: `✅ *@${target.split("@")[0]}* est *débanni* du bot.`,
        mentions: [target],
      });
      break;
    }

    // ── BANLIST ──
    case "banlist": {
      if (!await requireOwner(ctx)) return;
      const list = Bans.list();
      const keys = Object.keys(list);
      if (!keys.length) return sock.sendMessage(jid, { text: "📋 Aucun utilisateur banni." });
      const text = keys.map((k, i) => `${i+1}. +${k.split("@")[0]}\n   📝 ${list[k].reason}`).join("\n\n");
      await sock.sendMessage(jid, { text: `🚫 *Liste des bannis (${keys.length}) :*\n\n${text}` });
      break;
    }

    // ── ADDVIP ──
    case "addvip": {
      if (!await requireOwner(ctx)) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}addvip @user*` }, { quoted: msg });
      Vip.add(target);
      await sock.sendMessage(jid, {
        text: `💎 *@${target.split("@")[0]}* est maintenant *VIP* !`,
        mentions: [target],
      });
      break;
    }

    // ── DELVIP ──
    case "delvip": {
      if (!await requireOwner(ctx)) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}delvip @user*` }, { quoted: msg });
      Vip.remove(target);
      await sock.sendMessage(jid, {
        text: `❌ *@${target.split("@")[0]}* n'est plus VIP.`,
        mentions: [target],
      });
      break;
    }

    // ── CHECKVIP ──
    case "checkvip": {
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}checkvip @user*` }, { quoted: msg });
      const isVip = Vip.isVip(target);
      await sock.sendMessage(jid, {
        text: `${isVip ? "💎 *VIP*" : "👤 *Standard*"}\n\n*@${target.split("@")[0]}* ${isVip ? "a un abonnement VIP actif." : "n'est pas VIP."}`,
        mentions: [target],
      });
      break;
    }

    // ── BROADCAST ──
    case "broadcast": {
      if (!await requireOwner(ctx)) return;
      const text = args.join(" ");
      if (!text) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}broadcast Votre message ici*` }, { quoted: msg });
      await sock.sendMessage(jid, { text: "📡 Broadcast en cours..." });

      try {
        // Récupérer tous les chats
        const chats = sock.store?.chats?.all ? sock.store.chats.all() : [];
        let sent = 0;
        for (const chat of chats) {
          if (chat.id && !chat.id.endsWith("@broadcast")) {
            try {
              await sock.sendMessage(chat.id, {
                text: `📢 *BROADCAST — ${NOM_BOT}*\n\n${text}\n\n— ${OWNER_NAME}`,
              });
              sent++;
              await new Promise(r => setTimeout(r, 500)); // délai anti-ban
            } catch {}
          }
        }
        await sock.sendMessage(jid, { text: `✅ Broadcast envoyé à *${sent}* chats.` });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Erreur broadcast : ${e.message}` });
      }
      break;
    }

    // ── STATS ──
    case "stats": {
      if (!await requireOwner(ctx)) return;
      const data = Stats.get();
      const uptime = process.uptime();
      const h = Math.floor(uptime / 3600);
      const m = Math.floor((uptime % 3600) / 60);
      const s = Math.floor(uptime % 60);

      await sock.sendMessage(jid, {
        text: `╔══════════════════════════╗\n║    📊 *STATS DU BOT*     ║\n╚══════════════════════════╝\n\n🤖 *Bot :* ${NOM_BOT}\n⏱️ *Uptime :* ${h}h ${m}m ${s}s\n📨 *Total commandes :* ${data.totalCommands || 0}\n\n✅ Bot actif et opérationnel.`,
      }, { quoted: msg });
      break;
    }

    // ── RESTART ──
    case "restart": {
      if (!await requireOwner(ctx)) return;
      await sock.sendMessage(jid, { text: "🔄 Redémarrage du bot..." }, { quoted: msg });
      setTimeout(() => process.exit(0), 1500);
      break;
    }

    // ── SHUTDOWN ──
    case "shutdown": {
      if (!await requireOwner(ctx)) return;
      await sock.sendMessage(jid, { text: "⛔ Arrêt du bot. À bientôt !" }, { quoted: msg });
      setTimeout(() => process.exit(1), 1500);
      break;
    }

    // ── SETNAMEBOT ──
    case "setnamebot": {
      if (!await requireOwner(ctx)) return;
      const name = args.join(" ");
      if (!name) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}setnamebot NouveauNom*` }, { quoted: msg });
      await sock.updateProfileName(name);
      await sock.sendMessage(jid, { text: `✅ Nom du bot changé en *${name}*` }, { quoted: msg });
      break;
    }

    // ── SETBIO ──
    case "setbio": {
      if (!await requireOwner(ctx)) return;
      const bio = args.join(" ");
      if (!bio) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}setbio Nouvelle bio ici*` }, { quoted: msg });
      await sock.updateProfileStatus(bio);
      await sock.sendMessage(jid, { text: `✅ Bio mise à jour : _${bio}_` }, { quoted: msg });
      break;
    }

    // ── SETPPBOT ──
    case "setppbot": {
      if (!await requireOwner(ctx)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgMsg = msg.message?.imageMessage || quoted?.imageMessage;
      if (!imgMsg) return sock.sendMessage(jid, { text: `❌ Envoie une image avec *${PREFIX}setppbot*` }, { quoted: msg });
      const buffer = await sock.downloadMediaMessage({ message: { imageMessage: imgMsg } });
      await sock.updateProfilePicture(sock.user.id, buffer);
      await sock.sendMessage(jid, { text: "✅ Photo du bot mise à jour !" }, { quoted: msg });
      break;
    }
  }
}

// ── Helper : obtenir la cible ──
function getTarget(ctx) {
  const { msg, args } = ctx;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
  if (mentioned?.length) return mentioned[0];
  const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
  if (quoted) return quoted;
  if (args[0]) {
    const num = args[0].replace(/\D/g, "");
    if (num) return `${num}@s.whatsapp.net`;
  }
  return null;
}
