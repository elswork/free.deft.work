import React, { useEffect, useState } from 'react';
import firebaseConfig from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import BookList from './components/BookList';
import UserProfile from './components/UserProfile';
import BookDetail from './components/BookDetail';
import './App.css';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

function App() {
  const [user, setUser] = useState(null);

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
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <Router>
      <div className="App container mt-5">
        <header className="text-center mb-4">
          <Link to="/">
            <img src="/images/LogoFDW.webp" alt="Free Deft Work Logo" className="img-fluid" style={{ maxWidth: '200px' }} />
          </Link>
        </header>
        <main className="card p-4 shadow-sm">
          <Routes>
            <Route path="/" element={
              user ? (
                <div className="text-center">
                  <p className="lead">¡Bienvenido, {user.displayName}!</p>
                  <div className="mb-3">
                    <button className="btn btn-danger" onClick={handleSignOut}>Cerrar Sesión</button>
                  </div>
                  <BookList auth={auth} db={db} storage={storage} />
                </div>
              ) : (
                <div className="text-center">
                  <p className="lead">Por favor, inicia sesión para continuar.</p>
                  <button className="btn btn-primary" onClick={handleSignIn}>Iniciar Sesión con Google</button>
                </div>
              )
            } />
            <Route path="/:webId" element={<BookDetail db={db} auth={auth} />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
