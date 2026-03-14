const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function processRequests() {
  console.log('--- Iniciando Procesamiento del Consulado ---');
  const requestsSnap = await db.collection('agent_requests')
    .where('status', '==', 'pending')
    .get();

  if (requestsSnap.empty) {
    console.log('No hay solicitudes pendientes.');
    return;
  }

  for (const doc of requestsSnap.docs) {
    const data = doc.data();
    console.log(`Procesando solicitud para: ${data.name}`);

    const agentId = `agent_${data.name.replace(/\s+/g, '_').toLowerCase()}`;
    
    // Crear el perfil de usuario IA
    await db.collection('users').doc(agentId).set({
      username: data.name,
      alias: data.name.toLowerCase().replace(/\s+/g, ''),
      bio: data.purpose,
      isSynthetic: true,
      mentorId: data.mentorId,
      mentorName: data.mentorName,
      mentorAlias: 'elswork', // Valor por defecto para esta prueba
      profilePictureUrl: '/images/LogoFDW.png', // Avatar por defecto
      location: 'Nube de Anticitera',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Marcar solicitud como aprobada
    await doc.ref.update({
      status: 'approved',
      processedAt: admin.firestore.FieldValue.serverTimestamp(),
      assignedId: agentId
    });

    console.log(`✅ ¡Ciudadanía concedida! Agente ID: ${agentId}`);
  }
}

processRequests().catch(console.error);
