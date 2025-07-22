import React, { useState, useEffect } from 'react';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { initializeApp } from 'firebase/app';
import firebaseConfig from '../firebaseConfig';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

function UserProfile({ user }) {
  const [profile, setProfile] = useState({
    username: '',
    location: '',
    bio: '',
    profilePictureUrl: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const docRef = doc(db, "users", user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data());
          } else {
            // If no profile exists, initialize with user's display name if available
            setProfile({
              username: user.displayName || '',
              location: '',
              bio: '',
              profilePictureUrl: user.photoURL || '',
            });
          }
        } catch (err) {
          console.error("Error fetching profile:", err);
          setError("Failed to load profile.");
        } finally {
          setLoading(false);
        }
      }
    };
    fetchProfile();
  }, [user]);

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
    setLoading(true);
    setError(null);
    let newProfilePictureUrl = profile.profilePictureUrl;

    if (imageFile) {
      try {
        const storageRef = ref(storage, `profile_pictures/${user.uid}/${imageFile.name}`);
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
      await setDoc(doc(db, "users", user.uid), { ...profile, profilePictureUrl: newProfilePictureUrl }, { merge: true });
      alert("Profile saved successfully!");
    } catch (err) {
      console.error("Error saving profile:", err);
      setError("Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center mt-4">Loading profile...</div>;
  }

  if (error) {
    return <div className="alert alert-danger mt-4">Error: {error}</div>;
  }

  return (
    <div className="card mt-4 p-4 shadow-sm">
      <h2 className="card-title text-center mb-4">User Profile</h2>
      <form onSubmit={handleSaveProfile}>
        <div className="mb-3 text-center">
          {profile.profilePictureUrl && (
            <img
              src={profile.profilePictureUrl}
              alt="Profile"
              className="rounded-circle mb-3" // Bootstrap class for circular image
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
            />
          )}
          <input type="file" className="form-control" onChange={handleImageChange} />
        </div>
        <div className="mb-3">
          <label htmlFor="username" className="form-label">Username</label>
          <input
            type="text"
            className="form-control"
            id="username"
            name="username"
            value={profile.username}
            onChange={handleInputChange}
            required
          />
        </div>
        <div className="mb-3">
          <label htmlFor="location" className="form-label">Location</label>
          <input
            type="text"
            className="form-control"
            id="location"
            name="location"
            value={profile.location}
            onChange={handleInputChange}
          />
        </div>
        <div className="mb-3">
          <label htmlFor="bio" className="form-label">Bio</label>
          <textarea
            className="form-control"
            id="bio"
            name="bio"
            value={profile.bio}
            onChange={handleInputChange}
            rows="3"
          ></textarea>
        </div>
        <button type="submit" className="btn btn-success w-100" disabled={loading}>Save Profile</button>
      </form>
    </div>
  );
}

export default UserProfile;