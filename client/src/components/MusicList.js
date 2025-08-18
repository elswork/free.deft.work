import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { Link } from 'react-router-dom';

const MusicList = ({ db, auth }) => {
  const [music, setMusic] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMusic = async () => {
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
    };

    fetchMusic();
  }, [db]);

  if (loading) {
    return <p>Cargando videoclips...</p>;
  }

  return (
    <div className="mt-4">
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
                  <Link to={`/music/${clip.id}`} className="btn btn-primary">
                    Ver Videoclip
                  </Link>
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
