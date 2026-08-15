// ╔══════════════════════════════════════╗
// ║      JIQX XMD — IA (GEMINI)         ║
// ╚══════════════════════════════════════╝
// Placeholder prêt pour Gemini AI
// Remplis GEMINI_API_KEY dans config.js pour activer

import config from "../config.js";

export async function iaCmd(ctx) {
  const { sock, msg, jid, args, PREFIX } = ctx;

  const question = args.join(" ");
  if (!question) {
    return sock.sendMessage(jid, {
      text: `❌ Usage : *${PREFIX}ia [ta question]*\n\nEx : *${PREFIX}ia C'est quoi l'IA ?*`,
    }, { quoted: msg });
  }

  // ── Si pas de clé API configurée ──
  if (!config.GEMINI_API_KEY && !config.OPENAI_API_KEY) {
    return sock.sendMessage(jid, {
      text: `🧠 *Module IA*\n\nTu as demandé :\n_"${question}"_\n\n⚙️ L'IA n'est pas encore configurée.\nL'owner doit renseigner une clé API dans *config.js*\n\n• GEMINI_API_KEY (Google — gratuit)\n• OPENAI_API_KEY (OpenAI — payant)`,
    }, { quoted: msg });
  }

  // ── Gemini (Google AI) ──
  if (config.GEMINI_API_KEY) {
    try {
      await sock.sendMessage(jid, { text: "🧠 _Réflexion en cours..._" }, { quoted: msg });
      const { default: axios } = await import("axios");
      const res = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${config.GEMINI_API_KEY}`,
        {
          contents: [{ parts: [{ text: question }] }],
        },
        { headers: { "Content-Type": "application/json" } }
      );
      const answer = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!answer) throw new Error("Réponse vide de Gemini");
      await sock.sendMessage(jid, {
        text: `🤖 *JIQX IA (Gemini)*\n\n❓ _${question}_\n\n💬 ${answer}`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, {
        text: `❌ Erreur IA : ${e.message}`,
      }, { quoted: msg });
    }
    return;
  }

  // ── OpenAI (ChatGPT) ──
  if (config.OPENAI_API_KEY) {
    try {
      await sock.sendMessage(jid, { text: "🧠 _Réflexion en cours..._" }, { quoted: msg });
      const { default: axios } = await import("axios");
      const res = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: question }],
          max_tokens: 500,
        },
        {
          headers: {
            Authorization: `Bearer ${config.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
      const answer = res.data?.choices?.[0]?.message?.content;
      if (!answer) throw new Error("Réponse vide de OpenAI");
      await sock.sendMessage(jid, {
        text: `🤖 *JIQX IA (GPT)*\n\n❓ _${question}_\n\n💬 ${answer}`,
      }, { quoted: msg });
    } catch (e) {
      await sock.sendMessage(jid, {
        text: `❌ Erreur IA : ${e.message}`,
      }, { quoted: msg });
    }
  }
}
