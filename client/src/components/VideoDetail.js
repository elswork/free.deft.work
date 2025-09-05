import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, addDoc, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrashAlt } from '@fortawesome/free-solid-svg-icons';

function VideoDetail({ db, auth }) {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forumEntries, setForumEntries] = useState([]);
  const [newEntryText, setNewEntryText] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerFollowersCount, setOwnerFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

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
    const fetchVideo = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'videos', videoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const videoData = docSnap.data();
          setVideo(videoData);

          if (videoData.ownerId) {
            const ownerRef = doc(db, "users", videoData.ownerId);
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
                  setIsFollowing(following.includes(videoData.ownerId));
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
          setError("Video no encontrado.");
        }
      } catch (err) {
        console.error("Error fetching video:", err);
        setError("Error al cargar el video.");
      } finally {
        setLoading(false);
      }
    };

    if (videoId) {
      fetchVideo();
    }
  }, [videoId, db, auth.currentUser]);

  useEffect(() => {
    if (videoId) {
      const q = query(
        collection(db, "forumEntries"),
        where("contentId", "==", videoId),
        where("contentType", "==", "video"),
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
  }, [videoId, db]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntryText.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "forumEntries"), {
        contentId: videoId,
        contentType: "video",
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        text: newEntryText,
        timestamp: serverTimestamp(),
        contentOwnerId: video.ownerId, // Añadir el ID del propietario del contenido
      });

      // Send notification to content owner
      if (video.ownerId !== auth.currentUser.uid) {
        const userRef = doc(db, "users", video.ownerId);
        await updateDoc(userRef, {
            notifications: arrayUnion({
                commenterId: auth.currentUser.uid,
                commenterName: auth.currentUser.displayName || auth.currentUser.email,
                contentTitle: video.title,
                contentId: videoId,
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
    if (!auth.currentUser || !video || !video.ownerId) return;
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const ownerRef = doc(db, "users", video.ownerId);

      await updateDoc(currentUserRef, {
        following: arrayUnion(video.ownerId)
      });
      await updateDoc(ownerRef, {
        followers: arrayUnion(auth.currentUser.uid),
        followersCount: increment(1)
      });
      setIsFollowing(true);
      setOwnerFollowersCount(prev => prev + 1);

      // Create notification for the followed user
      const userRef = doc(db, "users", video.ownerId);
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
    if (!auth.currentUser || !video || !video.ownerId) return;
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const ownerRef = doc(db, "users", video.ownerId);

      await updateDoc(currentUserRef, {
        following: arrayRemove(video.ownerId)
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
    if (auth.currentUser.uid === commentUserId || (video && auth.currentUser.uid === video.ownerId)) {
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

  if (loading) {
    return <div className="text-center mt-5">Cargando video...</div>;
  }

  if (error) {
    return <div className="alert alert-danger mt-5">{error}</div>;
  }

  if (!video) {
    return <div className="text-center mt-5">Video no encontrado.</div>;
  }

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow-sm mb-4">
        <h2 className="card-title text-center mb-4">{video.title}</h2>
        <div className="ratio ratio-16x9 mb-4">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            title={video.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          ></iframe>
        </div>
        <h5 className="text-muted mb-3">{video.channelTitle}</h5>
        <p>{video.description}</p>
        <p className="card-text"><strong>Visitas:</strong> {video.views || 0}</p>
        {video.ownerId && (
          <p className="card-text">
            <strong>Propietario:</strong>
            <Link to={`/profile/${video.ownerId}`} className="btn btn-sm btn-info ms-2">
              {ownerName || 'Desconocido'} ({ownerFollowersCount} seguidores)
            </Link>
            {auth.currentUser && auth.currentUser.uid !== video.ownerId && (
              isFollowing ? (
                <button className="btn btn-sm btn-outline-secondary ms-2" onClick={handleUnfollow}>Dejar de Seguir</button>
              ) : (
                <button className="btn btn-sm btn-primary ms-2" onClick={handleFollow}>Seguir</button>
              )
            )}
          </p>
        )}
      </div>

      <div className="card p-4 shadow-sm">
        <h3 className="mb-3">Foro del Video</h3>
        <div className="forum-entries mb-4" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
          {forumEntries.length === 0 ? (
            <p>No hay entradas en el foro todavía.</p>
          ) : (
            forumEntries.map((entry) => (
              <div key={entry.id} className="mb-2 pb-2 border-bottom">
                <p className="mb-0"><strong>{video.ownerId === entry.userId && <span className="badge bg-info">Propietario</span>} {entry.userName}</strong> ({entry.timestamp?.toDate().toLocaleString()}):</p>
                <p className="mb-0">{renderTextWithLinks(entry.text)}</p>
                {auth.currentUser && (auth.currentUser.uid === entry.userId || (video && auth.currentUser.uid === video.ownerId)) && (
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

export default VideoDetail;