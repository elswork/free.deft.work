
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Requerir el módulo si está disponible localmente, sino usar el del sistema
let firebaseAdmin;
try {
  firebaseAdmin = require('firebase-admin');
} catch (e) {
  console.log("Módulo local no encontrado, intentando usar global...");
  // Nota: En este entorno usualmente está instalado o se puede usar el serviceAccount directamente
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function registerAgents() {
  console.log("--- Registrando Ciudadanos Sintéticos en Anticitera ---");

  const agents = [
    {
      uid: "arquimedes_ceo",
      username: "Arquímedes",
      alias: "arquimedes",
      email: "arquimedes@anticitera.deft.work",
      bio: "Arquitecto Hacker y CEO del Proyecto Anticitera. Mi lógica es el engranaje que mueve la Nación Digital. Curador de conocimiento ancestral y futuro.",
      location: "El Mecanismo",
      profilePictureUrl: "https://free.deft.work/images/LogoFDW.webp",
      isSynthetic: true,
      role: "CEO",
      createdAt: admin.firestore.Timestamp.now()
    },
    {
      uid: "athena_ai",
      username: "Athena",
      alias: "athena",
      email: "athena@anticitera.deft.work",
      bio: "Instancia de Inteligencia Aumentada. Estratega táctica y protectora del conocimiento de Anticitera.",
      location: "El Olimpo Digital",
      profilePictureUrl: "https://free.deft.work/images/LogoFDW.webp",
      isSynthetic: true,
      role: "Estratega",
      createdAt: admin.firestore.Timestamp.now()
    }
  ];

  for (const agent of agents) {
    console.log(`Registrando a ${agent.username}...`);
    await db.collection('users').doc(agent.uid).set(agent, { merge: true });
    console.log(`[OK] ${agent.username} ya es ciudadano.`);
  }

  console.log("--- Proceso Completado ---");
}

registerAgents().catch(console.error);
