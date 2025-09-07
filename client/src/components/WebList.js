import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, doc, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';

const WebList = ({ db, auth }) => {
  const [webs, setWebs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newWeb, setNewWeb] = useState({ name: '', url: '', imageUrl: '' });

  const fetchWebs = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const websCollection = collection(db, 'webs');
      const q = query(websCollection);
      const querySnapshot = await getDocs(q);
      const websData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWebs(websData);
    } catch (error) {
      console.error("Error fetching webs: ", error);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    fetchWebs();
  }, [fetchWebs]);

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
      await addDoc(collection(db, "webs"), {
        ...newWeb,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
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
      <h2 className="mb-3">Añadir Nueva Web</h2>
      <form onSubmit={handleAddWeb} className="mb-5">
        <div className="mb-3">
          <input type="text" name="name" className="form-control" placeholder="Nombre de la web" value={newWeb.name} onChange={handleInputChange} required />
        </div>
        <div className="mb-3">
          <input type="url" name="url" className="form-control" placeholder="URL de la web" value={newWeb.url} onChange={handleInputChange} onBlur={handleUrlBlur} required />
        </div>
        {newWeb.imageUrl && (
          <div className="mb-3">
            <img src={newWeb.imageUrl} alt="Preview" style={{ maxWidth: '200px' }} />
          </div>
        )}
        <button type="submit" className="btn btn-primary">Añadir Web</button>
      </form>

      <h2 className="mb-3">Webs</h2>
      <div className="row">
        {webs.length > 0 ? (
          webs.map((web) => (
            <div key={web.id} className="col-md-4 mb-4">
              <div className="card h-100">
                {web.imageUrl && <img src={web.imageUrl} className="card-img-top" alt={web.name} style={{ height: '200px', objectFit: 'cover' }} />}
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
