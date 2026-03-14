import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc, updateDoc, increment, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faPaperPlane, faTrashAlt, faDownload, faShareAlt, faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import { Helmet } from 'react-helmet';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';



function BookDetail({ db, auth }) {
  const { webId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [legacyReviewsByBookId, setLegacyReviewsByBookId] = useState([]);
  const [legacyReviewsByWebId, setLegacyReviewsByWebId] = useState([]);
  const [newReviewText, setNewReviewText] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [ownerName, setOwnerName] = useState('');
  const [ownerFollowersCount, setOwnerFollowersCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);

  const componentRef = useRef();
  const handlePrint = useReactToPrint({
    content: () => componentRef.current,
  });

  const handleDownload = () => {
    if (componentRef.current) {
      html2canvas(componentRef.current).then(canvas => {
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngFile;
        downloadLink.download = `etiqueta-${book.webId}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      });
    } else {
      console.error("No se encontró el contenido para descargar.");
    }
  };

  useEffect(() => {
    const fetchBook = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, "books"), where("webId", "==", webId));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const bookDoc = querySnapshot.docs[0];
          const bookData = bookDoc.data();
          setBook(bookData);

          if (bookData.ownerId) {
            const ownerRef = doc(db, "users", bookData.ownerId);
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
                  setIsFollowing(following.includes(bookData.ownerId));
                }
              }
            }
          }
          
          // Increment view count only if user is authenticated
          if (auth.currentUser) {
            const bookRef = doc(db, "books", bookDoc.id);
            await updateDoc(bookRef, {
              views: increment(1)
            });
          }

        } else {
          setError("Libro no encontrado.");
        }
      } catch (err) {
        console.error("Error fetching book:", err);
        setError("Error al cargar el libro.");
      } finally {
        setLoading(false);
      }
    };

    if (webId) {
      fetchBook();
    }
  }, [webId, db, auth.currentUser]);

  

  useEffect(() => {
    if (webId) {
      // Listener para reseñas nuevas
      const qNew = query(
        collection(db, "reviews"),
        where("itemId", "==", webId),
        where("itemType", "==", "book"),
        orderBy("timestamp", "asc")
      );
      const unsubscribeNew = onSnapshot(qNew, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setReviews(entries);
      });

      // Listener para comentarios antiguos (forumEntries) por bookId
      const qLegacyBook = query(
        collection(db, "forumEntries"),
        where("bookId", "==", webId),
        orderBy("timestamp", "asc")
      );
      const unsubscribeLegacyBook = onSnapshot(qLegacyBook, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          comment: doc.data().text || doc.data().comment,
          rating: doc.data().rating || 5,
          isLegacy: true
        }));
        setLegacyReviewsByBookId(entries);
      });

      // Listener para comentarios antiguos (forumEntries) por webId
      const qLegacyWeb = query(
        collection(db, "forumEntries"),
        where("webId", "==", webId),
        orderBy("timestamp", "asc")
      );
      const unsubscribeLegacyWeb = onSnapshot(qLegacyWeb, (snapshot) => {
        const entries = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          comment: doc.data().text || doc.data().comment,
          rating: doc.data().rating || 5,
          isLegacy: true
        }));
        setLegacyReviewsByWebId(entries);
      });

      return () => {
        unsubscribeNew();
        unsubscribeLegacyBook();
        unsubscribeLegacyWeb();
      };
    }
  }, [webId, db]);

  // Unificar y ordenar reseñas (eliminando duplicados por ID)
  const allReviews = [...reviews, ...legacyReviewsByBookId, ...legacyReviewsByWebId]
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => {
      const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp instanceof Date ? a.timestamp.getTime() : 0);
      const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp instanceof Date ? b.timestamp.getTime() : 0);
      return timeA - timeB;
    });

  const handleAddReview = async (e) => {
    e.preventDefault();
    if (!newReviewText.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "reviews"), {
        itemId: webId,
        itemType: "book",
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        rating: newRating,
        comment: newReviewText,
        timestamp: serverTimestamp(),
        itemOwnerId: book.ownerId, // Añadir el ID del propietario del libro
      });

      // Send notification to book owner
      if (book.ownerId !== auth.currentUser.uid) {
        const userRef = doc(db, "users", book.ownerId);
        await updateDoc(userRef, {
            notifications: arrayUnion({
                userId: auth.currentUser.uid,
                userName: auth.currentUser.displayName || auth.currentUser.email,
                itemTitle: book.title,
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

  const handleFollow = async () => {
    if (!auth.currentUser || !book || !book.ownerId) return;
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const ownerRef = doc(db, "users", book.ownerId);

      await updateDoc(currentUserRef, {
        following: arrayUnion(book.ownerId)
      });
      await updateDoc(ownerRef, {
        followers: arrayUnion(auth.currentUser.uid),
        followersCount: increment(1)
      });
      setIsFollowing(true);
      setOwnerFollowersCount(prev => prev + 1);

      // Create notification for the followed user
      const userRef = doc(db, "users", book.ownerId);
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
    if (!auth.currentUser || !book || !book.ownerId) return;
    try {
      const currentUserRef = doc(db, "users", auth.currentUser.uid);
      const ownerRef = doc(db, "users", book.ownerId);

      await updateDoc(currentUserRef, {
        following: arrayRemove(book.ownerId)
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

    // Solo el autor de la reseña o el propietario del libro pueden eliminarla
    if (auth.currentUser.uid === reviewUserId || (book && auth.currentUser.uid === book.ownerId)) {
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

  if (loading) {
    return <div className="text-center mt-5">Cargando libro...</div>;
  }

  if (error) {
    return <div className="alert alert-danger mt-5">{error}</div>;
  }

  if (!book) {
    return <div className="text-center mt-5">Libro no encontrado.</div>;
  }

  return (
    <div className="container mt-5">
      <Helmet>
        <title>{book.title} - free.deft.work</title>
        <meta name="description" content={book.description} />
        <meta property="og:title" content={book.title} />
        <meta property="og:description" content={book.description} />
        <meta property="og:image" content={book.imageUrl} />
        <meta property="og:url" content={`https://free.deft.work/${book.webId}`} />
        <meta property="og:type" content="book" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={book.title} />
        <meta name="twitter:description" content={book.description} />
        <meta name="twitter:image" content={book.imageUrl} />
      </Helmet>
      <div className="card p-4 shadow-sm mb-4">
        <h2 className="card-title text-center mb-4">{book.title}</h2>
        <div className="row">
          <div className="col-md-4">
            {book.imageUrl && <img src={book.imageUrl} className="img-fluid rounded" alt={book.title} />}
          </div>
          <div className="col-md-8">
            <p className="card-text"><strong>Autor:</strong> {book.author}</p>
            <p className="card-text"><strong>ISBN:</strong> {book.isbn}</p>
            <p className="card-text"><strong>Género:</strong> {book.genre}</p>
            <p className="card-text"><strong>Descripción:</strong> {book.description}</p>
            <p className="card-text"><strong>Estado:</strong> {book.status}</p>
            <p className="card-text"><strong>Visitas:</strong> {book.views || 0}</p>
            {book.ownerId && (
              <p className="card-text">
                <strong>Propietario:</strong> 
                <Link to={`/profile/${book.ownerId}`} className="btn btn-sm btn-info ms-2">
                  {ownerName || 'Desconocido'} ({ownerFollowersCount} seguidores)
                </Link>
                {auth.currentUser && auth.currentUser.uid !== book.ownerId && (
                  isFollowing ? (
                    <button className="btn btn-sm btn-outline-secondary ms-2" onClick={handleUnfollow}>Dejar de Seguir</button>
                  ) : (
                    <button className="btn btn-sm btn-primary ms-2" onClick={handleFollow}>Seguir</button>
                  )
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card p-4 shadow-sm mb-4">
        <h3 className="mb-3">ID Web</h3>
        <div id="printable-label" className="text-center p-3" style={{ border: '6px solid black', borderRadius: '5px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'fit-content', margin: '0 auto', gap: '0px' }} ref={componentRef}>
          {book ? (
            <>
              <QRCodeSVG
                value={`https://free.deft.work/${book.webId}`}
                size={128}
                includeMargin={true}
              />
              <p className="mb-0" style={{ fontSize: '1.2rem', fontWeight: 'bold', lineHeight: '1.2' }}>free.deft.work/</p>
              <p className="mb-0" style={{ fontSize: '3.2rem', fontWeight: 'bold', marginTop: '-15px' }}>{book.webId}</p>
            </>
          ) : (
            <p>Cargando etiqueta...</p>
          )}
        </div>
        <div className="d-flex justify-content-center gap-2 mt-3">
          <button className="btn btn-secondary" onClick={handlePrint} disabled={!book}><FontAwesomeIcon icon={faPrint} /> Imprimir Etiqueta</button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={!book}><FontAwesomeIcon icon={faDownload} /> Descargar Etiqueta</button>
          <button className="btn btn-info" onClick={async () => {
            try {
              await navigator.clipboard.writeText(window.location.href);
              alert("¡Enlace copiado al portapapeles!");
            } catch (err) {
              console.error("Error al copiar el enlace: ", err);
              alert("No se pudo copiar el enlace. Por favor, inténtalo manualmente.");
            }
          }}><FontAwesomeIcon icon={faShareAlt} /> Compartir</button>
        </div>
      </div>

      <div className="card p-4 shadow-sm">
        <h3 className="mb-3">Reseñas</h3>
        <div className="reviews-list mb-4" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid rgba(0,0,0,0.05)', padding: '20px', borderRadius: '15px', background: 'rgba(255,255,255,0.5)' }}>
          {allReviews.length === 0 ? (
            <p className="text-muted text-center py-4">No hay reseñas todavía. ¡Sé el primero en opinar!</p>
          ) : (
            allReviews.map((review) => (
              <div key={review.id} className="mb-4 pb-3 border-bottom position-relative">
                <div className="d-flex justify-content-between align-items-center">
                  <p className="mb-1">
                    <strong>{book.ownerId === review.userId && <span className="badge bg-primary me-2">Propietario</span>} {review.userName}</strong> 
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
                {auth.currentUser && (auth.currentUser.uid === review.userId || (book && auth.currentUser.uid === book.ownerId)) && (
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

export default BookDetail;