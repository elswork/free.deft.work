import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import YouTubeSearch from './YouTubeSearch';

const VideoList = ({ db, auth }) => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [youtubeResults, setYoutubeResults] = useState([]);
  const [showOnlyMyItems, setShowOnlyMyItems] = useState(false);

  const fetchVideos = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      let q;
      if (showOnlyMyItems && auth.currentUser) {
        q = query(collection(db, 'videos'), where('ownerId', '==', auth.currentUser.uid), orderBy('order', 'asc'));
      } else {
        q = query(collection(db, 'videos'), orderBy('order', 'asc'));
      }
      const querySnapshot = await getDocs(q);
      const videosData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVideos(videosData);
    } catch (error) {
      console.error("Error fetching videos: ", error);
    }
    setLoading(false);
  }, [db, auth.currentUser, showOnlyMyItems]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleVideoAdded = () => {
    fetchVideos();
    setYoutubeResults([]);
  };

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
      <YouTubeSearch 
        db={db} 
        auth={auth} 
        defaultCategory="videos" 
        onVideoAdded={handleVideoAdded}
        results={youtubeResults}
        onSearchResults={setYoutubeResults}
      />
      <h2 className="mb-3">Videos</h2>

      {auth.currentUser && (
        <div className="form-check form-switch mb-3">
          <input
            className="form-check-input"
            type="checkbox"
            role="switch"
            id="showOnlyMyVideos"
            checked={showOnlyMyItems}
            onChange={(e) => setShowOnlyMyItems(e.target.checked)}
          />
          <label className="form-check-label" htmlFor="showOnlyMyVideos">
            Mostrar solo mis videos
          </label>
        </div>
      )}

      <div className="row">
        {videos.length > 0 ? (
          videos.map((video) => (
            <div key={video.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <Link to={`/videos/${video.id}`}>
                  <img src={video.thumbnailUrl} className="card-img-top" alt={video.title} style={{ height: '200px', objectFit: 'cover' }} />
                </Link>
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-dark" style={{ zIndex: 1 }}>
                  {video.order + 1}
                </span>
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