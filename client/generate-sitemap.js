const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

// Initialize Firebase Admin SDK
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_KEY_PATH);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: `https://${process.env.REACT_APP_FIREBASE_PROJECT_ID}.firebaseio.com`
});

const db = admin.firestore();

async function generateSitemap() {
  const baseUrl = 'https://free.deft.work'; // Change to your domain
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
  ];

  // Add static routes
  const staticRoutes = ['/', '/about', '/contact']; // Add your static routes here
  staticRoutes.forEach(route => {
    sitemap.push(
      '  <url>',
      `    <loc>${baseUrl}${route}</loc>`,
      '    <changefreq>weekly</changefreq>',
      '    <priority>0.8</priority>',
      '  </url>'
    );
  });

  // Add dynamic routes from Firestore
  try {
    const booksSnapshot = await db.collection('books').get();
    booksSnapshot.forEach(doc => {
      const book = doc.data();
      if (book.webId) {
        sitemap.push(
          '  <url>',
          `    <loc>${baseUrl}/${book.webId}</loc>`,
          '    <changefreq>daily</changefreq>',
          '    <priority>1.0</priority>',
          '  </url>'
        );
      }
    });
  } catch (error) {
    console.error('Error fetching books from Firestore:', error);
  }

  sitemap.push('</urlset>');

  const sitemapPath = path.join(__dirname, 'public', 'sitemap.xml');
  fs.writeFileSync(sitemapPath, sitemap.join('\n'));

  console.log('Sitemap generated successfully!');
  admin.app().delete(); // Cleanly exit
}

generateSitemap();
