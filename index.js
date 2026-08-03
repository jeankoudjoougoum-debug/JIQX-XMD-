const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')

async function startJIQX() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['JIQX XMD', 'Chrome', '1.0.0'],
  })

  if (!sock.authState.creds.registered) {
    const number = 'TONNUMERO' // ex: 22890000000
    const code = await sock.requestPairingCode(number)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('  🤖 JIQX XMD - DÉMARRAGE')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔑 CODE DE JUMELAGE :', code)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━')
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ JIQX XMD connecté avec succès !')
    }
    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log('🔄 Reconnexion...')
        startJIQX()
      }
    }
  })

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0]
    if (!msg.message) return

    const from = msg.key.remoteJid
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || ''

    if (text === '!ping') {
      await sock.sendMessage(from, { text: '🏓 Pong !' }, { quoted: msg })
    }
  })
}

startJIQX()