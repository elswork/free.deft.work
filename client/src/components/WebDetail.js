import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, addDoc, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrashAlt, faStar as faStarSolid, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';

function WebDetail({ db, auth }) {
  const { webId } = useParams();
  const [web, setWeb] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [legacyReviewsByWebId, setLegacyReviewsByWebId] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);

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
    const fetchWeb = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'webs', webId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWeb(docSnap.data());
        } else {
          setError("Web no encontrada.");
        }
      } catch (err) {
        console.error("Error fetching web:", err);
        setError("Error al cargar la web.");
      } finally {
        setLoading(false);
      }
    };

    if (webId) fetchWeb();
  }, [webId, db]);

  useEffect(() => {
    if (webId) {
      const qNew = query(
        collection(db, "reviews"),
        where("itemId", "==", webId),
        where("itemType", "==", "web"),
        orderBy("timestamp", "asc")
      );
      const unsubscribeNew = onSnapshot(qNew, (snapshot) => {
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });

      const qLegacy = query(
        collection(db, "forumEntries"),
        where("webId", "==", webId),
        orderBy("timestamp", "asc")
      );
      const unsubscribeLegacy = onSnapshot(qLegacy, (snapshot) => {
        setLegacyReviewsByWebId(snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          comment: doc.data().text || doc.data().comment,
          rating: 5,
          isLegacy: true
        })));
      });

      return () => { unsubscribeNew(); unsubscribeLegacy(); };
    }
  }, [webId, db]);

  const allReviews = [...reviews, ...legacyReviewsByWebId].sort((a, b) => {
    const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
    const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
    return timeA - timeB;
  });

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "reviews"), {
        itemId: webId,
        itemType: "web",
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        rating: newRating,
        comment: newReviewText,
        timestamp: serverTimestamp(),
        itemOwnerId: web.ownerId,
      });

      if (web.ownerId !== auth.currentUser.uid) {
        const userRef = doc(db, "users", web.ownerId);
        await updateDoc(userRef, {
            notifications: arrayUnion({
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || auth.currentUser.email,
                itemTitle: web.name,
                itemId: webId,
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

  const handleDeleteReview = async (reviewId, reviewUserId, isLegacy) => {
    const colName = isLegacy ? "forumEntries" : "reviews";
    if (auth.currentUser?.uid === reviewUserId || auth.currentUser?.uid === web.ownerId) {
      if (window.confirm("¿Eliminar reseña?")) {
        await deleteDoc(doc(db, colName, reviewId));
      }
    }
  };

  if (loading) return <div className="text-center mt-5">Cargando...</div>;
  if (error) return <div className="alert alert-danger mt-5">{error}</div>;

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow-sm mb-4">
        <h2 className="text-center mb-4">{web.name}</h2>
        {web.imageUrl && (
          <div className="text-center mb-4">
            <img src={web.imageUrl} alt={web.name} style={{ maxWidth: '100%', borderRadius: '15px', height: '300px', objectFit: 'cover' }} />
          </div>
        )}
        <p className="lead text-center"><a href={web.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary"><FontAwesomeIcon icon={faExternalLinkAlt} /> Visitar Sitio Web</a></p>
      </div>

      <div className="card p-4 shadow-sm">
        <h3 className="mb-3">Reseñas</h3>
        <div className="reviews-list mb-4" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.5)' }}>
          {allReviews.length === 0 ? <p className="text-muted text-center py-4">Sin reseñas.</p> : allReviews.map(review => (
            <div key={review.id} className="mb-4 pb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <p className="mb-1">
                  <strong>{review.userName}</strong> 
                  {review.isLegacy && <span className="badge bg-secondary ms-2">Histórico</span>}
                  {(review.userId === 'arquimedes_ceo' || review.userId === 'athena_ai' || review.isSynthetic) && <span className="badge bg-info ms-2">Agente IA</span>}
                </p>
                <div className="text-warning">
                  {[1,2,3,4,5].map(s => <FontAwesomeIcon key={s} icon={s <= review.rating ? faStarSolid : faStarRegular} />)}
                </div>
              </div>
              <p className="mb-0 mt-2 text-secondary">{renderTextWithLinks(review.comment)}</p>
              {(auth.currentUser?.uid === review.userId || auth.currentUser?.uid === web.ownerId) && (
                <button className="btn btn-link text-danger btn-sm p-0 mt-2" onClick={() => handleDeleteReview(review.id, review.userId, review.isLegacy)}>Eliminar</button>
              )}
            </div>
          ))}
        </div>
        {auth.currentUser && (
          <form onSubmit={handleAddReview}>
            <div className="mb-3">
              <div className="mb-2">
                {[1,2,3,4,5].map(s => <FontAwesomeIcon key={s} icon={s <= newRating ? faStarSolid : faStarRegular} className="text-warning me-1" style={{ cursor: 'pointer', fontSize: '1.5em' }} onClick={() => setNewRating(s)} />)}
              </div>
              <textarea className="form-control" rows="3" placeholder="Escribe tu reseña..." value={newReviewText} onChange={e => setNewReviewText(e.target.value)} required />
            </div>
            <button type="submit" className="btn btn-primary"><FontAwesomeIcon icon={faPaperPlane} /> Publicar</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default WebDetail;
