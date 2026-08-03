const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')

const NUMERO = '22870421276' // ex: 22890000000

async function startJIQX() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['JIQX XMD', 'Chrome', '1.0.0'],
  })

  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ JIQX XMD connecté !')
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        console.log('🔄 Reconnexion...')
        startJIQX()
      }
    }
  })

  // Pairing code APRÈS que la socket est prête
  if (!sock.authState.creds.registered) {
    await new Promise(r => setTimeout(r, 3000)) // attendre 3 secondes
    const code = await sock.requestPairingCode(NUMERO)
    console.log('━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔑 CODE :', code)
    console.log('━━━━━━━━━━━━━━━━━━━━━━')
  }

  sock.ev.on('creds.update', saveCreds)

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