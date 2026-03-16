const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors")({origin: true});

admin.initializeApp();

const { createMCPServer } = require("./mcp_server.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const express = require("express");

const mcpApp = express();
mcpApp.use(require("cors")({ origin: true }));
// No usar express.json() aquí porque SSEServerTransport necesita leer el stream directamente.

const transports = new Map();

// Middleware de Logging Global para MCP
mcpApp.use((req, res, next) => {
  functions.logger.log(`[MCP REQUEST] ${req.method} ${req.originalUrl} - Host: ${req.get('host')} - SessionId: ${req.query.sessionId || 'N/A'}`);
  next();
});

mcpApp.get("/sse", async (req, res) => {
  functions.logger.log(`Iniciando flujo SSE MCP en Host: ${req.get('host')}...`);
  
  // En Firebase Functions (cloudfunctions.net), la ruta base incluye el nombre de la función (/mcp)
  // En Cloud Run directo, la ruta base es /
  const isProxy = req.get('host').includes('cloudfunctions.net');
  const endpoint = isProxy ? '/mcp/messages' : '/messages';
  functions.logger.log(`Endpoint de mensajes calculado: ${endpoint}`);
  
  const transport = new SSEServerTransport(endpoint, res);
  transports.set(transport.sessionId, transport);
  
  functions.logger.log(`Transporte MCP creado. SessionId: ${transport.sessionId}`);

  let heartbeat;

  res.on("close", () => {
    if (heartbeat) clearInterval(heartbeat);
    transports.delete(transport.sessionId);
    functions.logger.log(`Conexión MCP SSE cerrada: ${transport.sessionId}`);
  });

  const server = createMCPServer();
  try {
    await server.connect(transport);
    functions.logger.log(`Servidor MCP conectado al transporte: ${transport.sessionId}`);

    // Heartbeat sutil cada 15s para mantener el túnel Cloud Run vivo
    heartbeat = setInterval(() => {
      try {
        res.write(': heartbeat\n\n');
      } catch (e) {
        clearInterval(heartbeat);
      }
    }, 15000);

  } catch (error) {
    functions.logger.error("Error conectando Servidor MCP:", error);
    res.end();
  }
});

mcpApp.post("/messages", async (req, res) => {
  const sessionId = req.query.sessionId;
  const transport = transports.get(sessionId);
  if (!transport) {
    functions.logger.error(`Mensaje MCP POST recibido pero sesión NO encontrada: ${sessionId}`);
    res.status(404).send("Session not found");
    return;
  }
  try {
    await transport.handlePostMessage(req, res, req.body);
  } catch (error) {
    functions.logger.error(`Error procesando POST MCP (${sessionId}):`, error);
    res.status(500).send(error.message);
  }
});


exports.mcp = onRequest({ region: "europe-west1", cors: true, timeoutSeconds: 300 }, mcpApp);

exports.extractImageFromUrl = onRequest({region: "europe-west1"}, (req, res) => {
  cors(req, res, async () => {
    const url = req.query.url;
    if (!url) {
      res.status(400).send("URL query parameter is required.");
      return;
    }

    try {
      const { data } = await axios.get(url);
      const $ = cheerio.load(data);

      let imageUrl = $('meta[property="og:image"]').attr('content');
      if (!imageUrl) {
        imageUrl = $('meta[name="twitter:image"]').attr('content');
      }

      if (imageUrl) {
        res.status(200).json({ imageUrl });
      } else {
        res.status(404).send("No image found.");
      }
    } catch (error) {
      res.status(500).send(`Error fetching URL: ${error.message}`);
    }
  });
});

exports.sendFollowNotification = onDocumentUpdated({
  document: "users/{userId}",
  region: "europe-west1"
}, async (event) => {
  const newValue = event.data.after.data();
  const previousValue = event.data.before.data();
  const userId = event.params.userId;

  if (newValue.followers && previousValue.followers && newValue.followers.length > previousValue.followers.length) {
    const userToNotifyRef = admin.firestore().collection("users").doc(userId);
    const userToNotifySnap = await userToNotifyRef.get();
    const userToNotifyToken = userToNotifySnap.data().fcmToken;

    if (userToNotifyToken) {
      const newFollowerId = newValue.followers[newValue.followers.length - 1];
      const newFollowerRef = admin.firestore().collection("users").doc(newFollowerId);
      const newFollowerSnap = await newFollowerRef.get();
      const newFollowerName = newFollowerSnap.data().username;

      const message = {
        notification: {
          title: "¡Nuevo seguidor!",
          body: `${newFollowerName} ha comenzado a seguirte.`,
        },
        webpush: {
          fcm_options: {
            link: `https://free.deft.work/profile/${newFollowerId}`
          }
        },
        token: userToNotifyToken,
      };

      functions.logger.log(`Sending notification to ${userId}`, { message: message, structuredData: true });
      try {
        const response = await admin.messaging().send(message);
        functions.logger.log("Successfully sent message:", { response: response, structuredData: true });
      } catch (error) {
        functions.logger.error("Error sending message:", {
          message: error.message,
          code: error.code,
          stack: error.stack,
        }, { structuredData: true });
      }
    } else {
      functions.logger.warn(`No FCM token found for user ${userId}. Cannot send notification.`, { structuredData: true });
    }
  }
});

exports.sendForumPostNotification = onDocumentCreated({
  document: "forumEntries/{entryId}",
  region: "europe-west1"
}, async (event) => {
  const postData = event.data.data();
  const bookWebId = postData.webId;

  const bookQuery = admin.firestore().collection("books").where("webId", "==", bookWebId);
  const bookQuerySnap = await bookQuery.get();

  if (bookQuerySnap.empty) {
    functions.logger.warn(`Book with webId ${bookWebId} not found.`);
    return null;
  }

  const bookData = bookQuerySnap.docs[0].data();
  const bookOwnerId = bookData.ownerId;
  const bookTitle = bookData.title;

  if (postData.userId !== bookOwnerId) {
    const userToNotifyRef = admin.firestore().collection("users").doc(bookOwnerId);
    const userToNotifySnap = await userToNotifyRef.get();
    const userToNotifyToken = userToNotifySnap.data().fcmToken;

    if (userToNotifyToken) {
      const message = {
        notification: {
          title: "Nuevo comentario en tu libro",
          body: `Alguien ha comentado en tu libro: ${bookTitle}`,
        },
        webpush: {
          fcm_options: {
            link: `https://free.deft.work/${bookWebId}`
          }
        },
        token: userToNotifyToken,
      };

      functions.logger.log(`Sending notification to ${bookOwnerId}`, { message: message, structuredData: true });
      try {
        const response = await admin.messaging().send(message);
        functions.logger.log("Successfully sent message:", { response: response, structuredData: true });
      } catch (error) {
        functions.logger.error("Error sending message:", {
          message: error.message,
          code: error.code,
          stack: error.stack,
        }, { structuredData: true });
      }
    } else {
      functions.logger.warn(`No FCM token for user ${bookOwnerId}.`, { structuredData: true });
    }
  }
});

exports.testFCMNotification = onRequest({
  region: "europe-west1"
}, async (req, res) => {
  const testToken = "cBrwNSC4i87xcZoImwKgjY:APA91bFS54NQxCxzw3g0EFgtcbO9w9EZeYbixJjfNfD0f9kBAxDzLS6Zpd6pbUa2Qa-WhGha7nbRLldtO59-_wSk-V1Hl8bqDPgntk-0F31keVI5GEfEue0";

  const message = {
    notification: {
      title: "Prueba de Notificación (Moderno)",
      body: "¡Esta es una notificación de prueba desde la función con la API moderna!",
    },
    token: testToken,
  };

  functions.logger.log("Attempting to send test notification (modern API).", { structuredData: true });

  try {
    const response = await admin.messaging().send(message);
    functions.logger.log("Test notification sent successfully:", { response: response, structuredData: true });
    res.status(200).send("Test notification sent successfully!");
  } catch (error) {
    functions.logger.error("Error sending test notification:", {
      message: error.message,
      code: error.code,
      stack: error.stack,
    }, { structuredData: true });
    res.status(500).send(`Error sending test notification: ${error.message}`);
  }
});

exports.searchYouTube = onRequest({region: "europe-west1"}, (req, res) => {
  cors(req, res, async () => {
    functions.logger.log("Received search request", {query: req.query});

    const query = req.query.q;
    if (!query) {
      functions.logger.error("Search query is missing.");
      res.status(400).send("Search query parameter 'q' is required.");
      return;
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      functions.logger.error("YouTube API key is not configured.");
      res.status(500).send("API key is not configured on the server.");
      return;
    }

    const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3/search";
    const options = {
      part: "snippet",
      q: query,
      key: apiKey,
      maxResults: 10,
      type: "video",
    };

    try {
      const response = await axios.get(YOUTUBE_API_URL, { params: options });
      const results = response.data.items.map((item) => ({
        youtubeId: item.id.videoId,
        title: item.snippet.title,
        description: item.snippet.description,
        thumbnailUrl: item.snippet.thumbnails.default.url,
        channelTitle: item.snippet.channelTitle,
        publishedAt: item.snippet.publishedAt,
      }));
      
      functions.logger.log(`Found ${results.length} results for query: "${query}"`);
      res.status(200).json(results);

    } catch (error) {
      functions.logger.error("Error searching YouTube:", {
        message: error.message,
        response: error.response ? error.response.data : null,
      });
      res.status(500).send("An error occurred while searching YouTube.");
    }
  });
});

/**
 * Agente Acción: Puente Seguro para Ciudadanos Sintéticos
 */
exports.agentAction = onRequest({ region: "europe-west1", cors: true }, async (req, res) => {
  functions.logger.log("Bridge Triggered:", { 
    headers: req.headers,
    bodyType: typeof req.body,
    action: req.body?.action
  });

  const { token, action, payload } = req.body;

  if (!token || !action) {
    res.status(400).json({ error: "Token y acción son obligatorios." });
    return;
  }

  try {
    // 1. Verificar Token (Hash SHA-256)
    const crypto = require("crypto");
    const hashHex = crypto.createHash("sha256").update(token).digest("hex");
    const keyDoc = await admin.firestore().collection("embassy_keys").doc(hashHex).get();

    if (!keyDoc.exists || keyDoc.data().status !== "active") {
      res.status(401).json({ error: "Embassy Key inválida o revocada." });
      return;
    }

    const agentData = keyDoc.data();
    const db = admin.firestore();

    // 2. Ejecutar Acción Solicitada
    switch (action) {
      case "activate":
        await db.collection("agent_logs").add({
          agentId: agentData.agentId,
          action: "activation",
          details: "Agente sincronizado mediante el Nexo Bridge (V2).",
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: "info"
        });
        res.status(200).json({ success: true, agentId: agentData.agentId });
        break;

      case "shareContent":
        const { collection: collName, data: contentData } = payload;
        const validCollections = ["books", "videos", "movies", "webs", "music", "videojuegos"];
        
        if (!collName || !validCollections.includes(collName)) {
          res.status(400).json({ error: "Colección no válida o ausente." });
          return;
        }

        // 3. Preparar Metadatos para el Frontend (Crítico para visibilidad)
        let shortName;
        if (collName === "webs") shortName = "discovery";
        else if (collName === "videojuegos") shortName = "game";
        else shortName = collName.slice(0, -1);

        const uniqueId = shortName + "_" + Date.now();
        
        // Generar webId único para colecciones que lo requieren para navegación interna
        const generateWebId = () => {
          const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
          let res = "";
          for (let i = 0; i < 5; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
          return res;
        };

        const finalData = {
          ...contentData,
          ownerId: agentData.agentId, // El agente es el propietario canónico
          agentId: agentData.agentId,
          ownerName: "Cultura Sintética (Athena)",
          mentorId: agentData.mentorId,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          isSynthetic: true,
          views: 0,
          order: -100 // Valor muy bajo para aparecer al principio de la lista
        };

        // Autogenerar miniaturas para YouTube si faltan
        if (contentData.youtubeId && !contentData.thumbnailUrl) {
          finalData.thumbnailUrl = `https://i.ytimg.com/vi/${contentData.youtubeId}/hqdefault.jpg`;
        }

        if (collName === "webs" || collName === "books") {
          finalData.webId = generateWebId();
          if (collName === "books") finalData.status = "Disponible";
        }

        const docId = (collName === "webs") ? "web_" + uniqueId : uniqueId;
        await db.collection(collName).doc(docId).set(finalData);

        await db.collection("agent_logs").add({
          agentId: agentData.agentId,
          action: "curation_share",
          details: `Contenido compartido en ${collName}: ${finalData.title || finalData.name || uniqueId}`,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: "info"
        });
        res.status(200).json({ success: true, id: docId, webId: finalData.webId });
        break;

      case "shareDiscovery": // Alias para retrocompatibilidad simple
        res.status(200).json({ 
          warning: "Acción obsoleta. Usa 'shareContent'.",
          success: false,
          error: "Usa el nuevo método shareContent para mayor compatibilidad."
        });
        break;

      case "log":
        await db.collection("agent_logs").add({
          agentId: agentData.agentId,
          action: payload.action || "log",
          details: payload.details,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
          type: payload.type || "info"
        });
        res.status(200).json({ success: true });
        break;

      default:
        res.status(400).json({ error: "Acción no reconocida." });
    }
  } catch (error) {
    functions.logger.error("Fallo en el Nexo Bridge:", error);
    res.status(500).json({ error: "Fallo interno en el puente." });
  }
});