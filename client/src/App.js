import React, { useEffect, useState } from 'react';
import firebaseConfig from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSignInAlt, faSignOutAlt, faUser, faInfoCircle, faBook, faExternalLinkAlt, faPaperPlane, faEdit, faTrashAlt, faPlus, faSave, faTimes, faSearch } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';
import BookList from './components/BookList';
import UserProfile from './components/UserProfile';
import BookDetail from './components/BookDetail';
import AuthForm from './components/AuthForm'; // Importar el nuevo componente
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
          <nav className="mt-3">
            <ul className="nav justify-content-center">
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/"><FontAwesomeIcon icon={faHome} /> Inicio</Link>
              </li>
              <li className="nav-item">
                <a className="btn btn-outline-info mx-1" href="https://github.com/elswork/free.deft.work/blob/main/README.md" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faGithub} /> Acerca de</a>
              </li>
              {user ? (
                <li className="nav-item">
                  <button className="btn btn-outline-danger mx-1" onClick={handleSignOut}><FontAwesomeIcon icon={faSignOutAlt} /> Cerrar Sesión</button>
                </li>
              ) : (
                <li className="nav-item">
                  <Link className="btn btn-primary mx-1" to="/auth"><FontAwesomeIcon icon={faSignInAlt} /> Iniciar Sesión / Registrarse</Link>
                </li>
              )}
            </ul>
          </nav>
        </header>
        <main className="card p-4 shadow-sm">
          <Switch>
            <Route path="/" exact render={(props) => (
              <>
                {user ? (
                  <div className="text-center">
                    <p className="lead">¡Bienvenido, {user.displayName}!</p>
                    <BookList auth={auth} db={db} storage={storage} />
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="lead">Por favor, inicia sesión para continuar.</p>
                    <button className="btn btn-primary" onClick={handleSignIn}><FontAwesomeIcon icon={faGoogle} /> Iniciar Sesión con Google</button>
                  </div>
                )}
              </>
            )} />
            <Route path="/auth" component={() => <AuthForm auth={auth} />} />
            <Route path="/:webId" component={() => <BookDetail db={db} auth={auth} />} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;