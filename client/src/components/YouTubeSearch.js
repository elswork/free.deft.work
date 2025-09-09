import React, { useState } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch } from '@fortawesome/free-solid-svg-icons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const YouTubeSearch = ({ db, auth, defaultCategory = 'videos', onAdd }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState(defaultCategory);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await axios.get(`https://europe-west1-free-deft-work.cloudfunctions.net/searchYouTube?q=${query}`);
      setResults(response.data);
    } catch (err) {
      setError('Error al realizar la búsqueda. Por favor, inténtalo de nuevo.');
      console.error('Search error:', err);
    }
    setLoading(false);
  };

  const handleAdd = async (video) => {
    if (!db || !auth.currentUser) {
      console.error("Firestore db instance or user is not available.");
      alert("Error: No se pudo conectar a la base de datos o no hay un usuario autenticado.");
      return;
    }

    try {
      // Usar la categoría del estado para determinar la colección
      await addDoc(collection(db, category), {
        ...video,
        ownerId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      });
      alert(`"${video.title}" ha sido añadido a la colección de ${category}.`);
      setResults([]);
      if (onAdd) {
        onAdd();
      }
    } catch (e) {
      console.error("Error adding document: ", e);
      alert("Error al añadir el video. Revisa la consola para más detalles.");
    }
  };

  return (
    <div>
      <h2 className="mb-4">Búsqueda de Contenido en YouTube</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="input-group">
          <input
            type="text"
            className="form-control"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar películas, videos, música..."
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <FontAwesomeIcon icon={faSearch} /> {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
      </form>

      {error && <div className="alert alert-danger">{error}</div>}

      <div>
        {results.map((video) => (
          <div key={video.youtubeId} className="card mb-3">
            <div className="row g-0">
              <div className="col-md-4">
                <img src={video.thumbnailUrl} className="img-fluid rounded-start" alt={video.title} />
              </div>
              <div className="col-md-8">
                <div className="card-body">
                  <h5 className="card-title">{video.title}</h5>
                  <p className="card-text">{video.description}</p>
                  <p className="card-text"><small className="text-muted">Canal: {video.channelTitle}</small></p>
                  <div className="d-flex align-items-center">
                    <button onClick={() => handleAdd(video)} className="btn btn-success me-3">
                      Añadir
                    </button>
                    <div className="col-auto">
                      <select className="form-select" value={category} onChange={(e) => setCategory(e.target.value)}>
                        <option value="videos">Video</option>
                        <option value="movies">Película</option>
                        <option value="music">Videoclip</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default YouTubeSearch;