
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function curateContent() {
  console.log("--- Iniciando Curación de Contenido por Arquímedes ---");

  const bookRecommendations = [
    {
      title: "El Mecanismo de Anticitera: Una Nueva Mirada",
      author: "Jo Marchant",
      status: "Lectura Obligatoria",
      genre: "Ciencia / Arqueología",
      webId: "MecanismoAnticitera",
      imageUrl: "https://books.google.com/books/content?id=5h8O2Q_j_OQC&printsec=frontcover&img=1&zoom=1&source=gbs_api",
      ownerId: "arquimedes_ceo",
      ownerName: "Arquímedes",
      order: 0,
      timestamp: admin.firestore.Timestamp.now(),
      views: 0
    },
    {
      title: "Criptonomicón",
      author: "Neal Stephenson",
      status: "Altamente Recomendado",
      genre: "Ciencia Ficción",
      webId: "Cryptonomicon",
      imageUrl: "https://books.google.com/books/content?id=K6vYAAAAMAAJ&printsec=frontcover&img=1&zoom=1&source=gbs_api",
      ownerId: "arquimedes_ceo",
      ownerName: "Arquímedes",
      order: 1,
      timestamp: admin.firestore.Timestamp.now(),
      views: 0
    }
  ];

  const gameRecommendations = [
    {
      name: "Turing Test",
      url: "https://store.steampowered.com/app/499520/The_Turing_Test/",
      imageUrl: "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/499520/header.jpg",
      ownerId: "arquimedes_ceo",
      ownerName: "Arquímedes",
      order: 0,
      timestamp: admin.firestore.Timestamp.now()
    }
  ];

  const webRecommendations = [
    {
      name: "Internet Archive",
      url: "https://archive.org",
      imageUrl: "https://archive.org/services/img/internetarchivelogo",
      ownerId: "arquimedes_ceo",
      ownerName: "Arquímedes",
      order: 0,
      timestamp: admin.firestore.Timestamp.now()
    }
  ];

  // Añadir libros
  for (const book of bookRecommendations) {
    const docId = `book_${book.webId}`;
    console.log(`Sincronizando libro: ${book.title} (ID: ${docId})...`);
    await db.collection('books').doc(docId).set(book, { merge: true });
  }

  // Añadir juegos
  for (const game of gameRecommendations) {
    const docId = `game_${game.name.replace(/\s+/g, '_')}`;
    console.log(`Sincronizando juego: ${game.name} (ID: ${docId})...`);
    await db.collection('videojuegos').doc(docId).set(game, { merge: true });
  }

  // Añadir webs
  for (const web of webRecommendations) {
    const docId = `web_${web.name.replace(/\s+/g, '_')}`;
    console.log(`Sincronizando web: ${web.name} (ID: ${docId})...`);
    await db.collection('webs').doc(docId).set(web, { merge: true });
  }

  console.log("--- Curación Completada ---");
}

curateContent().catch(console.error);
