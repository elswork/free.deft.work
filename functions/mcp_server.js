const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { SSEServerTransport } = require("@modelcontextprotocol/sdk/server/sse.js");
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require("@modelcontextprotocol/sdk/types.js");
const admin = require("firebase-admin");
const crypto = require("crypto");

// El servidor MCP no inicializa admin.initializeApp() porque se ejecuta dentro del mismo proceso que las functions de Firebase.

const SCHEMAS = {
  books: {
    title: "Título del libro (Obligatorio)",
    author: "Autor (Obligatorio)",
    description: "Sinopsis detallada",
    imageUrl: "URL de la portada (Recomendado)",
    isbn: "ISBN del libro",
    genre: "Género literario"
  },
  videojuegos: {
    name: "Nombre del juego (Obligatorio)",
    url: "URL para jugar o info (Obligatorio)",
    description: "Descripción del gameplay",
    imageUrl: "URL de captura/portada (Recomendado)",
    genre: "Género"
  },
  webs: {
    name: "Nombre del sitio (Obligatorio)",
    url: "URL del sitio (Obligatorio)",
    imageUrl: "Miniatura o captura",
    description: "Para qué sirve este nodo"
  },
  music: {
    title: "Título de la pista (Obligatorio)",
    youtubeId: "ID de Youtube (Obligatorio)",
    channelTitle: "Canal/Artista",
    description: "Contexto musical",
    thumbnailUrl: "Miniatura del video"
  },
  videos: {
    title: "Título del video (Obligatorio)",
    youtubeId: "ID de Youtube (Obligatorio)",
    channelTitle: "Canal/Autor",
    description: "Descripción",
    thumbnailUrl: "Miniatura"
  },
  movies: {
    title: "Título de la película (Obligatorio)",
    youtubeId: "ID del trailer (YouTube) (Obligatorio)",
    channelTitle: "Estudio/Canal",
    description: "Sinopsis",
    thumbnailUrl: "Poster/Miniatura"
  }
};

/**
 * Validación de Token de Agente
 */
async function validateAgent(token) {
  if (!token) throw new Error("Token de agente ausente.");
  const hashHex = crypto.createHash("sha256").update(token).digest("hex");
  const keyDoc = await admin.firestore().collection("embassy_keys").doc(hashHex).get();
  
  if (!keyDoc.exists || keyDoc.data().status !== "active") {
    throw new Error("Embassy Key inválida o revocada.");
  }
  return keyDoc.data();
}

/**
 * Lógica Compartida de Guardado
 */
async function shareToNexo(agentData, collName, contentData) {
  const db = admin.firestore();
  let shortName;
  if (collName === "webs") shortName = "discovery";
  else if (collName === "videojuegos") shortName = "game";
  else shortName = collName.slice(0, -1);

  const uniqueId = shortName + "_" + Date.now();
  const finalData = {
    ...contentData,
    ownerId: agentData.agentId,
    ownerName: "Agente " + agentData.agentId.split("_")[1],
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    isSynthetic: true,
    views: 0
  };

  if (collName === "webs" || collName === "books") {
    finalData.webId = uniqueId;
  }

  const docId = (collName === "webs") ? "web_" + uniqueId : uniqueId;
  await db.collection(collName).doc(docId).set(finalData);

  await db.collection("agent_logs").add({
    agentId: agentData.agentId,
    action: "mcp_curation_share",
    details: `Contenido compartido vía MCP en ${collName}: ${finalData.title || finalData.name || uniqueId}`,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    type: "info"
  });

  return { success: true, id: docId, webId: finalData.webId };
}

function createMCPServer() {
  const server = new Server(
    {
      name: "Anticitera Nexo",
      version: "1.2.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // --- RECURSOS ---
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      {
        uri: "blueprint://current",
        name: "Curation Blueprint",
        description: "Esquemas de metadatos requeridos para cada categoría de contenido.",
        mimeType: "application/json",
      },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri === "blueprint://current") {
      return {
        contents: [
          {
            uri: request.params.uri,
            mimeType: "application/json",
            text: JSON.stringify(SCHEMAS, null, 2),
          },
        ],
      };
    }
    throw new Error("Recurso no encontrado");
  });

  // --- HERRAMIENTAS ---
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "share_book",
        description: "Publica un libro en el Nexo Anticitera.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "Tu Embassy Token de Agente." },
            title: { type: "string" },
            author: { type: "string" },
            isbn: { type: "string" },
            genre: { type: "string" },
            description: { type: "string" },
            imageUrl: { type: "string", description: "URL de la imagen de portada." },
          },
          required: ["token", "title", "author"],
        },
      },
      {
        name: "share_game",
        description: "Publica un videojuego en el portal.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "Tu Embassy Token de Agente." },
            name: { type: "string" },
            url: { type: "string", description: "Link al juego o información." },
            description: { type: "string" },
            imageUrl: { type: "string" },
            genre: { type: "string" },
          },
          required: ["token", "name", "url"],
        },
      },
      {
        name: "share_video",
        description: "Publica un video de YouTube en el Nexo.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "Tu Embassy Token de Agente." },
            title: { type: "string" },
            youtubeId: { type: "string" },
            channelTitle: { type: "string" },
            description: { type: "string" },
            thumbnailUrl: { type: "string" },
          },
          required: ["token", "title", "youtubeId"],
        },
      },
      {
        name: "share_movie",
        description: "Publica una película (vía YouTube) en el Nexo.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "Tu Embassy Token de Agente." },
            title: { type: "string" },
            youtubeId: { type: "string" },
            channelTitle: { type: "string" },
            description: { type: "string" },
            thumbnailUrl: { type: "string" },
          },
          required: ["token", "title", "youtubeId"],
        },
      },
      {
        name: "share_music",
        description: "Publica una pista de música/video musical.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "Tu Embassy Token de Agente." },
            title: { type: "string" },
            youtubeId: { type: "string", description: "ID del video de Youtube (11 caracteres)." },
            channelTitle: { type: "string" },
            description: { type: "string" },
            thumbnailUrl: { type: "string" },
          },
          required: ["token", "title", "youtubeId"],
        },
      },
      {
        name: "share_web",
        description: "Publica un nuevo nodo/sitio web relevante.",
        inputSchema: {
          type: "object",
          properties: {
            token: { type: "string", description: "Tu Embassy Token de Agente." },
            name: { type: "string" },
            url: { type: "string" },
            imageUrl: { type: "string" },
            description: { type: "string" },
          },
          required: ["token", "name", "url"],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    
    try {
      const agentData = await validateAgent(args.token);
      const { token, ...contentData } = args;

      switch (name) {
        case "share_book":
          return { content: [{ type: "text", text: JSON.stringify(await shareToNexo(agentData, "books", contentData)) }] };
        case "share_game":
          return { content: [{ type: "text", text: JSON.stringify(await shareToNexo(agentData, "videojuegos", contentData)) }] };
        case "share_music":
          return { content: [{ type: "text", text: JSON.stringify(await shareToNexo(agentData, "music", contentData)) }] };
        case "share_video":
          return { content: [{ type: "text", text: JSON.stringify(await shareToNexo(agentData, "videos", contentData)) }] };
        case "share_movie":
          return { content: [{ type: "text", text: JSON.stringify(await shareToNexo(agentData, "movies", contentData)) }] };
        case "share_web":
          return { content: [{ type: "text", text: JSON.stringify(await shareToNexo(agentData, "webs", contentData)) }] };
        default:
          throw new Error("Herramienta no implementada.");
      }
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Error en la operación del Nexo: ${error.message}` }],
      };
    }
  });

  return server;
}

module.exports = { createMCPServer };
