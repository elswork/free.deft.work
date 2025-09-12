import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, doc, deleteDoc, addDoc, serverTimestamp, where, orderBy } from 'firebase/firestore';

const WebList = ({ db, auth }) => {
  const [webs, setWebs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWeb, setNewWeb] = useState({ name: '', url: '', imageUrl: '' });
  const [showOnlyMyItems, setShowOnlyMyItems] = useState(false);

  const fetchWebs = async () => {
    if (!db) return;
    setLoading(true);
    try {
      let q;
      if (showOnlyMyItems && auth.currentUser) {
        q = query(collection(db, 'webs'), where('ownerId', '==', auth.currentUser.uid), orderBy("order"));
      } else {
        q = query(collection(db, 'webs'), orderBy("order"));
      }
      const querySnapshot = await getDocs(q);
      const websData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWebs(websData);
    } catch (error) {
      console.error("Error fetching webs: ", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchWebs();
  }, [db, auth.currentUser, showOnlyMyItems]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewWeb({ ...newWeb, [name]: value });
  };

  const handleUrlBlur = async (e) => {
    const url = e.target.value;
    if (!url) return;

    try {
      const functionUrl = `https://europe-west1-free-deft-work.cloudfunctions.net/extractImageFromUrl?url=${encodeURIComponent(url)}`;
      const response = await fetch(functionUrl);
      if (response.ok) {
        const data = await response.json();
        setNewWeb({ ...newWeb, imageUrl: data.imageUrl });
      }
    } catch (error) {
      console.error("Error extracting image from URL: ", error);
    }
  };

  const handleAddWeb = async (e) => {
    e.preventDefault();
    if (!newWeb.name || !newWeb.url) {
      alert("Por favor, introduce un nombre y una URL.");
      return;
    }
    try {
      const userWebsQuery = query(collection(db, "webs"), where("ownerId", "==", auth.currentUser.uid));
      const userWebsSnapshot = await getDocs(userWebsQuery);
      const userWebCount = userWebsSnapshot.size;

      await addDoc(collection(db, "webs"), {
        ...newWeb,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        order: userWebCount
      });
      setNewWeb({ name: '', url: '', imageUrl: '' });
      fetchWebs();
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

  const handleDelete = async (webId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta web?")) {
      try {
        await deleteDoc(doc(db, "webs", webId));
        fetchWebs();
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  if (loading) {
    return <p>Cargando webs...</p>;
  }

  return (
    <div className="mt-4">
      {auth.currentUser && (
        <>
          <h2 className="mb-3">Añadir Nueva Web</h2>
          <form onSubmit={handleAddWeb} className="mb-5">
            <div className="mb-3">
              <input type="url" name="url" className="form-control" placeholder="URL de la web" value={newWeb.url} onChange={handleInputChange} onBlur={handleUrlBlur} required />
            </div>
            <div className="mb-3">
              <input type="text" name="name" className="form-control" placeholder="Nombre de la web" value={newWeb.name} onChange={handleInputChange} required />
            </div>
            {newWeb.imageUrl && (
              <div className="mb-3">
                <img src={newWeb.imageUrl} alt="Preview" style={{ maxWidth: '200px' }} />
              </div>
            )}
            <button type="submit" className="btn btn-primary">Añadir Web</button>
          </form>
        </>
      )}

      <h2 className="mb-3">Webs</h2>

      {auth.currentUser && (
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="showOnlyMyWebs"
            checked={showOnlyMyItems}
            onChange={(e) => setShowOnlyMyItems(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showOnlyMyWebs">
            Mostrar solo mis webs
          </label>
        </div>
      )}

      <div className="row">
        {webs.length > 0 ? (
          webs.map((web, index) => (
            <div key={web.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="position-relative">
                  {web.imageUrl && (
                    <a href={web.url} target="_blank" rel="noopener noreferrer">
                      <img src={web.imageUrl} className="card-img-top" alt={web.name} style={{ height: '200px', objectFit: 'cover' }} />
                    </a>
                  )}
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style={{ zIndex: 1 }}>
                    {web.order + 1}
                  </span>
                </div>
                <div className="card-body">
                  <h5 className="card-title">{web.name}</h5>
                  <p className="card-text"><a href={web.url} target="_blank" rel="noopener noreferrer">{web.url}</a></p>
                  {auth.currentUser && auth.currentUser.uid === web.ownerId && (
                    <button onClick={() => handleDelete(web.id)} className="btn btn-danger mt-2 ms-2">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No hay webs en la colección.</p>
        )}
      </div>
    </div>
  );
};

export default WebList;