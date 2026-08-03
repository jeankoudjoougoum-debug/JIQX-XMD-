import connectToWhatsApp from './core/connexion.js'
import handleMessage from './events/messages.js'

(async () => {
  await connectToWhatsApp(handleMessage)
  console.log('🤖 JIQX XMD démarré !')
})()