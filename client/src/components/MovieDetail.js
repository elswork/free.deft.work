import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';

const MovieDetail = ({ db }) => {
  const { movieId } = useParams(); // Changed to movieId
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMovie = async () => {
      if (!db || !movieId) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'movies', movieId); // Changed to 'movies' collection
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setMovie(docSnap.data());
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching movie details: ", error);
      }
      setLoading(false);
    };

    fetchMovie();
  }, [db, movieId]);

  if (loading) {
    return <p>Cargando película...</p>;
  }

  if (!movie) {
    return <p>Película no encontrada.</p>;
  }

  return (
    <div>
      <div className="ratio ratio-16x9 mb-4">
        <iframe
          src={`https://www.youtube.com/embed/${movie.youtubeId}`}
          title={movie.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <h2>{movie.title}</h2>
      <h5 className="text-muted mb-3">{movie.channelTitle}</h5>
      <p>{movie.description}</p>
    </div>
  );
};

export default MovieDetail;
