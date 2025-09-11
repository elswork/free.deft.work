import React, { useState, useEffect, useCallback } from 'react';
import { collection, getDocs, query, orderBy, where, doc, deleteDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import YouTubeSearch from './YouTubeSearch';

const MusicList = ({ db, auth }) => {
  const [music, setMusic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [youtubeResults, setYoutubeResults] = useState([]);

  const fetchMusic = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      const musicCollection = collection(db, 'music');
      const q = query(musicCollection, orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const musicData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMusic(musicData);
    } catch (error) {
      console.error("Error fetching music: ", error);
    }
    setLoading(false);
  }, [db]);

  useEffect(() => {
    fetchMusic();
  }, [fetchMusic]);

  const handleMusicAdded = () => {
    fetchMusic();
    setYoutubeResults([]);
  };

  const handleDelete = async (clipId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este videoclip?")) {
      try {
        await deleteDoc(doc(db, "music", clipId));
        fetchMusic();
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  if (loading) {
    return <p>Cargando videoclips...</p>;
  }

  return (
    <div className="mt-4">
      <YouTubeSearch 
        db={db} 
        auth={auth} 
        defaultCategory="music" 
        onVideoAdded={handleMusicAdded}
        results={youtubeResults}
        onSearchResults={setYoutubeResults}
      />
      <h2 className="mb-3">Videoclips</h2>
      <div className="row">
        {music.length > 0 ? (
          music.map((clip) => (
            <div key={clip.id} className="col-md-4 mb-4">
              <div className="card h-100">
                <img src={clip.thumbnailUrl} className="card-img-top" alt={clip.title} style={{ height: '200px', objectFit: 'cover' }} />
                <div className="card-body">
                  <h5 className="card-title">{clip.title}</h5>
                  <p className="card-text text-muted">{clip.channelTitle}</p>
                  {clip.isTopContent && <span className="badge bg-warning">Top {clip.topOrder}</span>}
                  <Link to={`/music/${clip.id}`} className="btn btn-primary mt-2">
                    Ver Videoclip
                  </Link>
                  {auth.currentUser && auth.currentUser.uid === clip.ownerId && (
                    <button onClick={() => handleDelete(clip.id)} className="btn btn-danger mt-2 ms-2">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <p>No hay videoclips en la colección. ¡Añade algunos desde la página de búsqueda!</p>
        )}
      </div>
    </div>
  );
};

export default MusicList;