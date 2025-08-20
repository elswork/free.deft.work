import React, { useEffect, useState } from 'react';
import firebaseConfig from './firebaseConfig';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faSignInAlt, faSignOutAlt, faUser, faInfoCircle, faBook, faExternalLinkAlt, faPaperPlane, faEdit, faTrashAlt, faPlus, faSave, faTimes, faSearch, faBell, faVideo, faFilm, faMusic } from '@fortawesome/free-solid-svg-icons';
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
  const [notification, setNotification] = useState({ title: '', body: '' });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);

        // Base user data payload
        const userData = {
          uid: currentUser.uid,
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
          await setDoc(userRef, { ...userData, followers: [], following: [] }, { merge: true });
        } else {
          console.log('Existing user, merging data...');
          await setDoc(userRef, userData, { merge: true });
        }

        setUser(currentUser);
      } else {
        setUser(null);
      }
    });

    onMessageListener()
      .then((payload) => {
        setNotification({ title: payload.notification.title, body: payload.notification.body });
      })
      .catch((err) => console.log('failed: ', err));

    return () => unsubscribe();
  }, [db]);

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
                <Link className="btn btn-outline-primary mx-1" to="/libro"><FontAwesomeIcon icon={faBook} /> Libro</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/videos"><FontAwesomeIcon icon={faVideo} /> Videoteca</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/movies"><FontAwesomeIcon icon={faFilm} /> Películas</Link>
              </li>
              <li className="nav-item">
                <Link className="btn btn-outline-primary mx-1" to="/music"><FontAwesomeIcon icon={faMusic} /> Videoclips</Link>
              </li>
              <li className="nav-item">
                <a className="btn btn-outline-info mx-1" href="https://github.com/elswork/free.deft.work/blob/main/README.md" target="_blank" rel="noopener noreferrer"><FontAwesomeIcon icon={faGithub} /> Acerca de</a>
              </li>
              {user && (
                <li className="nav-item">
                  <Link className="btn btn-outline-primary mx-1" to={`/profile/${user.uid}`}><FontAwesomeIcon icon={faUser} /> Perfil</Link>
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
                  <>
                    <div className="card p-4 shadow-sm mx-auto mb-4" style={{ maxWidth: '800px' }}>
                      <h2 className="card-title text-center mb-4">📚 Free Deft Work: El Poder de un Libro Viajero 🚀</h2>
                      <p className="text-justify">¡Bienvenido a <strong>Free Deft Work: El Poder de un Libro Viajero</strong>! Esta plataforma transforma la forma en que interactúas con los libros, convirtiendo cada ejemplar en un puente entre personas. Aquí, cada libro que compartes, equipado con su <strong>código QR único</strong> 🏷️, se suma a una red de conexiones que se extiende con cada paso de mano en mano, ya sea por donación, préstamo o como un regalo. Podrás seguir el recorrido de tus libros 🗺️, descubrir quién los ha leído y las impresiones que han dejado. 💖</p>
                      <p className="text-justify">Para comenzar, es muy sencillo: <strong>da de alta tu libro en nuestro formulario web</strong> 📝. Ahora, puedes <strong>escanear el ISBN de tu libro con la cámara</strong> 📸, y la aplicación autocompletará automáticamente el título, autor, descripción y hasta la portada, ¡haciendo el proceso mucho más rápido y profesional! Una vez registrado, <strong>imprime las etiquetas con el código QR</strong> 🖨️ que el sistema generará y <strong>pégaselas directamente al libro</strong>. Así de fácil, tu libro estará listo para viajar y compartir su historia. 📖 Nuestra aplicación web está diseñada para hacer que la gestión y el intercambio de libros sean sencillos y enriquecedores. Simplemente escanea el código QR de un libro para acceder a todos sus detalles y su historial de viajes. 📲 Además, te invitamos a unirte a nuestra <strong>comunidad vibrante</strong> en el foro interactivo. 🗣️ Allí podrás compartir tus ideas, debatir sobre lecturas, descubrir nuevos títulos y conectar con otros amantes de los libros, extendiendo la vida de cada ejemplar más allá de sus páginas. ✨</p>
                    </div>
                    <YouTubeSearch db={db} auth={auth} />
                  </>
                ) : (
                  <>
                    {showWelcomeSection && (
                      <div className="card p-4 shadow-sm mx-auto mb-4" style={{ maxWidth: '600px' }}>
                        <h2 className="card-title text-center mb-4">📚 Free Deft Work: El Poder de un Libro Viajero 🚀</h2>
                        <p className="text-justify">¡Bienvenido a <strong>Free Deft Work: El Poder de un Libro Viajero</strong>! Esta plataforma transforma la forma en que interactúas con los libros, convirtiendo cada ejemplar en un puente entre personas. Aquí, cada libro que compartes, equipado con su <strong>código QR único</strong> 🏷️, se suma a una red de conexiones que se extiende con cada paso de mano en mano, ya sea por donación, préstamo o como un regalo. Podrás seguir el recorrido de tus libros 🗺️, descubrir quién los ha leído y las impresiones que han dejado. 💖</p>
                        <p className="text-justify">Para comenzar, es muy sencillo: <strong>da de alta tu libro en nuestro formulario web</strong> 📝. Ahora, puedes <strong>escanear el ISBN de tu libro con la cámara</strong> 📸, y la aplicación autocompletará automáticamente el título, autor, descripción y hasta la portada, ¡haciendo el proceso mucho más rápido y profesional! Una vez registrado, <strong>imprime las etiquetas con el código QR</strong> 🖨️ que el sistema generará y <strong>pégaselas directamente al libro</strong>. Así de fácil, tu libro estará listo para viajar y compartir su historia. 📖 Nuestra aplicación web está diseñada para hacer que la gestión y el intercambio de libros sean sencillos y enriquecedores. Simplemente escanea el código QR de un libro para acceder a todos sus detalles y su historial de viajes. 📲 Además, te invitamos a unirte a nuestra <strong>comunidad vibrante</strong> en el foro interactivo. 🗣️ Allí podrás compartir tus ideas, debatir sobre lecturas, descubrir nuevos títulos y conectar con otros amantes de los libros, extendiendo la vida de cada ejemplar más allá de sus páginas. ✨</p>
                        <button className="btn btn-primary w-100 mt-3" onClick={() => setShowWelcomeSection(false)}>Entendido 👍</button>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="lead">Por favor, inicia sesión para continuar.</p>
                      <button className="btn btn-primary" onClick={handleSignIn}><FontAwesomeIcon icon={faGoogle} /> Iniciar Sesión con Google</button>
                    </div>
                  </>
                )}
              </>
            )} />
            <Route path="/libro" exact render={(props) => (
              <div className="text-center">
                <p className="lead">¡Bienvenido, {user.displayName}!</p>
                <BookList auth={auth} db={db} storage={storage} />
              </div>
            )} />
            <Route path="/videos/:videoId" component={() => <VideoDetail db={db} />} />
            <Route path="/videos" component={() => <VideoList db={db} auth={auth} />} />
            <Route path="/movies/:movieId" component={() => <MovieDetail db={db} />} />
            <Route path="/movies" component={() => <MovieList db={db} auth={auth} />} />
            <Route path="/music/:musicId" component={() => <MusicDetail db={db} />} />
            <Route path="/music" component={() => <MusicList db={db} auth={auth} />} />
            <Route path="/auth" component={() => <AuthForm auth={auth} />} />
            <Route path="/profile/:userId" component={() => <UserProfile db={db} storage={storage} auth={auth} />} />
            <Route path="/admin/youtube-search" component={() => <YouTubeSearch db={db} auth={auth} />} />
            <Route path="/:webId" component={() => <BookDetail db={db} auth={auth} />} />
          </Switch>
        </main>
      </div>
    </Router>
  );
}

export default App;