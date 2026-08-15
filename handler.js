// ╔══════════════════════════════════════╗
// ║       JIQX XMD — HANDLER            ║
// ╚══════════════════════════════════════╝

import config from "./config.js";
import { Bans, MutedUsers, Stats } from "./database.js";
import { groupCmd } from "./commands/group.js";
import { moderationCmd } from "./commands/moderation.js";
import { userCmd } from "./commands/user.js";
import { funCmd } from "./commands/fun.js";
import { ownerCmd } from "./commands/owner.js";
import { iaCmd } from "./commands/ia.js";

// ── Extraire le texte du message ──
function extractBody(msg) {
  const m = msg.message;
  if (!m) return "";
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.documentMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    ""
  );
}

export async function handleMessage(sock, msg) {
  const jid        = msg.key.remoteJid;
  const isGroup    = jid.endsWith("@g.us");
  const senderJid  = isGroup ? msg.key.participant : msg.key.remoteJid;
  const senderNum  = senderJid?.replace(/\D/g, "") || "";
  const body       = extractBody(msg);
  const ownerNum   = config.OWNER_NUMBER.replace(/\D/g, "");
  const isOwner    = senderNum === ownerNum;

  // ── Ignorer si bannit ──
  if (Bans.isBanned(senderJid) && !isOwner) {
    return sock.sendMessage(jid, {
      text: "🚫 Tu es banni du bot.",
    }, { quoted: msg });
  }

  // ── Ignorer si muté temporairement ──
  if (isGroup && MutedUsers.isMuted(jid, senderJid) && !isOwner) return;

  // ── Vérifier le préfixe ──
  if (!body.startsWith(config.PREFIX)) return;

  const args = body.slice(config.PREFIX.length).trim().split(/ +/);
  const cmd  = args.shift().toLowerCase();

  // ── Récupérer les infos groupe ──
  let isAdmin = false, isBotAdmin = false, groupMeta = null;
  if (isGroup) {
    try {
      groupMeta = await sock.groupMetadata(jid);
      const admins = groupMeta.participants.filter(p => p.admin).map(p => p.id);
      isAdmin    = admins.includes(senderJid);
      const botId = sock.user.id.replace(/:.*@/, "@");
      isBotAdmin = admins.includes(botId);
    } catch {}
  }

  // ── Contexte partagé entre toutes les commandes ──
  const ctx = {
    sock, msg, jid, args, cmd,
    senderJid, senderNum,
    isGroup, isOwner, isAdmin, isBotAdmin,
    groupMeta, body,
    PREFIX: config.PREFIX,
    NOM_BOT: config.NOM_BOT,
    OWNER_NAME: config.OWNER_NAME,
    OWNER_NUMBER: config.OWNER_NUMBER,
  };

  Stats.inc("totalCommands");

  // ══════════════════════════════════════
  //  ROUTAGE DES COMMANDES
  // ══════════════════════════════════════

  // ─ MENU ─
  if (["menu", "help", "aide", "start"].includes(cmd)) {
    return funCmd(ctx, "menu");
  }

  // ─ IA ─
  if (["ia", "ai", "gpt", "gemini"].includes(cmd)) {
    return iaCmd(ctx);
  }

  // ─ STICKER / MEDIA ─
  if (["sticker", "s", "stk"].includes(cmd))  return funCmd(ctx, "sticker");
  if (["toimg", "toimage"].includes(cmd))      return funCmd(ctx, "toimg");
  if (["quote", "citation"].includes(cmd))     return funCmd(ctx, "quote");
  if (["calc", "calcul"].includes(cmd))        return funCmd(ctx, "calc");
  if (["translate", "tr"].includes(cmd))       return funCmd(ctx, "translate");
  if (["weather", "meteo"].includes(cmd))      return funCmd(ctx, "weather");

  // ─ GROUPE ─
  if (["kick", "remove", "virer"].includes(cmd))        return groupCmd(ctx, "kick");
  if (["add", "ajouter"].includes(cmd))                 return groupCmd(ctx, "add");
  if (["promote", "admin"].includes(cmd))               return groupCmd(ctx, "promote");
  if (["demote", "deadmin"].includes(cmd))              return groupCmd(ctx, "demote");
  if (["tagall", "everyone", "all"].includes(cmd))      return groupCmd(ctx, "tagall");
  if (["hidetag", "ht"].includes(cmd))                  return groupCmd(ctx, "hidetag");
  if (["mute"].includes(cmd))                           return groupCmd(ctx, "mute");
  if (["unmute"].includes(cmd))                         return groupCmd(ctx, "unmute");
  if (["groupinfo", "ginfo", "info"].includes(cmd))     return groupCmd(ctx, "info");
  if (["listadmin", "admins"].includes(cmd))            return groupCmd(ctx, "listadmin");
  if (["setname", "rename"].includes(cmd))              return groupCmd(ctx, "setname");
  if (["setdesc", "desc"].includes(cmd))                return groupCmd(ctx, "setdesc");
  if (["setpp", "setphoto"].includes(cmd))              return groupCmd(ctx, "setpp");
  if (["revoke", "resetlink"].includes(cmd))            return groupCmd(ctx, "revoke");
  if (["join"].includes(cmd))                           return groupCmd(ctx, "join");
  if (["rules", "regles"].includes(cmd))                return groupCmd(ctx, "rules");
  if (["setrules"].includes(cmd))                       return groupCmd(ctx, "setrules");
  if (["setwelcome"].includes(cmd))                     return groupCmd(ctx, "setwelcome");
  if (["setgoodbye"].includes(cmd))                     return groupCmd(ctx, "setgoodbye");
  if (["promoteall"].includes(cmd))                     return groupCmd(ctx, "promoteall");
  if (["demoteall"].includes(cmd))                      return groupCmd(ctx, "demoteall");
  if (["poll", "sondage"].includes(cmd))                return groupCmd(ctx, "poll");

  // ─ MODÉRATION ─
  if (["warn"].includes(cmd))               return moderationCmd(ctx, "warn");
  if (["unwarn"].includes(cmd))             return moderationCmd(ctx, "unwarn");
  if (["warnings"].includes(cmd))           return moderationCmd(ctx, "warnings");
  if (["setpunish"].includes(cmd))          return moderationCmd(ctx, "setpunish");
  if (["muteuser"].includes(cmd))           return moderationCmd(ctx, "muteuser");
  if (["unmuteuser"].includes(cmd))         return moderationCmd(ctx, "unmuteuser");
  if (["antilink"].includes(cmd))           return moderationCmd(ctx, "antilink");
  if (["antiwa"].includes(cmd))             return moderationCmd(ctx, "antiwa");
  if (["antispam"].includes(cmd))           return moderationCmd(ctx, "antispam");
  if (["antibot"].includes(cmd))            return moderationCmd(ctx, "antibot");
  if (["antipub"].includes(cmd))            return moderationCmd(ctx, "antipub");
  if (["antivoice"].includes(cmd))          return moderationCmd(ctx, "antivoice");
  if (["antisticker"].includes(cmd))        return moderationCmd(ctx, "antisticker");
  if (["antimedia"].includes(cmd))          return moderationCmd(ctx, "antimedia");
  if (["antiedit"].includes(cmd))           return moderationCmd(ctx, "antiedit");
  if (["antidelete"].includes(cmd))         return moderationCmd(ctx, "antidelete");
  if (["antitagadmin"].includes(cmd))       return moderationCmd(ctx, "antitagadmin");
  if (["antifake"].includes(cmd))           return moderationCmd(ctx, "antifake");
  if (["antinsfw"].includes(cmd))           return moderationCmd(ctx, "antinsfw");
  if (["salon"].includes(cmd))              return moderationCmd(ctx, "salon");
  if (["addword"].includes(cmd))            return moderationCmd(ctx, "addword");
  if (["delword"].includes(cmd))            return moderationCmd(ctx, "delword");
  if (["listwords"].includes(cmd))          return moderationCmd(ctx, "listwords");

  // ─ UTILISATEUR ─
  if (["profile", "profil"].includes(cmd))              return userCmd(ctx, "profile");
  if (["pp"].includes(cmd))                             return userCmd(ctx, "pp");
  if (["jid"].includes(cmd))                            return userCmd(ctx, "jid");
  if (["block", "bloquer"].includes(cmd))               return userCmd(ctx, "block");
  if (["unblock", "debloquer"].includes(cmd))           return userCmd(ctx, "unblock");
  if (["owner"].includes(cmd))                          return userCmd(ctx, "owner");
  if (["getstatus"].includes(cmd))                      return userCmd(ctx, "getstatus");

  // ─ OWNER ONLY ─
  if (["broadcast", "bc"].includes(cmd))        return ownerCmd(ctx, "broadcast");
  if (["addvip"].includes(cmd))                 return ownerCmd(ctx, "addvip");
  if (["delvip"].includes(cmd))                 return ownerCmd(ctx, "delvip");
  if (["checkvip"].includes(cmd))               return ownerCmd(ctx, "checkvip");
  if (["ban"].includes(cmd))                    return ownerCmd(ctx, "ban");
  if (["unban"].includes(cmd))                  return ownerCmd(ctx, "unban");
  if (["banlist"].includes(cmd))                return ownerCmd(ctx, "banlist");
  if (["restart"].includes(cmd))                return ownerCmd(ctx, "restart");
  if (["shutdown"].includes(cmd))               return ownerCmd(ctx, "shutdown");
  if (["stats"].includes(cmd))                  return ownerCmd(ctx, "stats");
  if (["setnamebot"].includes(cmd))             return ownerCmd(ctx, "setnamebot");
  if (["setbio"].includes(cmd))                 return ownerCmd(ctx, "setbio");
  if (["setppbot"].includes(cmd))               return ownerCmd(ctx, "setppbot");

  // ─ COMMANDE INCONNUE ─
  await sock.sendMessage(jid, {
    text: `❓ Commande *${config.PREFIX}${cmd}* inconnue.\nTape *${config.PREFIX}menu* pour la liste.`,
  }, { quoted: msg });
}
