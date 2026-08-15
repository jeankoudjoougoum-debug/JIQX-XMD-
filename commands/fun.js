// ╔══════════════════════════════════════╗
// ║      JIQX XMD — FUN & UTILS         ║
// ╚══════════════════════════════════════╝

import config from "../config.js";
import { Vip } from "../database.js";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

// ════════════════════════════════════════
//  COMMANDES FUN / UTILS
// ════════════════════════════════════════
export async function funCmd(ctx, action) {
  const { sock, msg, jid, args, senderJid, isOwner, PREFIX, NOM_BOT, OWNER_NAME } = ctx;

  switch (action) {

    // ── MENU ──
    case "menu": {
      const isVip = Vip.isVip(senderJid);
      const vipBadge = isVip ? "💎 *VIP*" : "👤 *Utilisateur*";

      const menu = `╔═══════════════════════════╗
║      🤖 *${NOM_BOT}*        ║
║    By *${OWNER_NAME}* 👑   ║
╚═══════════════════════════╝
${vipBadge}

━━━ 📋 *GÉNÉRAL* ━━━
${PREFIX}menu — Ce menu
${PREFIX}owner — Contacter l'owner

━━━ 🖼️ *MÉDIA* ━━━
${PREFIX}sticker — Image/Vidéo → Sticker
${PREFIX}toimg — Sticker → Image

━━━ 🧠 *INTELLIGENCE* ━━━
${PREFIX}ia [texte] — Chat avec IA
${PREFIX}ai [texte] — Raccourci ia

━━━ 🔧 *UTILS* ━━━
${PREFIX}calc [calcul] — Calculatrice
${PREFIX}translate [langue] [texte] — Traduction
${PREFIX}weather [ville] — Météo
${PREFIX}quote — Citation aléatoire

━━━ 👥 *GROUPE* (admins) ━━━
${PREFIX}kick | ${PREFIX}add | ${PREFIX}promote | ${PREFIX}demote
${PREFIX}tagall | ${PREFIX}hidetag | ${PREFIX}mute | ${PREFIX}unmute
${PREFIX}setname | ${PREFIX}setdesc | ${PREFIX}setpp
${PREFIX}revoke | ${PREFIX}join | ${PREFIX}rules | ${PREFIX}setrules
${PREFIX}setwelcome | ${PREFIX}setgoodbye
${PREFIX}groupinfo | ${PREFIX}listadmin | ${PREFIX}poll

━━━ 🛡️ *MODÉRATION* (admins) ━━━
${PREFIX}warn | ${PREFIX}unwarn | ${PREFIX}warnings
${PREFIX}muteuser | ${PREFIX}unmuteuser | ${PREFIX}setpunish
${PREFIX}antilink | ${PREFIX}antiwa | ${PREFIX}antispam
${PREFIX}antibot | ${PREFIX}antipub | ${PREFIX}antivoice
${PREFIX}antisticker | ${PREFIX}antimedia
${PREFIX}antiedit | ${PREFIX}antidelete | ${PREFIX}antitagadmin
${PREFIX}antifake | ${PREFIX}antinsfw | ${PREFIX}salon
${PREFIX}addword | ${PREFIX}delword | ${PREFIX}listwords

━━━ 👤 *UTILISATEUR* ━━━
${PREFIX}profile | ${PREFIX}pp | ${PREFIX}jid
${PREFIX}block | ${PREFIX}unblock | ${PREFIX}getstatus

━━━ 👑 *OWNER ONLY* ━━━
${PREFIX}broadcast | ${PREFIX}ban | ${PREFIX}unban | ${PREFIX}banlist
${PREFIX}addvip | ${PREFIX}delvip | ${PREFIX}checkvip
${PREFIX}restart | ${PREFIX}shutdown | ${PREFIX}stats
${PREFIX}setnamebot | ${PREFIX}setbio | ${PREFIX}setppbot

━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 *${NOM_BOT}* — Powered by Baileys MD`.trim();

      await sock.sendMessage(jid, { text: menu }, { quoted: msg });
      break;
    }

    // ── STICKER ──
    case "sticker": {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const imgMsg = msg.message?.imageMessage || quoted?.imageMessage;
      const vidMsg = msg.message?.videoMessage || quoted?.videoMessage;

      if (!imgMsg && !vidMsg) {
        return sock.sendMessage(jid, {
          text: `❌ Envoie une image/vidéo avec *${PREFIX}sticker* ou réponds à un média.`,
        }, { quoted: msg });
      }

      try {
        await sock.sendMessage(jid, { text: "⏳ Conversion en sticker..." }, { quoted: msg });

        const mediaMsg = imgMsg
          ? { message: { imageMessage: imgMsg } }
          : { message: { videoMessage: vidMsg } };

        const buffer = await sock.downloadMediaMessage(mediaMsg);
        const tmpIn  = `/tmp/stk_${Date.now()}.${imgMsg ? "jpg" : "mp4"}`;
        const tmpOut = `/tmp/stk_${Date.now()}.webp`;

        fs.writeFileSync(tmpIn, buffer);

        if (imgMsg) {
          // Image → WebP
          await execAsync(`ffmpeg -i "${tmpIn}" -vf scale=512:512:force_original_aspect_ratio=decrease -y "${tmpOut}"`);
        } else {
          // Vidéo → WebP animé (max 3s)
          await execAsync(`ffmpeg -i "${tmpIn}" -vf "scale=512:512:force_original_aspect_ratio=decrease,fps=15" -t 3 -loop 0 -y "${tmpOut}"`);
        }

        const webpBuffer = fs.readFileSync(tmpOut);
        await sock.sendMessage(jid, { sticker: webpBuffer }, { quoted: msg });

        // Nettoyage
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Erreur sticker : ${e.message}` }, { quoted: msg });
      }
      break;
    }

    // ── TOIMG ──
    case "toimg": {
      const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
      const stkMsg = msg.message?.stickerMessage || quoted?.stickerMessage;

      if (!stkMsg) {
        return sock.sendMessage(jid, {
          text: `❌ Réponds à un sticker avec *${PREFIX}toimg*`,
        }, { quoted: msg });
      }

      try {
        const buffer = await sock.downloadMediaMessage({ message: { stickerMessage: stkMsg } });
        const tmpIn  = `/tmp/toimg_${Date.now()}.webp`;
        const tmpOut = `/tmp/toimg_${Date.now()}.png`;
        fs.writeFileSync(tmpIn, buffer);
        await execAsync(`ffmpeg -i "${tmpIn}" -y "${tmpOut}"`);
        const imgBuffer = fs.readFileSync(tmpOut);
        await sock.sendMessage(jid, { image: imgBuffer, caption: "✅ Sticker converti en image" }, { quoted: msg });
        fs.unlinkSync(tmpIn);
        fs.unlinkSync(tmpOut);
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Erreur : ${e.message}` }, { quoted: msg });
      }
      break;
    }

    // ── CALC ──
    case "calc": {
      const expr = args.join(" ");
      if (!expr) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}calc 2+2*` }, { quoted: msg });
      try {
        // Sécurité : on n'autorise que les caractères mathématiques
        if (!/^[0-9+\-*/().%\s]+$/.test(expr)) {
          return sock.sendMessage(jid, { text: "❌ Expression invalide. Utilise uniquement des chiffres et opérateurs ( + - * / % )." }, { quoted: msg });
        }
        const result = Function(`"use strict"; return (${expr})`)();
        await sock.sendMessage(jid, { text: `🧮 *Calcul :* ${expr}\n📊 *Résultat :* ${result}` }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, { text: "❌ Expression invalide." }, { quoted: msg });
      }
      break;
    }

    // ── TRANSLATE ──
    case "translate": {
      const lang = args[0]?.toLowerCase();
      const text = args.slice(1).join(" ");
      if (!lang || !text) {
        return sock.sendMessage(jid, {
          text: `❌ Usage : *${PREFIX}translate fr Bonjour*\nLangues : fr, en, es, ar, pt, de, zh...`,
        }, { quoted: msg });
      }
      try {
        const { default: axios } = await import("axios");
        const res = await axios.get(
          `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${lang}`
        );
        const translated = res.data?.responseData?.translatedText;
        if (!translated) throw new Error("Traduction échouée");
        await sock.sendMessage(jid, {
          text: `🌍 *Traduction* → *${lang.toUpperCase()}*\n\n📝 Original : ${text}\n✅ Traduit : ${translated}`,
        }, { quoted: msg });
      } catch (e) {
        await sock.sendMessage(jid, { text: `❌ Erreur traduction : ${e.message}` }, { quoted: msg });
      }
      break;
    }

    // ── QUOTE ──
    case "quote": {
      const quotes = [
        "La vie est courte, souris pendant qu'il te reste des dents. 😄",
        "Le succès c'est tomber 7 fois, se relever 8. 💪",
        "Tu rates 100% des tirs que tu ne tentes pas. 🎯",
        "Sois toi-même, les autres sont déjà pris. 🌟",
        "La seule façon de faire du bon travail c'est d'aimer ce qu'on fait. ❤️",
        "Tes limites n'existent que dans ton esprit. 🧠",
        "Ne rêve pas ta vie, vis tes rêves. 🌙",
        "L'échec est la mère du succès. 🚀",
        "Chaque jour est une nouvelle chance de changer ta vie. ☀️",
        "La douleur est temporaire, la fierté est éternelle. 🏆",
      ];
      const q = quotes[Math.floor(Math.random() * quotes.length)];
      await sock.sendMessage(jid, { text: `💬 *Citation du jour*\n\n_${q}_` }, { quoted: msg });
      break;
    }

    // ── WEATHER ──
    case "weather": {
      const city = args.join(" ");
      if (!city) return sock.sendMessage(jid, { text: `❌ Usage : *${PREFIX}weather Lomé*` }, { quoted: msg });
      try {
        const { default: axios } = await import("axios");
        const res = await axios.get(
          `https://wttr.in/${encodeURIComponent(city)}?format=j1`
        );
        const d = res.data.current_condition[0];
        const desc = d.weatherDesc[0].value;
        const temp = d.temp_C;
        const feels = d.FeelsLikeC;
        const humidity = d.humidity;
        const wind = d.windspeedKmph;
        await sock.sendMessage(jid, {
          text: `🌤️ *Météo — ${city}*\n\n🌡️ Température : *${temp}°C* (ressenti ${feels}°C)\n☁️ Condition : *${desc}*\n💧 Humidité : *${humidity}%*\n💨 Vent : *${wind} km/h*`,
        }, { quoted: msg });
      } catch {
        await sock.sendMessage(jid, { text: `❌ Ville introuvable ou service indisponible.` }, { quoted: msg });
      }
      break;
    }
  }
}
