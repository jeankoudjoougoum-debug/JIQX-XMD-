// ╔══════════════════════════════════════╗
// ║    JIQX XMD — MODÉRATION AUTO       ║
// ╚══════════════════════════════════════╝

import { GroupSettings, Warns, SpamTracker, MutedUsers } from "../database.js";
import config from "../config.js";

// ── Regex liens ──
const LINK_REGEX = /https?:\/\/[^\s]+|www\.[^\s]+|chat\.whatsapp\.com\/[^\s]+/gi;
const WA_LINK_REGEX = /chat\.whatsapp\.com\/[^\s]+/gi;
const PUB_REGEX = /(venez|achetez?|promo|promotion|prix|offre|bon\s?plan|réduction|solde)/gi;

// ── Appliquer une punition selon les warns ──
async function applyPunishment(sock, groupJid, userJid, warnCount, settings) {
  const max     = settings.maxWarns || config.MAX_WARNS;
  const punish  = settings.punish   || config.PUNISH_ACTION;

  if (warnCount < max) return;

  const num = userJid.split("@")[0];

  if (punish === "kick") {
    await sock.groupParticipantsUpdate(groupJid, [userJid], "remove");
    await sock.sendMessage(groupJid, {
      text: `🚨 *@${num}* a atteint ${max} avertissements et a été *expulsé* automatiquement.`,
      mentions: [userJid],
    });
    Warns.reset(groupJid, userJid);
  } else if (punish === "mute") {
    const until = Date.now() + 10 * 60 * 1000; // 10 min
    MutedUsers.mute(groupJid, userJid, until);
    await sock.sendMessage(groupJid, {
      text: `🔇 *@${num}* a atteint ${max} avertissements et est *muté* 10 min.`,
      mentions: [userJid],
    });
  } else if (punish === "ban") {
    const { Bans } = await import("../database.js");
    Bans.ban(userJid, "Max warns atteints");
    await sock.sendMessage(groupJid, {
      text: `🚫 *@${num}* a atteint ${max} avertissements et est *banni du bot*.`,
      mentions: [userJid],
    });
  }
}

// ════════════════════════════════════════
//  AUTO-MODÉRATION (appelée sur chaque message)
// ════════════════════════════════════════
export async function handleAutoMod(sock, msg) {
  const jid = msg.key.remoteJid;
  if (!jid.endsWith("@g.us")) return false; // seulement dans les groupes

  const senderJid = msg.key.participant;
  if (!senderJid) return false;

  const settings = GroupSettings.get(jid);
  const body = (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.imageMessage?.caption ||
    ""
  ).toLowerCase();

  const msgType = Object.keys(msg.message || {})[0];

  // ── Vérifier si le sender est admin (pour ne pas le sanctionner) ──
  let senderIsAdmin = false;
  try {
    const meta = await sock.groupMetadata(jid);
    const admins = meta.participants.filter(p => p.admin).map(p => p.id);
    senderIsAdmin = admins.includes(senderJid);
  } catch {}

  if (senderIsAdmin) return false; // Ne pas toucher les admins

  // ── ANTI-SPAM ──
  if (settings.antispam) {
    const isSpam = SpamTracker.track(jid, senderJid, config.SPAM_COUNT, config.SPAM_TIME);
    if (isSpam) {
      await sock.sendMessage(jid, { delete: msg.key });
      const count = Warns.add(jid, senderJid, "Spam détecté");
      await sock.sendMessage(jid, {
        text: `⚠️ *@${senderJid.split("@")[0]}* — Anti-spam ! Warn *${count}/${settings.maxWarns || config.MAX_WARNS}*`,
        mentions: [senderJid],
      });
      await applyPunishment(sock, jid, senderJid, count, settings);
      SpamTracker.reset(jid, senderJid);
      return true;
    }
  }

  // ── ANTI-LIEN ──
  if (settings.antilink && LINK_REGEX.test(body)) {
    await sock.sendMessage(jid, { delete: msg.key });
    const count = Warns.add(jid, senderJid, "Lien externe");
    await sock.sendMessage(jid, {
      text: `🔗 *@${senderJid.split("@")[0]}* — Les liens sont interdits ici ! Warn *${count}/${settings.maxWarns || config.MAX_WARNS}*`,
      mentions: [senderJid],
    });
    await applyPunishment(sock, jid, senderJid, count, settings);
    return true;
  }

  // ── ANTI-LIEN WA ──
  if (settings.antiwa && WA_LINK_REGEX.test(body)) {
    await sock.sendMessage(jid, { delete: msg.key });
    const count = Warns.add(jid, senderJid, "Lien WhatsApp");
    await sock.sendMessage(jid, {
      text: `🚫 *@${senderJid.split("@")[0]}* — Les liens de groupe WA sont interdits ! Warn *${count}*`,
      mentions: [senderJid],
    });
    await applyPunishment(sock, jid, senderJid, count, settings);
    return true;
  }

  // ── ANTI-PUB ──
  if (settings.antipub && (PUB_REGEX.test(body) && LINK_REGEX.test(body))) {
    await sock.sendMessage(jid, { delete: msg.key });
    const count = Warns.add(jid, senderJid, "Publicité détectée");
    await sock.sendMessage(jid, {
      text: `📢 *@${senderJid.split("@")[0]}* — La pub est interdite ! Warn *${count}*`,
      mentions: [senderJid],
    });
    await applyPunishment(sock, jid, senderJid, count, settings);
    return true;
  }

  // ── ANTI-VOCAL ──
  if (settings.antivoice && (msgType === "audioMessage" || msgType === "pttMessage")) {
    await sock.sendMessage(jid, { delete: msg.key });
    await sock.sendMessage(jid, {
      text: `🎙️ *@${senderJid.split("@")[0]}* — Les vocaux sont interdits dans ce groupe.`,
      mentions: [senderJid],
    });
    return true;
  }

  // ── ANTI-STICKER ──
  if (settings.antisticker && msgType === "stickerMessage") {
    await sock.sendMessage(jid, { delete: msg.key });
    return true;
  }

  // ── ANTI-MEDIA ──
  if (settings.antimedia && ["imageMessage", "videoMessage", "documentMessage"].includes(msgType)) {
    await sock.sendMessage(jid, { delete: msg.key });
    await sock.sendMessage(jid, {
      text: `🖼️ *@${senderJid.split("@")[0]}* — Les médias sont interdits ici. Texte uniquement.`,
      mentions: [senderJid],
    });
    return true;
  }

  // ── MOT BLACKLISTÉ ──
  if (settings.blacklist?.length) {
    const found = settings.blacklist.find(w => body.includes(w.toLowerCase()));
    if (found) {
      await sock.sendMessage(jid, { delete: msg.key });
      const count = Warns.add(jid, senderJid, `Mot interdit: ${found}`);
      await sock.sendMessage(jid, {
        text: `🤐 *@${senderJid.split("@")[0]}* — Mot interdit détecté ! Warn *${count}*`,
        mentions: [senderJid],
      });
      await applyPunishment(sock, jid, senderJid, count, settings);
      return true;
    }
  }

  // ── ANTI-FAKE (numéro pays non autorisé) ──
  if (settings.antifake && settings.allowedCountries?.length) {
    const num = senderJid.split("@")[0];
    const allowed = settings.allowedCountries.some(code => num.startsWith(String(code)));
    if (!allowed) {
      await sock.groupParticipantsUpdate(jid, [senderJid], "remove");
      return true;
    }
  }

  // ── ANTI-TAG ADMIN ──
  if (settings.antitagadmin) {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
    try {
      const meta = await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin).map(p => p.id);
      const taggedAdmin = mentioned.some(m => admins.includes(m));
      if (taggedAdmin && !senderIsAdmin) {
        await sock.sendMessage(jid, { delete: msg.key });
        await sock.sendMessage(jid, {
          text: `❌ *@${senderJid.split("@")[0]}* — Tu ne peux pas mentionner les admins ici.`,
          mentions: [senderJid],
        });
        return true;
      }
    } catch {}
  }

  return false; // Aucune modération appliquée
}

// ════════════════════════════════════════
//  COMMANDES DE MODÉRATION
// ════════════════════════════════════════
export async function moderationCmd(ctx, action) {
  const { sock, msg, jid, args, isGroup, isAdmin, isOwner, isBotAdmin, PREFIX } = ctx;

  const requireGroup = async () => {
    if (!isGroup) { await sock.sendMessage(jid, { text: "❌ Groupe uniquement." }, { quoted: msg }); return false; }
    return true;
  };
  const requireAdmin = async () => {
    if (!isAdmin && !isOwner) { await sock.sendMessage(jid, { text: "❌ Réservé aux admins." }, { quoted: msg }); return false; }
    return true;
  };

  // ── Helper toggle ──
  const toggle = async (key, label) => {
    if (!await requireGroup()) return;
    if (!await requireAdmin()) return;
    const val = args[0]?.toLowerCase();
    if (!["on", "off"].includes(val)) {
      return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}${action} on/off*` }, { quoted: msg });
    }
    const enabled = val === "on";
    GroupSettings.set(jid, key, enabled);
    await sock.sendMessage(jid, { text: `${enabled ? "✅" : "❌"} *${label}* ${enabled ? "activé" : "désactivé"}.` });
  };

  switch (action) {

    case "antilink":     return toggle("antilink",     "Anti-lien");
    case "antiwa":       return toggle("antiwa",       "Anti-lien WhatsApp");
    case "antispam":     return toggle("antispam",     "Anti-spam");
    case "antibot":      return toggle("antibot",      "Anti-bot");
    case "antipub":      return toggle("antipub",      "Anti-pub");
    case "antivoice":    return toggle("antivoice",    "Anti-vocal");
    case "antisticker":  return toggle("antisticker",  "Anti-sticker");
    case "antimedia":    return toggle("antimedia",    "Anti-média");
    case "antiedit":     return toggle("antiedit",     "Anti-edit");
    case "antidelete":   return toggle("antidelete",   "Anti-suppression");
    case "antitagadmin": return toggle("antitagadmin", "Anti-tag admin");
    case "antifake":     return toggle("antifake",     "Anti-fake");
    case "antinsfw":     return toggle("antinsfw",     "Anti-NSFW");
    case "salon":        return toggle("salon",        "Mode salon");

    // ── WARN ──
    case "warn": {
      if (!await requireGroup()) return;
      if (!await requireAdmin()) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}warn @user raison*` }, { quoted: msg });
      const reason = args.slice(1).join(" ") || "Comportement inapproprié";
      const settings = GroupSettings.get(jid);
      const count = Warns.add(jid, target, reason);
      const max = settings.maxWarns || config.MAX_WARNS;
      await sock.sendMessage(jid, {
        text: `⚠️ *@${target.split("@")[0]}* — Warn *${count}/${max}*\n📝 Raison : ${reason}`,
        mentions: [target],
      });
      await applyPunishment(sock, jid, target, count, settings);
      break;
    }

    // ── UNWARN ──
    case "unwarn": {
      if (!await requireGroup()) return;
      if (!await requireAdmin()) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}unwarn @user*` }, { quoted: msg });
      const count = Warns.remove(jid, target);
      const max = (GroupSettings.get(jid).maxWarns) || config.MAX_WARNS;
      await sock.sendMessage(jid, {
        text: `✅ 1 warn retiré pour *@${target.split("@")[0]}*. Total : *${count}/${max}*`,
        mentions: [target],
      });
      break;
    }

    // ── WARNINGS ──
    case "warnings": {
      if (!await requireGroup()) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}warnings @user*` }, { quoted: msg });
      const data = Warns.get(jid, target);
      const max = (GroupSettings.get(jid).maxWarns) || config.MAX_WARNS;
      const reasons = data.reasons.length ? data.reasons.map((r,i) => `${i+1}. ${r}`).join("\n") : "Aucune";
      await sock.sendMessage(jid, {
        text: `📋 *Avertissements de @${target.split("@")[0]}*\n\n🔢 Total : *${data.count}/${max}*\n📝 Raisons :\n${reasons}`,
        mentions: [target],
      });
      break;
    }

    // ── SETPUNISH ──
    case "setpunish": {
      if (!await requireGroup()) return;
      if (!await requireAdmin()) return;
      const maxW = parseInt(args[0]);
      const action2 = args[1]?.toLowerCase();
      if (!maxW || !["warn", "mute", "kick", "ban"].includes(action2)) {
        return sock.sendMessage(jid, {
          text: `❌ Usage : *${PREFIX}setpunish [nombre] [action]*\nEx : *${PREFIX}setpunish 3 kick*\nOptions : warn, mute, kick, ban`,
        }, { quoted: msg });
      }
      GroupSettings.update(jid, { maxWarns: maxW, punish: action2 });
      await sock.sendMessage(jid, {
        text: `✅ Punition configurée :\n⚠️ Max warns : *${maxW}*\n🔨 Action : *${action2}*`,
      });
      break;
    }

    // ── MUTE USER ──
    case "muteuser": {
      if (!await requireGroup()) return;
      if (!await requireAdmin()) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}muteuser @user 10m*` }, { quoted: msg });
      const timeStr = args[args.length - 1] || "10m";
      const ms = parseDuration(timeStr);
      const until = Date.now() + ms;
      MutedUsers.mute(jid, target, until);
      await sock.sendMessage(jid, {
        text: `🔇 *@${target.split("@")[0]}* muté pendant *${timeStr}*.`,
        mentions: [target],
      });
      break;
    }

    // ── UNMUTE USER ──
    case "unmuteuser": {
      if (!await requireGroup()) return;
      if (!await requireAdmin()) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}unmuteuser @user*` }, { quoted: msg });
      MutedUsers.unmute(jid, target);
      await sock.sendMessage(jid, {
        text: `🔊 *@${target.split("@")[0]}* n'est plus muté.`,
        mentions: [target],
      });
      break;
    }

    // ── ADDWORD ──
    case "addword": {
      if (!await requireGroup()) return;
      if (!await requireAdmin()) return;
      const word = args.join(" ").toLowerCase();
      if (!word) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}addword motinterdit*` }, { quoted: msg });
      const settings = GroupSettings.get(jid);
      const list = settings.blacklist || [];
      if (!list.includes(word)) {
        list.push(word);
        GroupSettings.set(jid, "blacklist", list);
      }
      await sock.sendMessage(jid, { text: `✅ Mot *"${word}"* ajouté à la blacklist.` });
      break;
    }

    // ── DELWORD ──
    case "delword": {
      if (!await requireGroup()) return;
      if (!await requireAdmin()) return;
      const word = args.join(" ").toLowerCase();
      const settings = GroupSettings.get(jid);
      const list = (settings.blacklist || []).filter(w => w !== word);
      GroupSettings.set(jid, "blacklist", list);
      await sock.sendMessage(jid, { text: `✅ Mot *"${word}"* retiré de la blacklist.` });
      break;
    }

    // ── LISTWORDS ──
    case "listwords": {
      if (!await requireGroup()) return;
      const settings = GroupSettings.get(jid);
      const list = settings.blacklist || [];
      if (!list.length) return sock.sendMessage(jid, { text: "📋 Aucun mot dans la blacklist." });
      await sock.sendMessage(jid, { text: `📋 *Blacklist (${list.length}) :*\n\n${list.map((w,i) => `${i+1}. ${w}`).join("\n")}` });
      break;
    }
  }
}

// ── Helper : extraire la cible ──
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

// ── Helper : convertir durée "10m" → ms ──
function parseDuration(str) {
  const num  = parseInt(str);
  const unit = str.replace(/\d/g, "").toLowerCase();
  if (unit === "s") return num * 1000;
  if (unit === "h") return num * 3600 * 1000;
  if (unit === "d") return num * 86400 * 1000;
  return num * 60 * 1000; // défaut : minutes
}
