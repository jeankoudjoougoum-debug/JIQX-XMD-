# 🤖 JIQX XMD — Bot WhatsApp par Lord Benimaru

## 📦 Installation

```bash
npm install
```

## ⚙️ Configuration

Ouvre `config.js` et remplis :
- `OWNER_NUMBER` : ton numéro sans le +
- `NUMERO` : même numéro (pour le pairing code)
- `GEMINI_API_KEY` (optionnel, pour activer l'IA)

## 🚀 Démarrage

```bash
node index.js
```

Entre le code de pairing dans WhatsApp :
> Paramètres → Appareils connectés → Associer un appareil → Entrer le code

## 📋 Commandes disponibles (109+)

### Général
- `!menu` — Afficher toutes les commandes
- `!owner` — Contacter l'owner
- `!ia [texte]` — Chat avec l'IA

### Média
- `!sticker` — Convertir image/vidéo en sticker
- `!toimg` — Convertir sticker en image

### Utils
- `!calc` — Calculatrice
- `!translate [langue] [texte]` — Traduction
- `!weather [ville]` — Météo
- `!quote` — Citation aléatoire

### Groupe (admins)
- `!kick`, `!add`, `!promote`, `!demote`
- `!tagall`, `!hidetag`, `!mute`, `!unmute`
- `!setname`, `!setdesc`, `!setpp`
- `!revoke`, `!join`, `!rules`, `!setrules`
- `!setwelcome`, `!setgoodbye`
- `!groupinfo`, `!listadmin`, `!poll`
- `!promoteall`, `!demoteall`

### Modération (admins)
- `!warn`, `!unwarn`, `!warnings`
- `!setpunish [nb] [action]` (kick/mute/ban)
- `!muteuser @user 10m`, `!unmuteuser`
- `!antilink on/off` — Anti-liens
- `!antiwa on/off` — Anti-liens WhatsApp
- `!antispam on/off` — Anti-spam
- `!antibot on/off` — Anti-bots
- `!antipub on/off` — Anti-publicité
- `!antivoice on/off` — Anti-vocaux
- `!antisticker on/off` — Anti-stickers
- `!antimedia on/off` — Anti-médias
- `!antiedit on/off` — Anti-édition
- `!antidelete on/off` — Anti-suppression
- `!antitagadmin on/off` — Anti-tag admin
- `!antifake on/off` — Anti-faux numéros
- `!antinsfw on/off` — Anti-NSFW
- `!salon on/off` — Mode salon
- `!addword`, `!delword`, `!listwords`

### Owner seulement
- `!ban`, `!unban`, `!banlist`
- `!addvip`, `!delvip`, `!checkvip`
- `!broadcast` — Message à tous
- `!restart`, `!shutdown`
- `!stats` — Statistiques du bot
- `!setnamebot`, `!setbio`, `!setppbot`
- `!block`, `!unblock`

## 🗂️ Structure

```
JIQX-XMD/
├── index.js          ← Connexion Baileys + pairing code
├── handler.js        ← Routeur de commandes
├── database.js       ← Base de données JSON locale
├── config.js         ← Configuration
├── commands/
│   ├── group.js      ← Gestion de groupe
│   ├── moderation.js ← Auto-modération + commandes
│   ├── user.js       ← Commandes utilisateur
│   ├── fun.js        ← Menu, sticker, utils
│   ├── owner.js      ← Commandes owner
│   └── ia.js         ← Module IA (Gemini/OpenAI)
└── data/             ← Fichiers JSON (warns, bans, etc.)
```
