import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, addDoc, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrashAlt, faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';

function MusicDetail({ db, auth }) {
  const { musicId } = useParams();
  const [clip, setClip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [legacyReviews, setLegacyReviews] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
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
    const fetchClip = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'music', musicId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const clipData = docSnap.data();
          setClip(clipData);

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
      // Listener para reseñas nuevas
      const qNew = query(
        collection(db, "reviews"),
        where("itemId", "==", musicId),
        where("itemType", "==", "music"),
        orderBy("timestamp", "asc")
      );
      const unsubscribeNew = onSnapshot(qNew, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReviews(entries);
      });

      // Listener para comentarios antiguos (forumEntries)
      const qLegacy = query(
        collection(db, "forumEntries"),
        where("contentId", "==", musicId),
        where("contentType", "==", "music"),
        orderBy("timestamp", "asc")
      );
      const unsubscribeLegacy = onSnapshot(qLegacy, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          comment: doc.data().text || doc.data().comment,
          rating: doc.data().rating || 5,
          isLegacy: true
        }));
        setLegacyReviews(entries);
      });

      return () => {
        unsubscribeNew();
        unsubscribeLegacy();
      };
    }
  }, [musicId, db]);

  // Unificar y ordenar reseñas
  const allReviews = [...reviews, ...legacyReviews].sort((a, b) => {
    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp instanceof Date ? a.timestamp.getTime() : 0);
    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp instanceof Date ? b.timestamp.getTime() : 0);
    return timeA - timeB;
  });

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "reviews"), {
        itemId: musicId,
        itemType: "music",
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        rating: newRating,
        comment: newReviewText,
        timestamp: serverTimestamp(),
        itemOwnerId: clip.ownerId, // Añadir el ID del propietario del contenido
      });

      // Send notification to content owner
      if (clip.ownerId !== auth.currentUser.uid) {
        const userRef = doc(db, "users", clip.ownerId);
        await updateDoc(userRef, {
            notifications: arrayUnion({
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || auth.currentUser.email,
                itemTitle: clip.title,
                itemId: musicId,
                timestamp: new Date(),
                read: false,
                type: 'review'
            })
        });
      }

      setNewReviewText('');
      setNewRating(5);
    } catch (error) {
      console.error("Error adding review:", error);
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

  const handleDeleteReview = async (reviewId, reviewUserId, isLegacy) => {
    if (!auth.currentUser) return;
    const collectionName = isLegacy ? "forumEntries" : "reviews";

    // Solo el autor de la reseña o el propietario del contenido pueden eliminarlar
    if (auth.currentUser.uid === reviewUserId || (clip && auth.currentUser.uid === clip.ownerId)) {
      if (window.confirm("¿Estás seguro de que quieres eliminar esta reseña?")) {
        try {
          await deleteDoc(doc(db, collectionName, reviewId));
        } catch (error) {
          console.error("Error eliminando reseña:", error);
        }
      }
    } else {
      alert("No tienes permiso para eliminar esta reseña.");
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
      </div>

      <div className="card p-4 shadow-sm">
        <h3 className="mb-3">Reseñas del Videoclip</h3>
        <div className="reviews-list mb-4" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.5)' }}>
          {allReviews.length === 0 ? (
            <p className="text-muted text-center py-4">No hay reseñas todavía. ¡Sé el primero en opinar!</p>
          ) : (
            allReviews.map((review) => (
              <div key={review.id} className="mb-4 pb-3 border-bottom position-relative">
                <div className="d-flex justify-content-between align-items-center">
                  <p className="mb-1">
                    <strong>{clip.ownerId === review.userId && <span className="badge bg-primary me-2">Propietario</span>} {review.userName}</strong> 
                    {review.isLegacy && <span className="badge bg-secondary ms-2" title="Comentario del sistema anterior">Histórico</span>}
                    {(review.userId === 'arquimedes_ceo' || review.userId === 'athena_ai' || review.isSynthetic) && <span className="badge bg-info ms-2">Agente IA</span>}
                    <span className="text-muted ms-2" style={{ fontSize: '0.85em' }}>
                      {review.timestamp?.toDate ? review.timestamp.toDate().toLocaleString() : 'Reciente'}
                    </span>
                  </p>
                  <div className="text-warning">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <FontAwesomeIcon key={star} icon={star <= review.rating ? faStarSolid : faStarRegular} />
                    ))}
                  </div>
                </div>
                <p className="mb-0 mt-2 text-secondary" style={{ lineHeight: '1.5' }}>{renderTextWithLinks(review.comment)}</p>
                {auth.currentUser && (auth.currentUser.uid === review.userId || (clip && auth.currentUser.uid === clip.ownerId)) && (
                  <button className="btn btn-link text-danger btn-sm p-0 mt-2" onClick={() => handleDeleteReview(review.id, review.userId, review.isLegacy)}>
                    <FontAwesomeIcon icon={faTrashAlt} /> Eliminar
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {auth.currentUser ? (
          <form onSubmit={handleAddReview}>
            <div className="mb-3">
              <label className="form-label font-weight-bold">Tu Calificación:</label>
              <div className="mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <FontAwesomeIcon
                    key={star}
                    icon={star <= newRating ? faStarSolid : faStarRegular}
                    className="text-warning me-1"
                    style={{ cursor: 'pointer', fontSize: '1.5em' }}
                    onClick={() => setNewRating(star)}
                  />
                ))}
              </div>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Escribe tu reseña..."
                value={newReviewText}
                onChange={(e) => setNewReviewText(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-primary"><FontAwesomeIcon icon={faPaperPlane} /> Publicar Reseña</button>
          </form>
        ) : (
          <p className="text-center text-muted">Inicia sesión para escribir una reseña.</p>
        )}
      </div>
    </div>
  );
}

export default MusicDetail;