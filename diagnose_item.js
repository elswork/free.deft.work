
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkItem(id) {
  console.log(`--- Buscando datos para ID: ${id} ---`);
  
  // Buscar en reviews
  const reviewsSnapshot = await db.collection('reviews').where('itemId', '==', id).get();
  console.log(`Reviews encontradas: ${reviewsSnapshot.size}`);
  reviewsSnapshot.forEach(doc => console.log('Review:', doc.id, doc.data()));

  // Buscar en forumEntries por bookId
  const forumByBook = await db.collection('forumEntries').where('bookId', '==', id).get();
  console.log(`forumEntries por bookId: ${forumByBook.size}`);
  forumByBook.forEach(doc => console.log('Forum (bookId):', doc.id, doc.data()));

  // Buscar en forumEntries por webId
  const forumByWeb = await db.collection('forumEntries').where('webId', '==', id).get();
  console.log(`forumEntries por webId: ${forumByWeb.size}`);
  forumByWeb.forEach(doc => console.log('Forum (webId):', doc.id, doc.data()));

  // Buscar en forumEntries por contentId
  const forumByContent = await db.collection('forumEntries').where('contentId', '==', id).get();
  console.log(`forumEntries por contentId: ${forumByContent.size}`);
  forumByContent.forEach(doc => console.log('Forum (contentId):', doc.id, doc.data()));
  
  // Buscar el item en todas las colecciones posibles para saber que es
  const collections = ['books', 'movies', 'music', 'videos', 'videojuegos', 'webs'];
  for (const col of collections) {
    const doc = await db.collection(col).doc(id).get();
    if (doc.exists) {
      console.log(`Item encontrado en colección: ${col}`);
      console.log('Datos:', doc.data());
    }
  }
}

checkItem('LYPLV').catch(console.error);
