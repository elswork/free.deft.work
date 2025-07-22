import React, { useState, useEffect, useRef } from 'react';
import { collection, addDoc, query, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

function Chat({ book, onCloseChat, auth, db }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);

  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;
  const otherUserId = book.ownerId;

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    // Generate a deterministic chat ID based on participant UIDs and book ID
    // This ensures both users arrive at the same chat document ID
    const participantIds = [currentUserId, otherUserId].sort();
    const generatedChatId = `${participantIds[0]}_${participantIds[1]}_${book.id}`;
    setChatId(generatedChatId);

    const chatDocRef = doc(db, "chats", generatedChatId);

    const checkAndCreateChat = async () => {
      const docSnap = await getDoc(chatDocRef);
      if (!docSnap.exists()) {
        await setDoc(chatDocRef, {
          participants: participantIds,
          bookId: book.id,
          createdAt: new Date(),
          lastMessageAt: new Date(),
        });
      }
    };

    checkAndCreateChat();

  }, [currentUserId, otherUserId, book.id, db]);

  useEffect(() => {
    if (chatId) {
      const messagesQuery = query(collection(db, "chats", chatId, "messages"), orderBy("timestamp"));
      const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
        const msgs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMessages(msgs);
      });
      return () => unsubscribeMessages();
    }
  }, [chatId, db]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !chatId || !currentUserId) return;

    try {
      await addDoc(collection(db, "chats", chatId, "messages"), {
        senderId: currentUserId,
        text: newMessage,
        timestamp: new Date(),
      });
      await updateDoc(doc(db, "chats", chatId), {
        lastMessageAt: new Date(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  return (
    <div className="card mt-4 p-4 shadow-sm">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="card-title mb-0">Chat sobre: {book.title}</h2>
        <button className="btn btn-sm btn-outline-secondary" onClick={onCloseChat}>Cerrar Chat</button>
      </div>
      <div className="chat-messages" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
        {messages.map((msg) => (
          <div key={msg.id} className={`d-flex mb-2 ${msg.senderId === currentUserId ? 'justify-content-end' : 'justify-content-start'}`}>
            <div className={`p-2 rounded ${msg.senderId === currentUserId ? 'bg-primary text-white' : 'bg-light'}`}>
              <strong>{msg.senderId === currentUserId ? 'Tú' : 'Propietario'}:</strong> {msg.text}
              <div className="text-muted small" style={{ fontSize: '0.75em' }}>{new Date(msg.timestamp.toDate()).toLocaleString()}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="mt-3 d-flex">
        <input
          type="text"
          className="form-control me-2"
          placeholder="Escribe tu mensaje..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <button type="submit" className="btn btn-primary">Enviar</button>
      </form>
    </div>
  );
}

export default Chat;