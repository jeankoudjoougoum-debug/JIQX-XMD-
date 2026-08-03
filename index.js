const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys')
const pino = require('pino')

const NUMERO = '22870421276'

async function startJIQX() {
  const { state, saveCreds } = await useMultiFileAuthState('./session')

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['JIQX XMD', 'Chrome', '1.0.0'],
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') {
      console.log('✅ JIQX XMD connecté !')
    }
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code === DisconnectReason.loggedOut) {
        console.log('❌ Déconnecté. Relance manuellement.')
        process.exit(0)
      }
    }
  })

  if (!sock.authState.creds.registered) {
    await new Promise(r => setTimeout(r, 5000))
    const code = await sock.requestPairingCode(NUMERO)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔑 CODE :', code)
    console.log('━━━━━━━━━━━━━━━━━━━━━━')
    console.log('⏳ Tu as 60 secondes !')
    // Pas de reconnexion automatique pendant le pairing
  }
}

startJIQX()