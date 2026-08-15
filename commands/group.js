// ╔══════════════════════════════════════╗
// ║      JIQX XMD — GROUP COMMANDS      ║
// ╚══════════════════════════════════════╝

import { GroupSettings } from "../database.js";

// ── Helper : vérifier admin ──
async function checkAdmin(ctx, needBotAdmin = true) {
  const { sock, msg, jid, isGroup, isAdmin, isOwner, isBotAdmin, PREFIX, cmd } = ctx;
  if (!isGroup) {
    await sock.sendMessage(jid, { text: "❌ Commande groupe uniquement." }, { quoted: msg });
    return false;
  }
  if (!isAdmin && !isOwner) {
    await sock.sendMessage(jid, { text: "❌ Réservé aux *admins* du groupe." }, { quoted: msg });
    return false;
  }
  if (needBotAdmin && !isBotAdmin) {
    await sock.sendMessage(jid, { text: "❌ Le bot doit être *admin* du groupe." }, { quoted: msg });
    return false;
  }
  return true;
}

// ── Helper : obtenir la cible mentionnée ou en reply ──
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

// ════════════════════════════════════════
//  COMMANDES GROUPE
// ════════════════════════════════════════
export async function groupCmd(ctx, action) {
  const { sock, msg, jid, args, isGroup, isOwner, isBotAdmin, PREFIX, groupMeta } = ctx;

  switch (action) {

    // ── KICK ──
    case "kick": {
      if (!await checkAdmin(ctx)) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}kick @user*` }, { quoted: msg });
      const num = target.split("@")[0];
      await sock.groupParticipantsUpdate(jid, [target], "remove");
      await sock.sendMessage(jid, { text: `✅ *@${num}* a été expulsé. 👢`, mentions: [target] });
      break;
    }

    // ── ADD ──
    case "add": {
      if (!await checkAdmin(ctx)) return;
      const num = args[0]?.replace(/\D/g, "");
      if (!num) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}add 22891000000*` }, { quoted: msg });
      const targetJid = `${num}@s.whatsapp.net`;
      const [res] = await sock.groupParticipantsUpdate(jid, [targetJid], "add");
      const status = res?.status;
      const msgs = {
        "200": `✅ *+${num}* ajouté avec succès !`,
        "403": `❌ *+${num}* a désactivé les ajouts de groupe.`,
        "408": `❌ *+${num}* n'est pas sur WhatsApp.`,
        "409": `⚠️ *+${num}* est déjà dans le groupe.`,
      };
      await sock.sendMessage(jid, { text: msgs[status] || `⚠️ Statut inconnu (${status})` });
      break;
    }

    // ── PROMOTE ──
    case "promote": {
      if (!await checkAdmin(ctx)) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}promote @user*` }, { quoted: msg });
      await sock.groupParticipantsUpdate(jid, [target], "promote");
      await sock.sendMessage(jid, { text: `⬆️ *@${target.split("@")[0]}* est maintenant *admin* ! 👑`, mentions: [target] });
      break;
    }

    // ── DEMOTE ──
    case "demote": {
      if (!await checkAdmin(ctx)) return;
      const target = getTarget(ctx);
      if (!target) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}demote @user*` }, { quoted: msg });
      await sock.groupParticipantsUpdate(jid, [target], "demote");
      await sock.sendMessage(jid, { text: `⬇️ *@${target.split("@")[0]}* n'est plus admin.`, mentions: [target] });
      break;
    }

    // ── TAGALL ──
    case "tagall": {
      if (!await checkAdmin(ctx, false)) return;
      const meta = groupMeta || await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const text = args.join(" ") || "📢 Attention tout le monde !";
      const mentions = members.map(m => `@${m.split("@")[0]}`).join(" ");
      await sock.sendMessage(jid, { text: `${text}\n\n${mentions}`, mentions: members });
      break;
    }

    // ── HIDETAG ──
    case "hidetag": {
      if (!await checkAdmin(ctx, false)) return;
      const meta = groupMeta || await sock.groupMetadata(jid);
      const members = meta.participants.map(p => p.id);
      const text = args.join(" ") || "📢";
      await sock.sendMessage(jid, { text, mentions: members });
      break;
    }

    // ── MUTE (fermer le groupe) ──
    case "mute": {
      if (!await checkAdmin(ctx)) return;
      await sock.groupSettingUpdate(jid, "announcement");
      await sock.sendMessage(jid, { text: "🔇 Groupe *fermé*. Seuls les admins peuvent écrire." });
      break;
    }

    // ── UNMUTE (ouvrir le groupe) ──
    case "unmute": {
      if (!await checkAdmin(ctx)) return;
      await sock.groupSettingUpdate(jid, "not_announcement");
      await sock.sendMessage(jid, { text: "🔊 Groupe *ouvert*. Tout le monde peut écrire." });
      break;
    }

    // ── GROUPINFO ──
    case "info": {
      if (!isGroup) return sock.sendMessage(jid, { text: "❌ Groupe uniquement." }, { quoted: msg });
      const meta = groupMeta || await sock.groupMetadata(jid);
      const adminList = meta.participants.filter(p => p.admin);
      const adminJids = adminList.map(p => p.id);
      const adminText = adminList.map(p => `• @${p.id.split("@")[0]}`).join("\n");
      const created = new Date(meta.creation * 1000).toLocaleDateString("fr-FR");
      await sock.sendMessage(jid, {
        text: `╔══════════════════════════╗\n║   📋 *INFOS DU GROUPE*   ║\n╚══════════════════════════╝\n\n📌 *Nom :* ${meta.subject}\n🆔 *JID :* ${jid}\n👥 *Membres :* ${meta.participants.length}\n📅 *Créé le :* ${created}\n\n👑 *Admins (${adminList.length}) :*\n${adminText}`,
        mentions: adminJids,
      });
      break;
    }

    // ── LISTADMIN ──
    case "listadmin": {
      if (!isGroup) return sock.sendMessage(jid, { text: "❌ Groupe uniquement." }, { quoted: msg });
      const meta = groupMeta || await sock.groupMetadata(jid);
      const admins = meta.participants.filter(p => p.admin);
      const adminJids = admins.map(p => p.id);
      const text = admins.map(p => `👑 @${p.id.split("@")[0]}`).join("\n");
      await sock.sendMessage(jid, { text: `📋 *Admins du groupe (${admins.length}) :*\n\n${text}`, mentions: adminJids });
      break;
    }

    // ── SETNAME ──
    case "setname": {
      if (!await checkAdmin(ctx)) return;
      const newName = args.join(" ");
      if (!newName) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}setname Nom du groupe*` }, { quoted: msg });
      await sock.groupUpdateSubject(jid, newName);
      await sock.sendMessage(jid, { text: `✅ Nom du groupe changé en *${newName}*` });
      break;
    }

    // ── SETDESC ──
    case "setdesc": {
      if (!await checkAdmin(ctx)) return;
      const newDesc = args.join(" ");
      if (!newDesc) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}setdesc Description ici*` }, { quoted: msg });
      await sock.groupUpdateDescription(jid, newDesc);
      await sock.sendMessage(jid, { text: `✅ Description du groupe mise à jour.` });
      break;
    }

    // ── SETPP (changer photo du groupe) ──
    case "setpp": {
      if (!await checkAdmin(ctx)) return;
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgMsg = quoted?.imageMessage || msg.message?.imageMessage;
      if (!imgMsg) return sock.sendMessage(jid, { text: `❌ Envoie ou réponds à une image avec *${PREFIX}setpp*` }, { quoted: msg });
      const stream = await sock.downloadMediaMessage({ message: { imageMessage: imgMsg } });
      const buffer = Buffer.isBuffer(stream) ? stream : await bufferFromStream(stream);
      await sock.updateProfilePicture(jid, buffer);
      await sock.sendMessage(jid, { text: "✅ Photo du groupe mise à jour !" });
      break;
    }

    // ── REVOKE ──
    case "revoke": {
      if (!await checkAdmin(ctx)) return;
      const newCode = await sock.groupRevokeInvite(jid);
      await sock.sendMessage(jid, { text: `✅ Lien d'invitation réinitialisé.\n🔗 Nouveau lien : https://chat.whatsapp.com/${newCode}` });
      break;
    }

    // ── JOIN ──
    case "join": {
      if (!isOwner) return sock.sendMessage(jid, { text: "❌ Owner uniquement." }, { quoted: msg });
      const link = args[0];
      if (!link) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}join https://chat.whatsapp.com/xxx*` }, { quoted: msg });
      const code = link.split("chat.whatsapp.com/")[1];
      if (!code) return sock.sendMessage(jid, { text: "❌ Lien invalide." }, { quoted: msg });
      await sock.groupAcceptInvite(code);
      await sock.sendMessage(jid, { text: "✅ Bot a rejoint le groupe !" });
      break;
    }

    // ── RULES ──
    case "rules": {
      if (!isGroup) return sock.sendMessage(jid, { text: "❌ Groupe uniquement." }, { quoted: msg });
      const settings = GroupSettings.get(jid);
      const rules = settings.rules || "Aucune règle définie. Utilise *!setrules* pour en ajouter.";
      await sock.sendMessage(jid, { text: `📜 *RÈGLES DU GROUPE*\n\n${rules}` });
      break;
    }

    // ── SETRULES ──
    case "setrules": {
      if (!await checkAdmin(ctx, false)) return;
      const rules = args.join(" ");
      if (!rules) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}setrules Règle 1. Règle 2.* ...` }, { quoted: msg });
      GroupSettings.set(jid, "rules", rules);
      await sock.sendMessage(jid, { text: "✅ Règles du groupe enregistrées !" });
      break;
    }

    // ── SETWELCOME ──
    case "setwelcome": {
      if (!await checkAdmin(ctx, false)) return;
      const txt = args.join(" ");
      if (!txt) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}setwelcome Bienvenue {user} dans {group}!*\n\nVariables : {user} {group}` }, { quoted: msg });
      GroupSettings.update(jid, { welcomeMsg: txt, welcome: true });
      await sock.sendMessage(jid, { text: `✅ Message de bienvenue enregistré :\n\n${txt}` });
      break;
    }

    // ── SETGOODBYE ──
    case "setgoodbye": {
      if (!await checkAdmin(ctx, false)) return;
      const txt = args.join(" ");
      if (!txt) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}setgoodbye Au revoir {user} !*\n\nVariables : {user} {group}` }, { quoted: msg });
      GroupSettings.update(jid, { goodbyeMsg: txt, goodbye: true });
      await sock.sendMessage(jid, { text: `✅ Message de départ enregistré :\n\n${txt}` });
      break;
    }

    // ── PROMOTEALL ──
    case "promoteall": {
      if (!await checkAdmin(ctx)) return;
      const meta = groupMeta || await sock.groupMetadata(jid);
      const nonAdmins = meta.participants.filter(p => !p.admin).map(p => p.id);
      if (!nonAdmins.length) return sock.sendMessage(jid, { text: "⚠️ Tout le monde est déjà admin." });
      await sock.groupParticipantsUpdate(jid, nonAdmins, "promote");
      await sock.sendMessage(jid, { text: `✅ ${nonAdmins.length} membres promus admins ! 👑` });
      break;
    }

    // ── DEMOTEALL ──
    case "demoteall": {
      if (!await checkAdmin(ctx)) return;
      const meta = groupMeta || await sock.groupMetadata(jid);
      const botId = sock.user.id.replace(/:.*@/, "@");
      const admins = meta.participants
        .filter(p => p.admin && p.id !== botId && p.id !== `${ctx.OWNER_NUMBER.replace(/\D/g, "")}@s.whatsapp.net`)
        .map(p => p.id);
      if (!admins.length) return sock.sendMessage(jid, { text: "⚠️ Aucun admin à retirer." });
      await sock.groupParticipantsUpdate(jid, admins, "demote");
      await sock.sendMessage(jid, { text: `⚠️ ${admins.length} admins rétrogradés. [DANGEREUX]` });
      break;
    }

    // ── POLL ──
    case "poll": {
      if (!isGroup) return sock.sendMessage(jid, { text: "❌ Groupe uniquement." }, { quoted: msg });
      const parts = args.join(" ").split("|").map(s => s.trim());
      if (parts.length < 3) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}poll Question|Option1|Option2|...*` }, { quoted: msg });
      const [question, ...options] = parts;
      await sock.sendMessage(jid, {
        poll: { name: question, values: options, selectableCount: 1 },
      });
      break;
    }
  }
}

// ════════════════════════════════════════
//  ÉVÉNEMENTS GROUPE (welcome/goodbye)
// ════════════════════════════════════════
export async function handleGroupEvent(sock, { id, participants, action }) {
  try {
    const settings = GroupSettings.get(id);
    const meta = await sock.groupMetadata(id);
    const groupName = meta.subject;

    for (const jid of participants) {
      const num = jid.split("@")[0];

      if (action === "add" && settings.welcome) {
        const custom = settings.welcomeMsg;
        const text = custom
          ? custom.replace("{user}", `@${num}`).replace("{group}", groupName)
          : `╔══════════════════════╗\n║  🎉 *BIENVENUE !*     ║\n╚══════════════════════╝\n\n👋 Salut *@${num}* !\nBienvenue dans *${groupName}* 🔥\n\nTape *!menu* pour voir les commandes.`;

        await sock.sendMessage(id, {
          text,
          mentions: [jid],
        });
      }

      if (action === "remove" && settings.goodbye) {
        const custom = settings.goodbyeMsg;
        const text = custom
          ? custom.replace("{user}", `@${num}`).replace("{group}", groupName)
          : `👋 *@${num}* a quitté le groupe. Au revoir !`;

        await sock.sendMessage(id, {
          text,
          mentions: [jid],
        });
      }
    }

    // ── Anti-bot : kick les bots qui rejoignent ──
    if (action === "add" && settings.antibot) {
      for (const jid of participants) {
        if (jid.endsWith("@s.whatsapp.net")) {
          const num = jid.split("@")[0];
          // Les bots ont généralement des numéros spéciaux ou des patterns connus
          // Heuristique simple : numéro très court ou très long
          if (num.length < 7 || num.length > 15) {
            await sock.groupParticipantsUpdate(id, [jid], "remove");
          }
        }
      }
    }
  } catch (e) {
    // Silencieux
  }
}

// ── Helper buffer ──
async function bufferFromStream(stream) {
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}
