// ╔══════════════════════════════════════╗
// ║       JIQX XMD — DATABASE JSON      ║
// ╚══════════════════════════════════════╝
// Stockage local dans ./data/*.json
// Pas besoin de MongoDB ni SQLite

import fs from "fs";
import path from "path";
import config from "./config.js";

const DIR = config.DATA_DIR;
if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });

// ── Lecture / Écriture générique ──
function readFile(name) {
  const p = path.join(DIR, `${name}.json`);
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, "utf8")); }
  catch { return {}; }
}

function writeFile(name, data) {
  const p = path.join(DIR, `${name}.json`);
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

// ════════════════════════════════════════
//  WARNS
// ════════════════════════════════════════
export const Warns = {
  get(groupJid, userJid) {
    const db = readFile("warns");
    return db[groupJid]?.[userJid] || { count: 0, reasons: [] };
  },
  add(groupJid, userJid, reason = "") {
    const db = readFile("warns");
    if (!db[groupJid]) db[groupJid] = {};
    if (!db[groupJid][userJid]) db[groupJid][userJid] = { count: 0, reasons: [] };
    db[groupJid][userJid].count++;
    db[groupJid][userJid].reasons.push(reason);
    writeFile("warns", db);
    return db[groupJid][userJid].count;
  },
  remove(groupJid, userJid) {
    const db = readFile("warns");
    if (db[groupJid]?.[userJid]) {
      db[groupJid][userJid].count = Math.max(0, db[groupJid][userJid].count - 1);
      db[groupJid][userJid].reasons.pop();
      writeFile("warns", db);
    }
    return db[groupJid]?.[userJid]?.count || 0;
  },
  reset(groupJid, userJid) {
    const db = readFile("warns");
    if (db[groupJid]) delete db[groupJid][userJid];
    writeFile("warns", db);
  },
};

// ════════════════════════════════════════
//  BANS BOT
// ════════════════════════════════════════
export const Bans = {
  isBanned(userJid) {
    const db = readFile("bans");
    return !!db[userJid];
  },
  ban(userJid, reason = "") {
    const db = readFile("bans");
    db[userJid] = { reason, date: new Date().toISOString() };
    writeFile("bans", db);
  },
  unban(userJid) {
    const db = readFile("bans");
    delete db[userJid];
    writeFile("bans", db);
  },
  list() {
    return readFile("bans");
  },
};

// ════════════════════════════════════════
//  VIP / PREMIUM
// ════════════════════════════════════════
export const Vip = {
  isVip(userJid) {
    const db = readFile("vip");
    return !!db[userJid];
  },
  add(userJid) {
    const db = readFile("vip");
    db[userJid] = { date: new Date().toISOString() };
    writeFile("vip", db);
  },
  remove(userJid) {
    const db = readFile("vip");
    delete db[userJid];
    writeFile("vip", db);
  },
};

// ════════════════════════════════════════
//  SETTINGS DE GROUPE
// ════════════════════════════════════════
export const GroupSettings = {
  get(groupJid) {
    const db = readFile("groups");
    return db[groupJid] || {
      antilink:     false,
      antiwa:       false,
      antispam:     false,
      antinsfw:     false,
      antibot:      false,
      antipub:      false,
      antivoice:    false,
      antisticker:  false,
      antimedia:    false,
      antiedit:     false,
      antidelete:   false,
      antitagadmin: false,
      antifake:     false,
      salon:        false,
      welcome:      true,
      goodbye:      true,
      welcomeMsg:   "",
      goodbyeMsg:   "",
      welcomeImg:   "",
      rules:        "",
      punish:       "kick",
      maxWarns:     3,
      mutedUsers:   {},
      blacklist:    [],
      allowedCountries: [],
    };
  },
  set(groupJid, key, value) {
    const db = readFile("groups");
    if (!db[groupJid]) db[groupJid] = GroupSettings.get(groupJid);
    db[groupJid][key] = value;
    writeFile("groups", db);
  },
  update(groupJid, obj) {
    const db = readFile("groups");
    if (!db[groupJid]) db[groupJid] = GroupSettings.get(groupJid);
    Object.assign(db[groupJid], obj);
    writeFile("groups", db);
  },
};

// ════════════════════════════════════════
//  ANTI-SPAM tracker (en mémoire)
// ════════════════════════════════════════
export const SpamTracker = (() => {
  const map = new Map(); // key: "groupJid:userJid"
  return {
    track(groupJid, userJid, limit, windowMs) {
      const key = `${groupJid}:${userJid}`;
      const now = Date.now();
      if (!map.has(key)) map.set(key, []);
      const times = map.get(key).filter(t => now - t < windowMs);
      times.push(now);
      map.set(key, times);
      return times.length >= limit; // true = spam détecté
    },
    reset(groupJid, userJid) {
      map.delete(`${groupJid}:${userJid}`);
    },
  };
})();

// ════════════════════════════════════════
//  MUTES TEMPORAIRES
// ════════════════════════════════════════
export const MutedUsers = {
  mute(groupJid, userJid, until) {
    const db = readFile("mutes");
    if (!db[groupJid]) db[groupJid] = {};
    db[groupJid][userJid] = until;
    writeFile("mutes", db);
  },
  unmute(groupJid, userJid) {
    const db = readFile("mutes");
    if (db[groupJid]) delete db[groupJid][userJid];
    writeFile("mutes", db);
  },
  isMuted(groupJid, userJid) {
    const db = readFile("mutes");
    const until = db[groupJid]?.[userJid];
    if (!until) return false;
    if (Date.now() > until) {
      this.unmute(groupJid, userJid);
      return false;
    }
    return true;
  },
};

// ════════════════════════════════════════
//  STATS BOT
// ════════════════════════════════════════
export const Stats = {
  inc(key) {
    const db = readFile("stats");
    db[key] = (db[key] || 0) + 1;
    writeFile("stats", db);
  },
  get() {
    return readFile("stats");
  },
};
