import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from 'baileys'
import pino from 'pino'
import config from '../config.js'

export default async function connectToWhatsApp(handleMessage) {
  const { state, saveCreds } = await useMultiFileAuthState('./session')
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    browser: ['JIQX XMD', 'Chrome', '1.0.0'],
  })

  if (!sock.authState.creds.registered) {
    await new Promise(r => setTimeout(r, 3000))
    const code = await sock.requestPairingCode(config.numero)
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🔑 JIQX XMD — CODE :', code)
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  }

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('✅ JIQX XMD connecté !')
    if (connection === 'close') {
      const code = lastDisconnect?.error?.output?.statusCode
      if (code !== DisconnectReason.loggedOut) {
        console.log('🔄 Reconnexion...')
        connectToWhatsApp(handleMessage)
      } else {
        console.log('❌ Déconnecté. Supprime session et relance.')
        process.exit(0)
      }
    }
  })

  sock.ev.on('messages.upsert', ({ messages }) => handleMessage(sock, messages))
}