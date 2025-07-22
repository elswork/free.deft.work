import React, { useEffect, useState } from 'react';
import firebaseConfig from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import BookList from './components/BookList';
import UserProfile from './components/UserProfile';
import './App.css';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
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
            <p className="lead">¡Bienvenido, {user.displayName}!</p>
            <div className="mb-3">
              <button className="btn btn-info me-2" onClick={() => setShowProfile(false)}>Ver Libros</button>
              <button className="btn btn-secondary me-2" onClick={() => setShowProfile(true)}>Editar Perfil</button>
              <button className="btn btn-danger" onClick={handleSignOut}>Cerrar Sesión</button>
            </div>
            {showProfile ? <UserProfile user={user} db={db} storage={storage} /> : <BookList auth={auth} db={db} storage={storage} />}
          </div>
        ) : (
          <div className="text-center">
            <p className="lead">Por favor, inicia sesión para continuar.</p>
            <button className="btn btn-primary" onClick={handleSignIn}>Iniciar Sesión con Google</button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
