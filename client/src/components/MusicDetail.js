import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, addDoc, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrashAlt, faSave } from '@fortawesome/free-solid-svg-icons';

function MusicDetail({ db, auth }) {
  const { musicId } = useParams();
  const [clip, setClip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forumEntries, setForumEntries] = useState([]);
  const [newEntryText, setNewEntryText] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerFollowersCount, setOwnerFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isTopContent, setIsTopContent] = useState(false);
  const [topOrder, setTopOrder] = useState('');

  // Función para renderizar texto con enlaces clicables
  const renderTextWithLinks = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.split(urlRegex).map((part, index) => {
      if (part.match(urlRegex)) {
        return <a key={index} href={part} target="_blank" rel="noopener noreferrer">{part}</a>;
      }
      return part;
    });
  };

  useEffect(() => {
    const fetchClip = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'music', musicId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const clipData = docSnap.data();
          setClip(clipData);
          setIsTopContent(clipData.isTopContent || false);
          setTopOrder(clipData.topOrder || '');

          if (clipData.ownerId) {
            const ownerRef = doc(db, "users", clipData.ownerId);
            const ownerSnap = await getDoc(ownerRef);
            if (ownerSnap.exists()) {
              setOwnerName(ownerSnap.data().username);
              setOwnerFollowersCount(ownerSnap.data().followers?.length || 0);
              // Check if current user is following the owner
              if (auth.currentUser) {
                const currentUserRef = doc(db, "users", auth.currentUser.uid);
                const currentUserSnap = await getDoc(currentUserRef);
                if (currentUserSnap.exists()) {
                  const following = currentUserSnap.data().following || [];
                  setIsFollowing(following.includes(clipData.ownerId));
                }
              }
            }
          }

          // Increment view count only if user is authenticated
          if (auth.currentUser) {
            await updateDoc(docRef, {
              views: increment(1)
            });
          }

        } else {
          setError("Videoclip no encontrado.");
        }
      } catch (err) {
        console.error("Error fetching music clip:", err);
        setError("Error al cargar el videoclip.");
      } finally {
        setLoading(false);
      }
    };

    if (musicId) {
      fetchClip();
    }
  }, [musicId, db, auth.currentUser]);

  useEffect(() => {
    if (musicId) {
      const q = query(
        collection(db, "forumEntries"),
        where("contentId", "==", musicId),
        where("contentType", "==", "music"),
        orderBy("timestamp", "asc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setForumEntries(entries);
      });
      return () => unsubscribe();
    }
  }, [musicId, db]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntryText.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "forumEntries"), {
        contentId: musicId,
        contentType: "music",
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        text: newEntryText,
        timestamp: serverTimestamp(),
        contentOwnerId: clip.ownerId, // Añadir el ID del propietario del contenido
      });

      // Send notification to content owner
      if (clip.ownerId !== auth.currentUser.uid) {
        const userRef = doc(db, "users", clip.ownerId);
        await updateDoc(userRef, {
            notifications: arrayUnion({
                commenterId: auth.currentUser.uid,
                commenterName: auth.currentUser.displayName || auth.currentUser.email,
                contentTitle: clip.title,
                contentId: musicId,
                timestamp: new Date(),
                read: false,
                type: 'comment'
            })
        });
      }

      setNewEntryText('');
    } catch (error) {
      console.error("Error adding forum entry:", error);
    }
  };

  const handleFollow = async () => {
    if (!auth.currentUser || !clip || !clip.ownerId) return;
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const ownerRef = doc(db, "users", clip.ownerId);

      await updateDoc(currentUserRef, {
        following: arrayUnion(clip.ownerId)
      });
      await updateDoc(ownerRef, {
        followers: arrayUnion(auth.currentUser.uid),
        followersCount: increment(1)
      });
      setIsFollowing(true);
      setOwnerFollowersCount(prev => prev + 1);

      // Create notification for the followed user
      const userRef = doc(db, "users", clip.ownerId);
      await updateDoc(userRef, {
          notifications: arrayUnion({
              followerId: auth.currentUser.uid,
              followerName: auth.currentUser.displayName || auth.currentUser.email,
              timestamp: new Date(),
              read: false,
              type: 'follow'
          })
      });

      alert(`Ahora sigues a ${ownerName}.`);
    } catch (error) {
      console.error("Error following user:", error);
      alert("Error al seguir al usuario.");
    }
  };

  const handleUnfollow = async () => {
    if (!auth.currentUser || !clip || !clip.ownerId) return;
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const ownerRef = doc(db, "users", clip.ownerId);

      await updateDoc(currentUserRef, {
        following: arrayRemove(clip.ownerId)
      });
      await updateDoc(ownerRef, {
        followers: arrayRemove(auth.currentUser.uid),
        followersCount: increment(-1)
      });
      setIsFollowing(false);
      setOwnerFollowersCount(prev => prev - 1);

      alert(`Has dejado de seguir a ${ownerName}.`);
    } catch (error) {
      console.error("Error unfollowing user:", error);
      console.error("Detailed error:", error);
      alert("Error al dejar de seguir al usuario.");
    }
  };

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (!auth.currentUser) return;

    // Solo el autor del comentario o el propietario del contenido pueden eliminarlo
    if (auth.currentUser.uid === commentUserId || (clip && auth.currentUser.uid === clip.ownerId)) {
      if (window.confirm("¿Estás seguro de que quieres eliminar este comentario?")) {
        try {
          await deleteDoc(doc(db, "forumEntries", commentId));
        } catch (error) {
          console.error("Error eliminando comentario:", error);
        }
      }
    } else {
      alert("No tienes permiso para eliminar este comentario.");
    }
  };

  const handleUpdateTopContent = async () => {
    if (!auth.currentUser || !clip || auth.currentUser.uid !== clip.ownerId) return;

    try {
      const clipRef = doc(db, "music", clip.id);
      await updateDoc(clipRef, {
        isTopContent: isTopContent,
        topOrder: isTopContent ? (Number(topOrder) || 9999) : null // Set to null if not top content
      });
      alert("Contenido top actualizado.");
    } catch (error) {
      console.error("Error actualizando contenido top:", error);
      alert("Error al actualizar contenido top.");
    }
  };

  if (loading) {
    return <div className="text-center mt-5">Cargando videoclip...</div>;
  }

  if (error) {
    return <div className="alert alert-danger mt-5">{error}</div>;
  }

  if (!clip) {
    return <div className="text-center mt-5">Videoclip no encontrado.</div>;
  }

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow-sm mb-4">
        <h2 className="card-title text-center mb-4">{clip.title}</h2>
        <div className="ratio ratio-16x9 mb-4">
          <iframe
            src={`https://www.youtube.com/embed/${clip.youtubeId}`}
            title={clip.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <h5 className="text-muted mb-3">{clip.channelTitle}</h5>
        <p>{clip.description}</p>
        <p className="card-text"><strong>Visitas:</strong> {clip.views || 0}</p>
        {clip.ownerId && (
          <p className="card-text">
            <strong>Propietario:</strong>
            <Link to={`/profile/${clip.ownerId}`} className="btn btn-sm btn-info ms-2">
              {ownerName || 'Desconocido'} ({ownerFollowersCount} seguidores)
            </Link>
            {auth.currentUser && auth.currentUser.uid !== clip.ownerId && (
              isFollowing ? (
                <button className="btn btn-sm btn-outline-secondary ms-2" onClick={handleUnfollow}>Dejar de Seguir</button>
              ) : (
                <button className="btn btn-sm btn-primary ms-2" onClick={handleFollow}>Seguir</button>
              )
            )}
          </p>
        )}

        {auth.currentUser && clip.ownerId === auth.currentUser.uid && (
          <div className="mt-3 p-3 border rounded bg-light">
            <h4>Configuración de Contenido Top</h4>
            <div className="form-check mb-2">
              <input
                className="form-check-input"
                type="checkbox"
                id="isTopContentCheck"
                checked={isTopContent}
                onChange={(e) => setIsTopContent(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="isTopContentCheck">
                Marcar como Contenido Top
              </label>
            </div>
            {isTopContent && (
              <div className="mb-3">
                <label htmlFor="topOrderInput" className="form-label">Orden en el Top Ranking:</label>
                <input
                  type="number"
                  className="form-control"
                  id="topOrderInput"
                  value={topOrder}
                  onChange={(e) => setTopOrder(e.target.value)}
                  placeholder="Ej: 1, 2, 3..."
                />
              </div>
            )}
            <button className="btn btn-success" onClick={handleUpdateTopContent}>
              <FontAwesomeIcon icon={faSave} /> Guardar Configuración Top
            </button>
          </div>
        )}
      </div>

      <div className="card p-4 shadow-sm">
        <h3 className="mb-3">Foro del Videoclip</h3>
        <div className="forum-entries mb-4" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
          {forumEntries.length === 0 ? (
            <p>No hay entradas en el foro todavía.</p>
          ) : (
            forumEntries.map((entry) => (
              <div key={entry.id} className="mb-2 pb-2 border-bottom">
                <p className="mb-0"><strong>{clip.ownerId === entry.userId && <span className="badge bg-info">Propietario</span>} {entry.userName}</strong> ({entry.timestamp?.toDate().toLocaleString()}):</p>
                <p className="mb-0">{renderTextWithLinks(entry.text)}</p>
                {auth.currentUser && (auth.currentUser.uid === entry.userId || (clip && auth.currentUser.uid === clip.ownerId)) && (
                  <button className="btn btn-danger btn-sm mt-1" onClick={() => handleDeleteComment(entry.id, entry.userId)}><FontAwesomeIcon icon={faTrashAlt} /> Eliminar</button>
                )}
              </div>
            ))
          )}
        </div>

        {auth.currentUser ? (
          <form onSubmit={handleAddEntry}>
            <div className="mb-3">
              <textarea
                className="form-control"
                rows="3"
                placeholder="Escribe tu entrada en el foro..."
                value={newEntryText}
                onChange={(e) => setNewEntryText(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary"><FontAwesomeIcon icon={faPaperPlane} /> Enviar Entrada</button>
          </form>
        ) : (
          <p className="text-center">Inicia sesión para participar en el foro.</p>
        )}
      </div>
    </div>
  );
}

export default MusicDetail;
