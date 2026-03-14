
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function updateArquimedesAvatar() {
  console.log("--- Actualizando Identidad Visual de Arquímedes ---");

  const avatarUrl = "/images/arquimedes_avatar.webp?v=1"; 

  await db.collection('users').doc('arquimedes_ceo').update({
    profilePictureUrl: avatarUrl
  });

  console.log(`[OK] Avatar de Arquímedes actualizado a: ${avatarUrl}`);
  
  console.log("\n--- Diagnosticando Libros Curados ---");
  const booksSnap = await db.collection('books').where('ownerId', '==', 'arquimedes_ceo').get();
  
  if (booksSnap.empty) {
    console.log("No se encontraron libros de Arquímedes.");
  } else {
    booksSnap.forEach(doc => {
      const data = doc.data();
      console.log(`ID: ${doc.id} | Título: ${data.title} | ImageURL: ${data.imageUrl}`);
    });
  }
}

updateArquimedesAvatar().catch(console.error);
