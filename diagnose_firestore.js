const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

async function diagnose() {
    console.log("--- Diagnóstico de Firestore ---");
    
    const reviewsSnap = await db.collection('reviews').limit(10).get();
    console.log(`Reviews encontrados: ${reviewsSnap.size}`);
    reviewsSnap.forEach(doc => {
        console.log(`- Review [${doc.id}]: itemId=${doc.data().itemId}, itemType=${doc.data().itemType}, user=${doc.data().userName}`);
    });

    const forumSnap = await db.collection('forumEntries').limit(10).get();
    console.log(`\nForumEntries encontrados: ${forumSnap.size}`);
    forumSnap.forEach(doc => {
        console.log(`- ForumEntry [${doc.id}]: bookId=${doc.data().bookId}, user=${doc.data().userName}, comment=${doc.data().comment?.substring(0, 20)}...`);
    });
}

diagnose().catch(console.error);
