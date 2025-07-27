import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
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

    if (userId) {
      fetchProfile();
    }
  }, [userId, db, auth.currentUser]);

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
    console.log("handleFollowToggle called");
    if (!auth.currentUser) {
      alert("You must be logged in to follow users.");
      console.log("Not logged in.");
      return;
    }
    if (isCurrentUserProfile) {
      console.log("Cannot follow own profile.");
      return;
    }

    console.log("Current User ID:", auth.currentUser.uid);
    console.log("User to Follow ID:", userId);

    const currentUserRef = doc(db, "users", auth.currentUser.uid);
    const userToFollowRef = doc(db, "users", userId);

    try {
      if (isFollowing) {
        // Unfollow
        console.log("Attempting to unfollow...");
        await updateDoc(currentUserRef, {
          following: arrayRemove(userId)
        });
        await updateDoc(userToFollowRef, {
          followers: arrayRemove(auth.currentUser.uid),
          followersCount: increment(-1)
        });
        setIsFollowing(false);
        setFollowersCount(prev => prev - 1);
        console.log("Unfollow successful.");
      } else {
        // Follow
        console.log("Attempting to follow...");
        await updateDoc(currentUserRef, {
          following: arrayUnion(userId)
        });
        await updateDoc(userToFollowRef, {
          followers: arrayUnion(auth.currentUser.uid),
          followersCount: increment(1)
        });
        setIsFollowing(true);
        setFollowersCount(prev => prev + 1);
        console.log("Follow successful. Attempting to create notification...");

        // Create notification for the followed user
        await addDoc(collection(db, "notifications"), {
          recipientId: userId,
          senderId: auth.currentUser.uid,
          senderUsername: auth.currentUser.displayName || auth.currentUser.email,
          type: "follow",
          message: `${auth.currentUser.displayName || auth.currentUser.email} ha comenzado a seguirte.`,
          read: false,
          timestamp: serverTimestamp()
        });
        console.log("Notification created successfully.");
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
        {console.log("Rendering button conditions:", {
          currentUser: auth.currentUser,
          userId: userId,
          isCurrentUserProfile: isCurrentUserProfile
        })}
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
    </div>
  );
}

export default UserProfile;
