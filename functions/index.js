const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onDocumentUpdated, onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onRequest } = require("firebase-functions/v2/https");

admin.initializeApp();

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
