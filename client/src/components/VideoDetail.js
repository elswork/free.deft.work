import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';

const VideoDetail = ({ db }) => {
  const { videoId } = useParams();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVideo = async () => {
      if (!db || !videoId) return;
      setLoading(true);
      try {
        const docRef = doc(db, 'videos', videoId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setVideo(docSnap.data());
        } else {
          console.log("No such document!");
        }
      } catch (error) {
        console.error("Error fetching video details: ", error);
      }
      setLoading(false);
    };

    fetchVideo();
  }, [db, videoId]);

  if (loading) {
    return <p>Cargando video...</p>;
  }

  if (!video) {
    return <p>Video no encontrado.</p>;
  }

  return (
    <div>
      <div className="ratio ratio-16x9 mb-4">
        <iframe
          src={`https://www.youtube.com/embed/${video.youtubeId}`}
          title={video.title}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        ></iframe>
      </div>
      <h2>{video.title}</h2>
      <h5 className="text-muted mb-3">{video.channelTitle}</h5>
      <p>{video.description}</p>
    </div>
  );
};

export default VideoDetail;
