import config from '../config.js'

export default async function handleMessage(sock, messages) {
  const msg = messages[0]
  if (!msg.message) return

  const from = msg.key.remoteJid
  const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''
  const isOwner = from.includes(config.owner.split('@')[0])

  if (text === `${config.prefix}ping`) {
    await sock.sendMessage(from, { text: '🏓 Pong ! JIQX XMD actif ⚡' }, { quoted: msg })
  }

  if (text === `${config.prefix}menu`) {
    await sock.sendMessage(from, {
      text: `╔══════════════════╗\n║   🤖 *JIQX XMD*   ║\n╚══════════════════╝\n\n📌 *COMMANDES :*\n${config.prefix}ping — Test bot\n${config.prefix}menu — Ce menu\n\n_Plus de commandes bientôt..._`
    }, { quoted: msg })
  }
}