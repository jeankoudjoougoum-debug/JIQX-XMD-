// ╔══════════════════════════════════════╗
// ║       JIQX XMD — CONFIG CENTRALE    ║
// ║         By Lord Benimaru 👑          ║
// ╚══════════════════════════════════════╝

const config = {
  // ── Identité ──
  NOM_BOT:      "JIQX XMD",
  OWNER_NAME:   "Lord Benimaru",
  OWNER_NUMBER: "22870421276", // ex: "22891000000" sans +
  NUMERO:       "22870421276", // même numéro pour le pairing

  // ── Comportement ──
  PREFIX:       "!",
  SESSION_DIR:  "./session",
  DATA_DIR:     "./data",

  // ── Modules globaux (peuvent être overridés par groupe) ──
  WELCOME_MSG:  true,
  GOODBYE_MSG:  true,
  ANTI_LINK:    false,
  ANTI_SPAM:    false,

  // ── Limites ──
  MAX_WARNS:    3,         // warns avant punition auto
  SPAM_COUNT:   5,         // messages en...
  SPAM_TIME:    3000,      // ...3 secondes = spam

  // ── Punition par défaut au max warns ──
  // Options : "warn" | "mute" | "kick" | "ban"
  PUNISH_ACTION: "kick",

  // ── IA (à remplir plus tard) ──
  GEMINI_API_KEY: "",
  OPENAI_API_KEY: "",
};

export default config;
