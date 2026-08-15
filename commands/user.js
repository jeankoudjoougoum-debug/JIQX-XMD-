// ╔══════════════════════════════════════╗
// ║     JIQX XMD — USER COMMANDS        ║
// ╚══════════════════════════════════════╝

export async function userCmd(ctx, action) {
  const { sock, msg, jid, args, senderJid, senderNum, isOwner, PREFIX, NOM_BOT, OWNER_NAME, OWNER_NUMBER } = ctx;

  // ── Helper : obtenir la cible ──
  const getTarget = () => {
    const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentioned?.length) return mentioned[0];
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) return quoted;
    if (args[0]) {
      const num = args[0].replace(/\D/g, "");
      if (num) return `${num}@s.whatsapp.net`;
    }
    return senderJid;
  };

  switch (action) {

    // ── PROFILE ──
    case "profile": {
      const target = getTarget();
      const num = target.split("@")[0];
      let ppUrl = null;
      try { ppUrl = await sock.profilePictureUrl(target, "image"); } catch {}
      const { Vip, Bans } = await import("../database.js");
      const isVip  = Vip.isVip(target);
      const isBan  = Bans.isBanned(target);
      const isOwnerTarget = num === OWNER_NUMBER.replace(/\D/g, "");
      const role = isOwnerTarget ? "👑 OWNER" : isVip ? "💎 VIP" : isBan ? "🚫 BANNI" : "👤 Utilisateur";

      const text = `╔══════════════════════════╗\n║    👤 *PROFIL BOT*        ║\n╚══════════════════════════╝\n\n📱 *Numéro :* +${num}\n🆔 *JID :* ${target}\n🏷️ *Statut :* ${role}\n🤖 *Bot :* ${NOM_BOT}`;

      if (ppUrl) {
        await sock.sendMessage(jid, { image: { url: ppUrl }, caption: text }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text }, { quoted: msg });
      }
      break;
    }

    // ── PP ──
    case "pp": {
      const target = getTarget();
      const num = target.split("@")[0];
      try {
        const ppUrl = await sock.profilePictureUrl(target, "image");
        await sock.sendMessage(jid, {
          image: { url: ppUrl },
          caption: `📸 Photo de profil de *@${num}*`,
          mentions: [target],
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, {
          text: `❌ *@${num}* n'a pas de photo de profil visible.`,
          mentions: [target],
        }, { quoted: msg });
      }
      break;
    }

    // ── JID ──
    case "jid": {
      const target = getTarget();
      await sock.sendMessage(jid, {
        text: `🆔 *JID :*\n\`${target}\`\n\n📱 *Numéro :* +${target.split("@")[0]}`,
        mentions: [target],
      }, { quoted: msg });
      break;
    }

    // ── BLOCK ──
    case "block": {
      if (!isOwner) return sock.sendMessage(jid, { text: "❌ Owner uniquement." }, { quoted: msg });
      const target = getTarget();
      if (target === senderJid) return sock.sendMessage(jid, { text: "❌ Tu ne peux pas te bloquer toi-même." }, { quoted: msg });
      await sock.updateBlockStatus(target, "block");
      await sock.sendMessage(jid, { text: `🚫 *+${target.split("@")[0]}* bloqué.` }, { quoted: msg });
      break;
    }

    // ── UNBLOCK ──
    case "unblock": {
      if (!isOwner) return sock.sendMessage(jid, { text: "❌ Owner uniquement." }, { quoted: msg });
      const target = getTarget();
      await sock.updateBlockStatus(target, "unblock");
      await sock.sendMessage(jid, { text: `✅ *+${target.split("@")[0]}* débloqué.` }, { quoted: msg });
      break;
    }

    // ── OWNER ──
    case "owner": {
      const ownerNum = OWNER_NUMBER.replace(/\D/g, "");
      let ppUrl = null;
      try { ppUrl = await sock.profilePictureUrl(`${ownerNum}@s.whatsapp.net`, "image"); } catch {}
      const text = `👑 *Propriétaire du bot*\n\n🏷️ *Nom :* ${OWNER_NAME}\n📱 *Contact :* wa.me/${ownerNum}\n🤖 *Bot :* ${NOM_BOT}`;
      if (ppUrl) {
        await sock.sendMessage(jid, { image: { url: ppUrl }, caption: text }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text }, { quoted: msg });
      }
      break;
    }

    // ── GETSTATUS ──
    case "getstatus": {
      const target = getTarget();
      const num = target.split("@")[0];
      try {
        const status = await sock.fetchStatus(target);
        await sock.sendMessage(jid, {
          text: `📊 *Statut de @${num}*\n\n${status?.status || "Pas de statut visible."}`,
          mentions: [target],
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, {
          text: `❌ Impossible de voir le statut de *@${num}*.`,
          mentions: [target],
        }, { quoted: msg });
      }
      break;
    }
  }
}
