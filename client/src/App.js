import React, { useEffect, useState } from 'react';
import firebaseConfig from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import BookList from './components/BookList';
import UserProfile from './components/UserProfile';
import './App.css';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function App() {
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google: ", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setShowProfile(false); // Hide profile when signing out
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="App container mt-5">
      <header className="text-center mb-4">
        <h1 className="display-4">Free Deft Work</h1>
      </header>
      <main className="card p-4 shadow-sm">
        {user ? (
          <div className="text-center">
            <p className="lead">Welcome, {user.displayName}!</p>
            <div className="mb-3">
              <button className="btn btn-info me-2" onClick={() => setShowProfile(false)}>View Books</button>
              <button className="btn btn-secondary me-2" onClick={() => setShowProfile(true)}>Edit Profile</button>
              <button className="btn btn-danger" onClick={handleSignOut}>Sign Out</button>
            </div>
            {showProfile ? <UserProfile user={user} /> : <BookList />}
          </div>
        ) : (
          <div className="text-center">
            <p className="lead">Please sign in to continue.</p>
            <button className="btn btn-primary" onClick={handleSignIn}>Sign In with Google</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
