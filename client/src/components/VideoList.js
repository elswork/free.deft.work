import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const VideoList = ({ db, auth }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchVideos = useCallback(async () => {
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
  }, [db]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDelete = async (videoId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este video?")) {
      try {
        await deleteDoc(doc(db, "videos", videoId));
        fetchVideos();
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  if (loading) {
    return <p>Cargando videos...</p>;
  }

  return (
    <div className="mt-4">
      <h2 className="mb-3">Videos</h2>
      <div className="row">
        {videos.length > 0 ? (
          videos.map((video) => (
            <div key={video.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <img src={video.thumbnailUrl} className="card-img-top" alt={video.title} style={{ height: '200px', objectFit: 'cover' }} />
                <div className="card-body">
                  <h5 className="card-title">{video.title}</h5>
                  <p className="card-text text-muted">{video.channelTitle}</p>
                  {video.isTopContent && <span className="badge bg-warning">Top {video.topOrder}</span>}
                  <Link to={`/videos/${video.id}`} className="btn btn-primary mt-2">
                    Ver Video
                  </Link>
                  {auth.currentUser && auth.currentUser.uid === video.ownerId && (
                    <button onClick={() => handleDelete(video.id)} className="btn btn-danger mt-2 ms-2">
                      Eliminar
                    </button>
                  )}
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