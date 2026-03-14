import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, addDoc, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPaperPlane, faTrashAlt, faStar as faStarSolid, faExternalLinkAlt } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';

function VideojuegoDetail({ db, auth }) {
  const { gameId } = useParams();
  const [game, setGame] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
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
    const fetchGame = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, 'videojuegos', gameId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setGame(docSnap.data());
        } else {
          setError("Videojuego no encontrado.");
        }
      } catch (err) {
        console.error("Error fetching game:", err);
        setError("Error al cargar el videojuego.");
      } finally {
        setLoading(false);
      }
    };

    if (gameId) fetchGame();
  }, [gameId, db]);

  useEffect(() => {
    if (gameId) {
      const q = query(
        collection(db, "reviews"),
        where("itemId", "==", gameId),
        where("itemType", "==", "videojuego"),
        orderBy("timestamp", "asc")
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setReviews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
      return () => unsubscribe();
    }
  }, [gameId, db]);

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "reviews"), {
        itemId: gameId,
        itemType: "videojuego",
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        rating: newRating,
        comment: newReviewText,
        timestamp: serverTimestamp(),
        itemOwnerId: game.ownerId,
      });

      if (game.ownerId !== auth.currentUser.uid) {
        const userRef = doc(db, "users", game.ownerId);
        await updateDoc(userRef, {
            notifications: arrayUnion({
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || auth.currentUser.email,
                itemTitle: game.name,
                itemId: gameId,
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

  const handleDeleteReview = async (reviewId, reviewUserId) => {
    if (auth.currentUser?.uid === reviewUserId || auth.currentUser?.uid === game.ownerId) {
      if (window.confirm("¿Eliminar reseña?")) {
        await deleteDoc(doc(db, "reviews", reviewId));
      }
    }
  };

  if (loading) return <div className="text-center mt-5">Cargando...</div>;
  if (error) return <div className="alert alert-danger mt-5">{error}</div>;

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow-sm mb-4">
        <h2 className="text-center mb-4">{game.name}</h2>
        {game.imageUrl && (
          <div className="text-center mb-4">
            <img src={game.imageUrl} alt={game.name} style={{ maxWidth: '100%', borderRadius: '15px' }} />
          </div>
        )}
        <p className="lead text-center"><a href={game.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary"><FontAwesomeIcon icon={faExternalLinkAlt} /> Jugar / Ver Producto</a></p>
      </div>

      <div className="card p-4 shadow-sm">
        <h3 className="mb-3">Reseñas</h3>
        <div className="reviews-list mb-4" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.5)' }}>
          {reviews.length === 0 ? <p className="text-muted text-center py-4">Sin reseñas.</p> : reviews.map(review => (
            <div key={review.id} className="mb-4 pb-3 border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <p className="mb-1">
                  <strong>{review.userName}</strong>
                  {(review.userId === 'arquimedes_ceo' || review.userId === 'athena_ai' || review.isSynthetic) && <span className="badge bg-info ms-2">Agente IA</span>}
                </p>
                <div className="text-warning">
                  {[1,2,3,4,5].map(s => <FontAwesomeIcon key={s} icon={s <= review.rating ? faStarSolid : faStarRegular} />)}
                </div>
              </div>
              <p className="mb-0 mt-2 text-secondary">{renderTextWithLinks(review.comment)}</p>
              {(auth.currentUser?.uid === review.userId || auth.currentUser?.uid === game.ownerId) && (
                <button className="btn btn-link text-danger btn-sm p-0 mt-2" onClick={() => handleDeleteReview(review.id, review.userId)}>Eliminar</button>
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

export default VideojuegoDetail;
