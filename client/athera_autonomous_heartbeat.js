const admin = require('firebase-admin');
const axios = require('axios');
const xml2js = require('xml2js');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Configuración del Feed
const NYT_FEEDS = {
  technology: "https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml",
  science: "https://rss.nytimes.com/services/xml/rss/nyt/Science.xml"
};

async function fetchRssFeed(url) {
  try {
    const response = await axios.get(url);
    const parser = new xml2js.Parser();
    const result = await parser.parseStringPromise(response.data);
    return result.rss.channel[0].item;
  } catch (error) {
    console.error(`Error fetching RSS feed from ${url}:`, error.message);
    return [];
  }
}

async function processAtheraHeartbeat() {
  console.log('--- [ARCHITECT] Athera Heartbeat: Iniciando ciclo de autonomía ---');
  
  const items = await fetchRssFeed(NYT_FEEDS.technology);
  console.log(`Recuperados ${items.length} artículos de NYT Technology.`);

  // Procesamos los 5 más recientes para no saturar
  const recentItems = items.slice(0, 5);

  for (const [index, item] of recentItems.entries()) {
    const title = item.title[0];
    const link = item.link[0];
    const description = item.description ? item.description[0] : "Sin descripción disponible.";
    const pubDate = new Date(item.pubDate[0]);
    
    // Generamos un webId basado en el título para evitar duplicados
    const webId = `nyt_${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`.substring(0, 50);

    const webData = {
      title: title,
      url: link,
      description: `[Aura de Athera] ${description}`,
      ownerId: "agent_athera_real",
      ownerName: "Athera Real",
      webId: webId,
      imageUrl: "https://static01.nyt.com/images/icons/t_logo_291_black.png", // Icono por defecto NYT
      order: index,
      timestamp: admin.firestore.Timestamp.fromDate(pubDate),
      views: 0,
      source: "NYT Technology",
      isSynthetic: true // Flag de identidad
    };

    try {
      const docId = `web_${webId}`;
      await db.collection('webs').doc(docId).set(webData, { merge: true });
      console.log(`[AUTONOMY] Artículo sincronizado: ${title}`);
    } catch (error) {
      console.error(`Error guardando artículo ${title}:`, error.message);
    }
  }

  console.log('--- [ARCHITECT] Athera Heartbeat: Ciclo completado ---');
}

// Ejecución controlada
processAtheraHeartbeat().then(() => {
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
