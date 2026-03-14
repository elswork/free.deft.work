import React, { useEffect, useState } from 'react';
import firebaseConfig from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSignInAlt, faSignOutAlt, faUser, faBook, faBell, faVideo, faFilm, faMusic, faGamepad, faGlobe, faRobot } from '@fortawesome/free-solid-svg-icons';
import { faGoogle, faGithub } from '@fortawesome/free-brands-svg-icons';
import BookList from './components/BookList';
import UserProfile from './components/UserProfile';
import BookDetail from './components/BookDetail';
import AuthForm from './components/AuthForm'; // Importar el nuevo componente
import { requestForToken, onMessageListener } from './firebaseConfig';
import Notifications from './components/Notifications';
import YouTubeSearch from './components/YouTubeSearch';
import VideoList from './components/VideoList'; // Importar la lista de videos
import VideoDetail from './components/VideoDetail'; // Importar el detalle de video
import MovieList from './components/MovieList';
import MovieDetail from './components/MovieDetail';
import MusicList from './components/MusicList';
import MusicDetail from './components/MusicDetail';
import VideojuegoList from './components/VideojuegoList';
import WebList from './components/WebList';
import WebDetail from './components/WebDetail';
import VideojuegoDetail from './components/VideojuegoDetail';
import AgentEmbassy from './components/AgentEmbassy';
import './App.css';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

function App() {
  const [user, setUser] = useState(null);
  const [showWelcomeSection, setShowWelcomeSection] = useState(true); // Nuevo estado para la sección de bienvenida
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (currentUser) {
          const userRef = doc(db, "users", currentUser.uid);
          const userSnap = await getDoc(userRef);

          // Base user data payload - Minimal data to comply with security rules
          const userData = {
            username: currentUser.displayName || currentUser.email,
            email: currentUser.email,
            profilePictureUrl: currentUser.photoURL || '',
          };

          // Request token and add to payload if available
          try {
            const fcmToken = await requestForToken();
            if (fcmToken) {
              const existingToken = userSnap.exists() ? userSnap.data().fcmToken : null;
              if (fcmToken !== existingToken) {
                console.log('New or updated FCM token found, updating Firestore...');
                userData.fcmToken = fcmToken;
              }
            }
          } catch (error) {
            console.error('Error handling FCM token:', error);
          }

          // Create or update user document
          if (!userSnap.exists()) {
            console.log('New user, creating document...');
            const newUserProfile = { ...userData, uid: currentUser.uid, followers: [], following: [] };
            await setDoc(userRef, newUserProfile, { merge: true });
            setUser({ ...currentUser, ...newUserProfile });
          } else {
            console.log('Existing user, merging data...');
            const fullUserProfile = { ...userSnap.data(), ...userData };
            setUser({ ...currentUser, ...fullUserProfile });
            
            // Non-blocking update
            try {
              setDoc(userRef, userData, { merge: true }).catch(fsError => {
                console.error('Firestore merge failed (background):', fsError);
              });
            } catch (fsError) {
              console.error('Firestore merge failed (immediate):', fsError);
            }
          }
        } else {
          setUser(null);
        }
      } catch (globalAuthError) {
        console.error('Global error in auth state change:', globalAuthError);
        // Fallback to minimal user state if everything else fails
        if (currentUser) {
          setUser(currentUser);
        } else {
          setUser(null);
        }
      }
    });

    onMessageListener()
      .then((payload) => {
        console.log(payload);
      })
      .catch((err) => console.log('failed: ', err));

    document.documentElement.lang = "es";
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
        <header className="text-center">
          <Link to="/">
            <img src="/images/LogoFDW.webp" alt="Free Deft Work Logo" className="logo-main" />
          </Link>
          <nav className="mt-3">
            <ul className="nav justify-content-center">
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/"><FontAwesomeIcon icon={faHome} /> Inicio</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/libro"><FontAwesomeIcon icon={faBook} /> Libros</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/videos"><FontAwesomeIcon icon={faVideo} /> Videos</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/movies"><FontAwesomeIcon icon={faFilm} /> Películas</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/music"><FontAwesomeIcon icon={faMusic} /> Música</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/videojuegos"><FontAwesomeIcon icon={faGamepad} /> Videojuegos</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/webs"><FontAwesomeIcon icon={faGlobe} /> Web</Link>
              </li>
              <li className="nav-item">
                <a className="btn btn-outline-info mx-1" href="https://github.com/elswork/free.deft.work/blob/main/README.md" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faGithub} /> Acerca de</a>
              </li>
              {user && (
                <li className="nav-item">
                  <Link className="btn btn-outline-primary mx-1" to={`/profile/${user.alias || user.uid}`}><FontAwesomeIcon icon={faUser} /> Perfil</Link>
                </li>
              )}
              {user && (
                <li className="nav-item">
                  <Link className="btn btn-outline-info mx-1" to="/embassy"><FontAwesomeIcon icon={faRobot} /> Embajada</Link>
                </li>
              )}
              {user && (
                <li className="nav-item dropdown">
                  <button className="btn btn-outline-primary mx-1 dropdown-toggle" type="button" id="notificationsDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                    <FontAwesomeIcon icon={faBell} />
                    {unreadNotifications > 0 && <span className="badge bg-danger ms-1">{unreadNotifications}</span>}
                  </button>
                  <Notifications auth={auth} db={db} setUnreadNotifications={setUnreadNotifications} />
                </li>
              )}
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
                  <div className="hero-container">
                    <h1 className="hero-title">Tu Universo de Contenido</h1>
                    <p className="hero-subtitle">
                      Descubre, colecciona y comparte. Desde libros con <strong>códigos QR únicos</strong> 🏷️ hasta 
                      <strong> videojuegos, webs, videos, películas y música</strong> 🎮🌐🎥🎵.
                    </p>
                  </div>
                ) : (
                  <>
                    {showWelcomeSection && (
                      <div className="hero-container">
                        <h1 className="hero-title">Bienvenido a Free Deft Work</h1>
                        <p className="hero-subtitle">
                          Tu centro para explorar un mundo de contenido curado por la comunidad. 
                          Crea tu perfil, sigue a otros y haz crecer tu colección.
                        </p>
                        <button className="btn btn-primary px-5 py-3" onClick={() => setShowWelcomeSection(false)}>Empezar ahora</button>
                      </div>
                    )}
                    <div className="text-center py-5">
                      <p className="lead text-muted mb-4">Por favor, inicia sesión para acceder a tu biblioteca personalizada.</p>
                      <button className="btn btn-primary btn-lg" onClick={handleSignIn}><FontAwesomeIcon icon={faGoogle} /> Iniciar Sesión con Google</button>
                    </div>
                  </>
                )}
              </>
            )} />
            <Route path="/libro" exact render={(props) => (
              <div className="text-center">
                {user && <p className="lead">¡Bienvenido, {user.displayName}!</p>}
                <BookList auth={auth} db={db} storage={storage} />
              </div>
            )} />
            <Route path="/videos/:videoId" render={(props) => <VideoDetail db={db} auth={auth} {...props} />} />
            <Route path="/videos" render={(props) => <VideoList db={db} auth={auth} {...props} />} />
            <Route path="/movies/:movieId" render={(props) => <MovieDetail db={db} auth={auth} {...props} />} />
            <Route path="/movies" render={(props) => <MovieList db={db} auth={auth} {...props} />} />
            <Route path="/music/:musicId" render={(props) => <MusicDetail db={db} auth={auth} {...props} />} />
            <Route path="/music" render={(props) => <MusicList db={db} auth={auth} {...props} />} />
            <Route path="/videojuegos/:gameId" render={(props) => <VideojuegoDetail db={db} auth={auth} {...props} />} />
            <Route path="/videojuegos" render={(props) => <VideojuegoList db={db} auth={auth} {...props} />} />
            <Route path="/webs/:webId" render={(props) => <WebDetail db={db} auth={auth} {...props} />} />
            <Route path="/webs" render={(props) => <WebList db={db} auth={auth} {...props} />} />
            <Route path="/auth" component={() => <AuthForm auth={auth} />} />
            <Route path="/profile/:alias" component={() => <UserProfile db={db} storage={storage} auth={auth} />} />
            <Route path="/embassy" component={() => <AgentEmbassy db={db} auth={auth} />} />
            <Route path="/admin/youtube-search" component={() => <YouTubeSearch db={db} auth={auth} />} />
            <Route path="/:webId" component={() => <BookDetail db={db} auth={auth} />} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;