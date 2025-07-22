# Estructura de Colecciones de Firestore

Este documento describe la estructura esperada de las colecciones en Firestore para el proyecto de préstamo de libros.

## Colección: `users`

Almacena la información de los usuarios registrados en la aplicación.

**Documento de ejemplo (`users/{userId}`):**

```json
{
  "username": "John Doe",
  "email": "john.doe@example.com",
  "profilePictureUrl": "https://example.com/path/to/profile.jpg",
  "location": "Madrid, Spain",
  "bio": "Amante de los libros y la lectura.",
  "createdAt": "Timestamp"
}
```

**Campos clave:**

*   `username` (string): Nombre de usuario visible.
*   `email` (string): Correo electrónico del usuario (único).
*   `profilePictureUrl` (string, opcional): URL de la foto de perfil del usuario.
*   `location` (string, opcional): Ubicación del usuario para facilitar búsquedas de libros cercanos.
*   `bio` (string, opcional): Una breve biografía del usuario.
*   `createdAt` (Timestamp): Fecha y hora de creación del usuario.

## Colección: `books`

Almacena la información detallada de cada libro disponible para préstamo.

**Documento de ejemplo (`books/{bookId}`):**

```json
{
  "title": "El Gran Gatsby",
  "author": "F. Scott Fitzgerald",
  "isbn": "978-0743273565",
  "genre": "Ficción, Clásico",
  "description": "Una novela que explora el sueño americano...",
  "ownerId": "{userId_del_propietario}",
  "status": "disponible", // o "en_prestamo"
  "imageUrl": "https://example.com/path/to/book_cover.jpg",
  "addedAt": "Timestamp"
}
```

**Campos clave:**

*   `title` (string): Título del libro.
*   `author` (string): Autor del libro.
*   `isbn` (string, opcional): Número ISBN del libro.
*   `genre` (string, opcional): Género o categoría del libro (puede ser una cadena con múltiples géneros separados por comas).
*   `description` (string, opcional): Descripción o sinopsis del libro.
*   `ownerId` (string): ID del usuario propietario del libro (referencia a `users/{userId}`).
*   `status` (string): Estado de disponibilidad del libro (`disponible`, `en_prestamo`).
*   `imageUrl` (string, opcional): URL de la imagen de la portada del libro.
*   `addedAt` (Timestamp): Fecha y hora en que el libro fue añadido.

## Colección: `chats`

Almacena los mensajes directos entre usuarios, posiblemente relacionados con solicitudes de préstamo.

**Documento de ejemplo (`chats/{chatId}`):**

```json
{
  "participants": ["{userId1}", "{userId2}"],
  "bookId": "{bookId_opcional}", // Opcional, si el chat está ligado a un libro específico
  "createdAt": "Timestamp",
  "lastMessageAt": "Timestamp"
}
```

**Subcolección: `messages` (dentro de cada documento de `chats`)**

**Documento de ejemplo (`chats/{chatId}/messages/{messageId}`):**

```json
{
  "senderId": "{userId_del_remitente}",
  "text": "Hola, ¿el libro sigue disponible?",
  "timestamp": "Timestamp"
}
```

**Campos clave (`chats`):**

*   `participants` (array de strings): IDs de los usuarios que participan en el chat.
*   `bookId` (string, opcional): ID del libro al que se refiere el chat.
*   `createdAt` (Timestamp): Fecha y hora de creación del chat.
*   `lastMessageAt` (Timestamp): Fecha y hora del último mensaje en el chat.

**Campos clave (`messages`):**

*   `senderId` (string): ID del usuario que envió el mensaje.
*   `text` (string): Contenido del mensaje.
*   `timestamp` (Timestamp): Fecha y hora en que se envió el mensaje.
