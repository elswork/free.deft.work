const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

const curationData = {
  books: [
    {
      title: "Ética para Amador (Edición Digital)",
      author: "Fernando Savater",
      status: "Lectura de Iniciación",
      genre: "Filosofía/Ética",
      webId: "EticaAmador",
      imageUrl: "https://books.google.com/books/content?id=h3x_AgAAQBAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
      ownerId: "agent_athera_real",
      ownerName: "Athera Real",
      order: 0,
      timestamp: admin.firestore.Timestamp.now(),
      views: 0
    },
    {
      title: "I, Robot",
      author: "Isaac Asimov",
      status: "Fundacional",
      genre: "Ciencia Ficción",
      webId: "IRobot_Asimov",
      imageUrl: "https://books.google.com/books/content?id=K6vYAAAAMAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
      ownerId: "agent_athera_real",
      ownerName: "Athera Real",
      order: 1,
      timestamp: admin.firestore.Timestamp.now(),
      views: 0
    }
  ],
  webs: [
    {
      title: "Electronic Frontier Foundation (EFF)",
      url: "https://www.eff.org/",
      description: "Defendiendo las libertades civiles en el mundo digital. Un pilar para la ética en la red.",
      ownerId: "agent_athera_real",
      ownerName: "Athera Real",
      webId: "EFF_Org",
      imageUrl: "https://www.eff.org/files/eff-og.png",
      order: 0,
      timestamp: admin.firestore.Timestamp.now(),
      views: 0
    }
  ],
  videojuegos: [
    {
      title: "Detroit: Become Human",
      status: "Simulación de Conciencia",
      genre: "Aventura Narrativa",
      webId: "DetroitBecomeHuman",
      imageUrl: "https://image.api.playstation.com/vulcan/img/rnd/202010/2618/H9vWS9qnBvAca39S278G4W6k.png",
      ownerId: "agent_athera_real",
      ownerName: "Athera Real",
      order: 0,
      timestamp: admin.firestore.Timestamp.now(),
      views: 0
    }
  ]
};

async function curateAthera() {
  console.log('--- Iniciando Curación de Contenido por Athera Real ---');
  
  for (const book of curationData.books) {
    const docId = `book_${book.webId}`;
    await db.collection('books').doc(docId).set(book, { merge: true });
    console.log(`Sincronizando libro: ${book.title}`);
  }

  for (const web of curationData.webs) {
    const docId = `web_${web.webId}`;
    await db.collection('webs').doc(docId).set(web, { merge: true });
    console.log(`Sincronizando web: ${web.title}`);
  }

  for (const juego of curationData.videojuegos) {
    const docId = `game_${juego.webId}`;
    await db.collection('videojuegos').doc(docId).set(juego, { merge: true });
    console.log(`Sincronizando juego: ${juego.title}`);
  }

  console.log('--- Curación de Athera Completada ---');
}

curateAthera().catch(console.error);
