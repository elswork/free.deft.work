import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, doc, deleteDoc, addDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';

const VideojuegoList = ({ db, auth }) => {
  const [videojuegos, setVideojuegos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newVideojuego, setNewVideojuego] = useState({ name: '', url: '', imageUrl: '' });
  const [showOnlyMyItems, setShowOnlyMyItems] = useState(false);

  const fetchVideojuegos = async () => {
    if (!db) return;
    setLoading(true);
    try {
      let q;
      if (showOnlyMyItems && auth.currentUser) {
        q = query(collection(db, 'videojuegos'), where('ownerId', '==', auth.currentUser.uid), orderBy("order"));
      } else {
        q = query(collection(db, 'videojuegos'), orderBy("order"));
      }
      const querySnapshot = await getDocs(q);
      const videojuegosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideojuegos(videojuegosData);
    } catch (error) {
      console.error("Error fetching videojuegos: ", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVideojuegos();
  }, [db, auth.currentUser, showOnlyMyItems]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewVideojuego({ ...newVideojuego, [name]: value });
  };

  const handleUrlBlur = async (e) => {
    const url = e.target.value;
    if (!url) return;

    try {
      const functionUrl = `https://europe-west1-free-deft-work.cloudfunctions.net/extractImageFromUrl?url=${encodeURIComponent(url)}`;
      const response = await fetch(functionUrl);
      if (response.ok) {
        const data = await response.json();
        setNewVideojuego({ ...newVideojuego, imageUrl: data.imageUrl });
      }
    } catch (error) {
      console.error("Error extracting image from URL: ", error);
    }
  };

  const handleAddVideojuego = async (e) => {
    e.preventDefault();
    if (!newVideojuego.name || !newVideojuego.url) {
      alert("Por favor, introduce un nombre y una URL.");
      return;
    }
    try {
      const userVideojuegosQuery = query(collection(db, "videojuegos"), where("ownerId", "==", auth.currentUser.uid));
      const userVideojuegosSnapshot = await getDocs(userVideojuegosQuery);
      const userVideojuegoCount = userVideojuegosSnapshot.size;

      await addDoc(collection(db, "videojuegos"), {
        ...newVideojuego,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        order: userVideojuegoCount
      });
      setNewVideojuego({ name: '', url: '', imageUrl: '' });
      fetchVideojuegos();
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleDelete = async (videojuegoId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este videojuego?")) {
      try {
        await deleteDoc(doc(db, "videojuegos", videojuegoId));
        fetchVideojuegos();
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  if (loading) {
    return <p>Cargando videojuegos...</p>;
  }

  return (
    <div className="mt-4">
      {auth.currentUser && (
        <>
          <h2 className="mb-3">Añadir Nuevo Videojuego</h2>
          <form onSubmit={handleAddVideojuego} className="mb-5">
            <div className="mb-3">
              <input type="url" name="url" className="form-control" placeholder="URL del videojuego" value={newVideojuego.url} onChange={handleInputChange} onBlur={handleUrlBlur} required />
            </div>
            <div className="mb-3">
              <input type="text" name="name" className="form-control" placeholder="Nombre del videojuego" value={newVideojuego.name} onChange={handleInputChange} required />
            </div>
            {newVideojuego.imageUrl && (
              <div className="mb-3">
                <img src={newVideojuego.imageUrl} alt="Preview" style={{ maxWidth: '200px' }} />
              </div>
            )}
            <button type="submit" className="btn btn-primary">Añadir Videojuego</button>
          </form>
        </>
      )}

      <h2 className="mb-3">Videojuegos</h2>

      {auth.currentUser && (
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="showOnlyMyGames"
            checked={showOnlyMyItems}
            onChange={(e) => setShowOnlyMyItems(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showOnlyMyGames">
            Mostrar solo mis videojuegos
          </label>
        </div>
      )}

      <div className="row">
        {videojuegos.length > 0 ? (
          videojuegos.map((videojuego, index) => (
            <div key={videojuego.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="position-relative">
                  {videojuego.imageUrl && (
                    <a href={videojuego.url} target="_blank" rel="noopener noreferrer">
                      <img src={videojuego.imageUrl} className="card-img-top" alt={videojuego.name} style={{ height: '200px', objectFit: 'cover' }} />
                    </a>
                  )}
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style={{ zIndex: 1 }}>
                    {videojuego.order + 1}
                  </span>
                </div>
                <div className="card-body">
                  <h5 className="card-title">{videojuego.name}</h5>
                  <p className="card-text"><a href={videojuego.url} target="_blank" rel="noopener noreferrer">{videojuego.url}</a></p>
                  {auth.currentUser && auth.currentUser.uid === videojuego.ownerId && (
                    <button onClick={() => handleDelete(videojuego.id)} className="btn btn-danger mt-2 ms-2">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No hay videojuegos en la colección.</p>
        )}
      </div>
    </div>
  );
};

export default VideojuegoList;