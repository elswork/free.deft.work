import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const MovieList = ({ db, auth }) => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovies = async () => {
      if (!db) return;
      setLoading(true);
      try {
        const moviesCollection = collection(db, 'movies');
        const q = query(moviesCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const moviesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMovies(moviesData);
      } catch (error) {
        console.error("Error fetching movies: ", error);
      }
      setLoading(false);
    };

    fetchMovies();
  }, [db]);

  if (loading) {
    return <p>Cargando películas...</p>;
  }

  return (
    <div className="mt-4">
      <h2 className="mb-3">Películas</h2>
      <div className="row">
        {movies.length > 0 ? (
          movies.map((movie) => (
            <div key={movie.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <img src={movie.thumbnailUrl} className="card-img-top" alt={movie.title} style={{ height: '200px', objectFit: 'cover' }} />
                <div className="card-body">
                  <h5 className="card-title">{movie.title}</h5>
                  <p className="card-text text-muted">{movie.channelTitle}</p>
                  <Link to={`/movies/${movie.id}`} className="btn btn-primary">
                    Ver Película
                  </Link>
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
