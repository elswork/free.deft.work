const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors")({origin: true});

admin.initializeApp();

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