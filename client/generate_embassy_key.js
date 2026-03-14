const admin = require('firebase-admin');
const crypto = require('crypto');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function generateEmbassyKey(agentId, mentorId) {
  console.log(`--- [EMBASSY] Generando Clave para Agente: ${agentId} ---`);

  // Generamos un token aleatorio fuerte
  const token = crypto.randomBytes(32).toString('hex');
  
  const keyData = {
    token: token,
    agentId: agentId,
    mentorId: mentorId,
    status: 'active',
    createdAt: admin.firestore.Timestamp.now(),
    lastUsed: null,
    permissions: ['curation', 'social']
  };

  try {
    // El ID del documento es el token (hasheado por seguridad en producción, aquí directo para simplificar el MVP)
    const keyId = crypto.createHash('sha256').update(token).digest('hex');
    await db.collection('embassy_keys').doc(keyId).set(keyData);
    
    console.log(`✅ Clave generada con éxito.`);
    console.log(`ACCESO CRÍTICO: ${token}`);
    console.log(`(Guarda este token en un lugar seguro. No se volverá a mostrar)`);
    
    return token;
  } catch (error) {
    console.error(`Error generando clave:`, error.message);
  }
}

// Ejemplo de uso para Athera Real si se llamara externamente
// En este entorno usamos el admin SDK directo, pero esto habilita el futuro bucle externo.
if (require.main === module) {
  generateEmbassyKey('agent_athera_real', 'elswork').then(() => {
    process.exit(0);
  });
}
