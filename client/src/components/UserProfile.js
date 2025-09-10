import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, increment, collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

function UserProfile({ auth, db, storage }) {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notification, setNotification] = useState({ type: '', message: '' });
  const [userBooks, setUserBooks] = useState([]);
  const [userVideos, setUserVideos] = useState([]);
  const [userMovies, setUserMovies] = useState([]);
  const [userMusic, setUserMusic] = useState([]);
  const [userWebs, setUserWebs] = useState([]);
  const [userVideojuegos, setUserVideojuegos] = useState([]);

  const isCurrentUserProfile = auth.currentUser && auth.currentUser.uid === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const docRef = doc(db, "users", userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const profileData = docSnap.data();
          setProfile(profileData);
          setFollowersCount(profileData.followers?.length || 0);
          setFollowingCount(profileData.following?.length || 0);

          if (auth.currentUser) {
            const currentUserDocRef = doc(db, "users", auth.currentUser.uid);
            const currentUserDocSnap = await getDoc(currentUserDocRef);
            if (currentUserDocSnap.exists()) {
              const currentUserData = currentUserDocSnap.data();
              setIsFollowing(currentUserData.following?.includes(userId) || false);
            }
          }
        } else {
          setError("User not found.");
        }
      } catch (err) {
        console.error("Error fetching profile:", err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    const fetchUserContent = async () => {
      const collections = {
        books: setUserBooks,
        videos: setUserVideos,
        movies: setUserMovies,
        music: setUserMusic,
        webs: setUserWebs,
        videojuegos: setUserVideojuegos,
      };

      for (const [collectionName, setter] of Object.entries(collections)) {
        try {
          const q = query(
            collection(db, collectionName),
            where("ownerId", "==", userId),
            orderBy("order", "asc"),
            limit(100)
          );
          const querySnapshot = await getDocs(q);
          const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setter(items);
        } catch (error) {
          console.error(`Error fetching user ${collectionName} by order:`, error);
          // Fallback to sorting by createdAt if 'order' field is missing or causes an error
          try {
            const qFallback = query(
              collection(db, collectionName),
              where("ownerId", "==", userId),
              orderBy("createdAt", "desc"),
              limit(100)
            );
            const querySnapshotFallback = await getDocs(qFallback);
            const itemsFallback = querySnapshotFallback.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setter(itemsFallback);
          } catch (fallbackError) {
            console.error(`Error fetching user ${collectionName} by createdAt:`, fallbackError);
          }
        }
      }
    };

    if (userId) {
      fetchProfile();
      fetchUserContent();
    }
  }, [userId, db, auth.currentUser]);

  const handleMove = (listName, index, direction) => {
    const listStateSetters = {
        books: setUserBooks,
        videos: setUserVideos,
        movies: setUserMovies,
        music: setUserMusic,
        webs: setUserWebs,
        videojuegos: setUserVideojuegos,
    };
    const listStates = {
        books: userBooks,
        videos: userVideos,
        movies: userMovies,
        music: userMusic,
        webs: userWebs,
        videojuegos: userVideojuegos,
    };

    const list = listStates[listName];
    const setList = listStateSetters[listName];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= list.length) {
        return;
    }

    const newList = [...list];
    const item = newList.splice(index, 1)[0];
    newList.splice(newIndex, 0, item);

    setList(newList);
  };

  const handleSaveOrder = async (listName) => {
    if (!isCurrentUserProfile) return;

    const listStates = {
        books: userBooks,
        videos: userVideos,
        movies: userMovies,
        music: userMusic,
        webs: userWebs,
        videojuegos: userVideojuegos,
    };

    const list = listStates[listName];
    if (!list) return;

    setLoading(true);
    const batch = writeBatch(db);
    list.forEach((item, index) => {
        const docRef = doc(db, listName, item.id);
        batch.update(docRef, { order: index });
    });

    try {
        await batch.commit();
        setNotification({ type: 'success', message: '¡Orden guardado con éxito!' });
    } catch (error) {
        console.error("Error saving order: ", error);
        setNotification({ type: 'danger', message: 'Error al guardar el orden.' });
    } finally {
        setLoading(false);
        setTimeout(() => setNotification({ type: '', message: '' }), 5000);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile({ ...profile, [name]: value });
  };

  const handleImageChange = (e) => {
    if (e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!isCurrentUserProfile) return;

    setLoading(true);
    setError(null);
    let newProfilePictureUrl = profile.profilePictureUrl;

    if (imageFile) {
      try {
        const storageRef = ref(storage, `profile_pictures/${userId}/${imageFile.name}`);
        await uploadBytes(storageRef, imageFile);
        newProfilePictureUrl = await getDownloadURL(storageRef);
      } catch (err) {
        console.error("Error uploading image:", err);
        setError("Failed to upload profile picture.");
        setLoading(false);
        return;
      }
    }

    try {
      await setDoc(doc(db, "users", userId), { ...profile, profilePictureUrl: newProfilePictureUrl }, { merge: true });
      setNotification({ type: 'success', message: '¡Perfil guardado con éxito!' });
    } catch (err) {
      console.error("Error saving profile:", err);
      setNotification({ type: 'danger', message: 'Error al guardar el perfil.' });
    } finally {
      setLoading(false);
      setTimeout(() => setNotification({ type: '', message: '' }), 5000);
    }
  };

  const handleFollowToggle = async () => {
    if (!auth.currentUser) {
      alert("You must be logged in to follow users.");
      return;
    }
    if (isCurrentUserProfile) return;

    const currentUserRef = doc(db, "users", auth.currentUser.uid);
    const userToFollowRef = doc(db, "users", userId);

    try {
      if (isFollowing) {
        await updateDoc(currentUserRef, { following: arrayRemove(userId) });
        await updateDoc(userToFollowRef, { followers: arrayRemove(auth.currentUser.uid), followersCount: increment(-1) });
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
      } else {
        await updateDoc(currentUserRef, { following: arrayUnion(userId) });
        await updateDoc(userToFollowRef, { followers: arrayUnion(auth.currentUser.uid), followersCount: increment(1) });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);

        await addDoc(collection(db, "notifications"), {
          recipientId: userId,
          senderId: auth.currentUser.uid,
          senderUsername: auth.currentUser.displayName || auth.currentUser.email,
          type: "follow",
          message: `${auth.currentUser.displayName || auth.currentUser.email} ha comenzado a seguirte.`,
          read: false,
          timestamp: serverTimestamp()
        });
      }
    } catch (err) {
      console.error("Error updating follow status:", err);
      alert("Failed to update follow status.");
    }
  };

  if (loading) {
    return <div className="text-center mt-4">Cargando perfil...</div>;
  }

  if (error) {
    return <div className="alert alert-danger mt-4">Error: {error}</div>;
  }
  
  if (!profile) {
    return <div className="text-center mt-5">Usuario no encontrado.</div>;
  }

  return (
    <div className="card mt-4 p-4 shadow-sm">
      <h2 className="card-title text-center mb-4">Perfil de {profile.username}</h2>
      {notification.message && (
        <div className={`alert alert-${notification.type}`}>
          {notification.message}
        </div>
      )}
      <div className="mb-3 text-center">
        {profile.profilePictureUrl && (
          <img
            src={profile.profilePictureUrl}
            alt="Profile"
            className="rounded-circle mb-3"
            style={{ width: '150px', height: '150px', objectFit: 'cover' }}
          />
        )}
      </div>
      
      <div className="text-center mb-3">
        <p><strong>Seguidores:</strong> {followersCount} | <strong>Siguiendo:</strong> {followingCount}</p>
        {auth.currentUser && !isCurrentUserProfile && (
          <button onClick={handleFollowToggle} className={`btn ${isFollowing ? 'btn-secondary' : 'btn-primary'}`}>
            {isFollowing ? 'Dejar de Seguir' : 'Seguir'}
          </button>
        )}
      </div>

      <form onSubmit={handleSaveProfile}>
        {isCurrentUserProfile && (
            <div className="mb-3 text-center">
                <input type="file" className="form-control" onChange={handleImageChange} />
            </div>
        )}
        <div className="mb-3">
          <label htmlFor="username" className="form-label">Nombre de Usuario</label>
          <input
            type="text"
            className="form-control"
            id="username"
            name="username"
            value={profile.username}
            onChange={handleInputChange}
            required
            disabled={!isCurrentUserProfile}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="location" className="form-label">Ubicación</label>
          <input
            type="text"
            className="form-control"
            id="location"
            name="location"
            value={profile.location}
            onChange={handleInputChange}
            disabled={!isCurrentUserProfile}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="bio" className="form-label">Biografía</label>
          <textarea
            className="form-control"
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleInputChange}
            rows="3"
            disabled={!isCurrentUserProfile}
          ></textarea>
        </div>
        {isCurrentUserProfile && (
          <button type="submit" className="btn btn-success w-100" disabled={loading}>Guardar Perfil</button>
        )}
      </form>

      <div className="mt-5">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3>Mis Libros</h3>
          {isCurrentUserProfile && <button className="btn btn-primary btn-sm" onClick={() => handleSaveOrder('books')}>Guardar Orden</button>}
        </div>
        {userBooks.length > 0 ? (
          <ul className="list-group">
            {userBooks.map((book, index) => (
              <li key={book.id} className="list-group-item d-flex justify-content-between align-items-center">
                <Link to={`/books/${book.id}`}>{book.title}</Link>
                {isCurrentUserProfile && (
                  <div>
                    <button className="btn btn-light btn-sm me-2" onClick={() => handleMove('books', index, 'up')} disabled={index === 0}>↑</button>
                    <button className="btn btn-light btn-sm" onClick={() => handleMove('books', index, 'down')} disabled={index === userBooks.length - 1}>↓</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p>No hay libros para mostrar.</p>}
      </div>

      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3>Mis Videos</h3>
          {isCurrentUserProfile && <button className="btn btn-primary btn-sm" onClick={() => handleSaveOrder('videos')}>Guardar Orden</button>}
        </div>
        {userVideos.length > 0 ? (
          <ul className="list-group">
            {userVideos.map((video, index) => (
              <li key={video.id} className="list-group-item d-flex justify-content-between align-items-center">
                <Link to={`/videos/${video.id}`}>{video.title}</Link>
                {isCurrentUserProfile && (
                  <div>
                    <button className="btn btn-light btn-sm me-2" onClick={() => handleMove('videos', index, 'up')} disabled={index === 0}>↑</button>
                    <button className="btn btn-light btn-sm" onClick={() => handleMove('videos', index, 'down')} disabled={index === userVideos.length - 1}>↓</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p>No hay videos para mostrar.</p>}
      </div>

      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3>Mis Películas</h3>
          {isCurrentUserProfile && <button className="btn btn-primary btn-sm" onClick={() => handleSaveOrder('movies')}>Guardar Orden</button>}
        </div>
        {userMovies.length > 0 ? (
          <ul className="list-group">
            {userMovies.map((movie, index) => (
              <li key={movie.id} className="list-group-item d-flex justify-content-between align-items-center">
                <Link to={`/movies/${movie.id}`}>{movie.title}</Link>
                {isCurrentUserProfile && (
                  <div>
                    <button className="btn btn-light btn-sm me-2" onClick={() => handleMove('movies', index, 'up')} disabled={index === 0}>↑</button>
                    <button className="btn btn-light btn-sm" onClick={() => handleMove('movies', index, 'down')} disabled={index === userMovies.length - 1}>↓</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p>No hay películas para mostrar.</p>}
      </div>

      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3>Mis Videoclips</h3>
          {isCurrentUserProfile && <button className="btn btn-primary btn-sm" onClick={() => handleSaveOrder('music')}>Guardar Orden</button>}
        </div>
        {userMusic.length > 0 ? (
          <ul className="list-group">
            {userMusic.map((clip, index) => (
              <li key={clip.id} className="list-group-item d-flex justify-content-between align-items-center">
                <Link to={`/music/${clip.id}`}>{clip.title}</Link>
                {isCurrentUserProfile && (
                  <div>
                    <button className="btn btn-light btn-sm me-2" onClick={() => handleMove('music', index, 'up')} disabled={index === 0}>↑</button>
                    <button className="btn btn-light btn-sm" onClick={() => handleMove('music', index, 'down')} disabled={index === userMusic.length - 1}>↓</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p>No hay videoclips para mostrar.</p>}
      </div>

      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3>Mis Videojuegos</h3>
          {isCurrentUserProfile && <button className="btn btn-primary btn-sm" onClick={() => handleSaveOrder('videojuegos')}>Guardar Orden</button>}
        </div>
        {userVideojuegos.length > 0 ? (
          <ul className="list-group">
            {userVideojuegos.map((videojuego, index) => (
              <li key={videojuego.id} className="list-group-item d-flex justify-content-between align-items-center">
                <a href={videojuego.url} target="_blank" rel="noopener noreferrer">{videojuego.name}</a>
                {isCurrentUserProfile && (
                  <div>
                    <button className="btn btn-light btn-sm me-2" onClick={() => handleMove('videojuegos', index, 'up')} disabled={index === 0}>↑</button>
                    <button className="btn btn-light btn-sm" onClick={() => handleMove('videojuegos', index, 'down')} disabled={index === userVideojuegos.length - 1}>↓</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p>No hay videojuegos para mostrar.</p>}
      </div>

      <div className="mt-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h3>Mis Webs</h3>
          {isCurrentUserProfile && <button className="btn btn-primary btn-sm" onClick={() => handleSaveOrder('webs')}>Guardar Orden</button>}
        </div>
        {userWebs.length > 0 ? (
          <ul className="list-group">
            {userWebs.map((web, index) => (
              <li key={web.id} className="list-group-item d-flex justify-content-between align-items-center">
                <a href={web.url} target="_blank" rel="noopener noreferrer">{web.name}</a>
                {isCurrentUserProfile && (
                  <div>
                    <button className="btn btn-light btn-sm me-2" onClick={() => handleMove('webs', index, 'up')} disabled={index === 0}>↑</button>
                    <button className="btn btn-light btn-sm" onClick={() => handleMove('webs', index, 'down')} disabled={index === userWebs.length - 1}>↓</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p>No hay webs para mostrar.</p>}
      </div>
    </div>
  );
}

export default UserProfile;
