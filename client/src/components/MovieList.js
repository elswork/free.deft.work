import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import YouTubeSearch from './YouTubeSearch';

const MovieList = ({ db, auth }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [showOnlyMyItems, setShowOnlyMyItems] = useState(false);

  useEffect(() => {
    if (!db) return;

    const fetchMovies = async () => {
      setLoading(true);
      try {
        let q;
        if (showOnlyMyItems && auth.currentUser) {
          q = query(collection(db, 'movies'), where('ownerId', '==', auth.currentUser.uid), orderBy('order', 'asc'));
        } else {
          q = query(collection(db, 'movies'), orderBy('order', 'asc'));
        }
        const querySnapshot = await getDocs(q);
        const moviesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMovies(moviesData);
      } catch (error) {
        console.error("Error fetching movies: ", error);
      }
      setLoading(false);
    };

    fetchMovies();
  }, [db, auth.currentUser, showOnlyMyItems]);

  const handleMovieAdded = () => {
    const fetchAgain = async () => {
      setLoading(true);
      try {
        let q;
        if (showOnlyMyItems && auth.currentUser) {
          q = query(collection(db, 'movies'), where('ownerId', '==', auth.currentUser.uid), orderBy('order', 'asc'));
        } else {
          q = query(collection(db, 'movies'), orderBy('order', 'asc'));
        }
        const querySnapshot = await getDocs(q);
        const moviesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMovies(moviesData);
      } catch (error) {
        console.error("Error fetching movies: ", error);
      }
      setLoading(false);
    };
    fetchAgain();
    setYoutubeResults([]);
  };

  const handleDelete = async (movieId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar esta película?")) {
      try {
        await deleteDoc(doc(db, "movies", movieId));
        handleMovieAdded(); // Re-fetch
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  if (loading) {
    return <p>Cargando películas...</p>;
  }

  return (
    <div className="mt-4">
      <YouTubeSearch 
        db={db} 
        auth={auth} 
        defaultCategory="movies" 
        onVideoAdded={handleMovieAdded}
        results={youtubeResults}
        onSearchResults={setYoutubeResults}
      />
      <h2 className="mb-3">Películas</h2>

      {auth.currentUser && (
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="showOnlyMyMovies"
            checked={showOnlyMyItems}
            onChange={(e) => setShowOnlyMyItems(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showOnlyMyMovies">
            Mostrar solo mis películas
          </label>
        </div>
      )}

      <div className="row">
        {movies.length > 0 ? (
          movies.map((movie, index) => (
            <div key={movie.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <div className="position-relative">
                  <Link to={`/movies/${movie.id}`}>
                    <img src={movie.thumbnailUrl} className="card-img-top" alt={movie.title} style={{ height: '200px', objectFit: 'cover' }} />
                  </Link>
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style={{ zIndex: 1 }}>
                    {movie.order + 1}
                  </span>
                </div>
                <div className="card-body">
                  <h5 className="card-title">{movie.title}</h5>
                  <p className="card-text text-muted">{movie.channelTitle}</p>
                  {movie.isTopContent && <span className="badge bg-warning">Top {movie.topOrder}</span>}
                  <Link to={`/movies/${movie.id}`} className="btn btn-primary mt-2">
                    Ver Película
                  </Link>
                  {auth.currentUser && auth.currentUser.uid === movie.ownerId && (
                    <button onClick={() => handleDelete(movie.id)} className="btn btn-danger mt-2 ms-2">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No hay películas en la colección. ¡Añade algunas desde la página de búsqueda!</p>
        )}
      </div>
    </div>
  );
};

export default MovieList;