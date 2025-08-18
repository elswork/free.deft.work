import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const VideoList = ({ db, auth }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideos = async () => {
      if (!db) return;
      setLoading(true);
      try {
        const videosCollection = collection(db, 'videos');
        const q = query(videosCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        const videosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setVideos(videosData);
      } catch (error) {
        console.error("Error fetching videos: ", error);
      }
      setLoading(false);
    };

    fetchVideos();
  }, [db]);

  if (loading) {
    return <p>Cargando videos...</p>;
  }

  return (
    <div className="mt-4">
      <h2 className="mb-3">Videoteca</h2>
      <div className="row">
        {videos.length > 0 ? (
          videos.map((video) => (
            <div key={video.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <img src={video.thumbnailUrl} className="card-img-top" alt={video.title} style={{ height: '200px', objectFit: 'cover' }} />
                <div className="card-body">
                  <h5 className="card-title">{video.title}</h5>
                  <p className="card-text text-muted">{video.channelTitle}</p>
                  {/* El enlace al detalle del video lo implementaremos más adelante */}
                  <Link to={`/videos/${video.id}`} className="btn btn-primary">
                    Ver Video
                  </Link>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No hay videos en la colección. ¡Añade algunos desde la página de búsqueda!</p>
        )}
      </div>
    </div>
  );
};

export default VideoList;
