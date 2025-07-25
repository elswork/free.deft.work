import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc, onSnapshot, orderBy, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPrint, faPaperPlane, faTrashAlt, faDownload } from '@fortawesome/free-solid-svg-icons';
import { Helmet } from 'react-helmet';
import { useReactToPrint } from 'react-to-print';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';



function BookDetail({ db, auth }) {
  const { webId } = useParams();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forumEntries, setForumEntries] = useState([]);
  const [newEntryText, setNewEntryText] = useState('');

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
          setBook(querySnapshot.docs[0].data());
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
  }, [webId, db]);

  

  useEffect(() => {
    if (webId) {
      const q = query(
        collection(db, "forumEntries"),
        where("webId", "==", webId),
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
  }, [webId, db]);

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!newEntryText.trim() || !auth.currentUser) return;

    try {
      await addDoc(collection(db, "forumEntries"), {
        webId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email,
        text: newEntryText,
        timestamp: serverTimestamp(),
        bookOwnerId: book.ownerId, // Añadir el ID del propietario del libro
      });
      setNewEntryText('');
    } catch (error) {
      console.error("Error adding forum entry:", error);
    }
  };

  const handleDeleteComment = async (commentId, commentUserId) => {
    if (!auth.currentUser) return;

    // Solo el autor del comentario o el propietario del libro pueden eliminarlo
    if (auth.currentUser.uid === commentUserId || (book && auth.currentUser.uid === book.ownerId)) {
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
        {book && (
          <>
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
          </>
        )}
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
        </div>
      </div>

      <div className="card p-4 shadow-sm">
        <h3 className="mb-3">Foro del Libro</h3>
        <div className="forum-entries mb-4" style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
          {forumEntries.length === 0 ? (
            <p>No hay entradas en el foro todavía.</p>
          ) : (
            forumEntries.map((entry) => (
              <div key={entry.id} className="mb-2 pb-2 border-bottom">
                <p className="mb-0"><strong>{book.ownerId === entry.userId && <span className="badge bg-info">Propietario</span>} {entry.userName}</strong> ({entry.timestamp?.toDate().toLocaleString()}):</p>
                <p className="mb-0">{renderTextWithLinks(entry.text)}</p>
                {auth.currentUser && (auth.currentUser.uid === entry.userId || (book && auth.currentUser.uid === book.ownerId)) && (
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

export default BookDetail;