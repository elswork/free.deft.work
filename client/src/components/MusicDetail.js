import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';

const MusicDetail = ({ db }) => {
  const { musicId } = useParams(); // Changed to musicId
  const [clip, setClip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClip = async () => {
      if (!db || !musicId) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'music', musicId); // Changed to 'music' collection
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setClip(docSnap.data());
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching music clip details: ", error);
      }
      setLoading(false);
    };

    fetchClip();
  }, [db, musicId]);

  if (loading) {
    return <p>Cargando videoclip...</p>;
  }

  if (!clip) {
    return <p>Videoclip no encontrado.</p>;
  }

  return (
    <div>
      <div className="ratio ratio-16x9 mb-4">
        <iframe
          src={`https://www.youtube.com/embed/${clip.youtubeId}`}
          title={clip.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <h2>{clip.title}</h2>
      <h5 className="text-muted mb-3">{clip.channelTitle}</h5>
      <p>{clip.description}</p>
    </div>
  );
};

export default MusicDetail;
