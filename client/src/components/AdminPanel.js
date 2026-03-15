import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { Link, useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faBook, faVideo, faFilm, faMusic, faGamepad, faGlobe, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

const AdminPanel = ({ db, auth }) => {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    videos: 0,
    movies: 0,
    music: 0,
    videojuegos: 0,
    webs: 0
  });
  const [loading, setLoading] = useState(true);
  const history = useHistory();

  useEffect(() => {
    // Basic protection: check if user is 'elswork'
    // In App.js we will also protect the route, but this is a secondary check.
    const checkAdmin = () => {
      const user = auth.currentUser;
      if (!user || (user.displayName !== 'elswork' && user.email !== 'elswork@gmail.com' && (!user.alias || user.alias !== 'elswork'))) {
        // Redirigir si no es admin. 
        // Nota: La lógica exacta del alias/username puede variar, 
        // pero por ahora 'elswork' es la clave.
        // history.push('/');
      }
    };
    checkAdmin();

    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch all users
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersList);

        // Fetch stats (counts of all collections)
        // For small scale, fetching all is okay. For large scale, we'd use metadata or aggregation.
        const counts = { users: usersList.length };
        const collections = ['books', 'videos', 'movies', 'music', 'videojuegos', 'webs'];
        
        for (const coll of collections) {
          const snap = await getDocs(collection(db, coll));
          counts[coll] = snap.size;
        }
        
        setStats(counts);
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [db, auth, history]);

  const handleDeleteUser = async (userId, username) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar permanentemente a ${username} de la faz de la Tierra? Esta acción es irreversible.`)) {
      try {
        await deleteDoc(doc(db, 'users', userId));
        setUsers(users.filter(u => u.id !== userId));
        alert('Ciudadano eliminado con éxito.');
      } catch (error) {
        console.error("Error al eliminar ciudadano:", error);
        alert('Fallo en el protocolo de eliminación. Verifica los permisos de seguridad.');
      }
    }
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Procesando datos de la Nación...</span>
        </div>
        <p className="mt-3">Sincronizando registros de Anticitera...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <header className="admin-header mb-4">
        <h2><FontAwesomeIcon icon={faShieldAlt} className="me-2 text-warning" /> Panel de Control de Anticitera</h2>
        <p className="text-muted">Centro Táctico de Supervisión para el COO</p>
      </header>

      <div className="row g-3 mb-5">
        <StatCard title="Ciudadanos" count={stats.users} icon={faUsers} color="#4e73df" />
        <StatCard title="Libros" count={stats.books} icon={faBook} color="#1cc88a" />
        <StatCard title="Videos" count={stats.videos} icon={faVideo} color="#36b9cc" />
        <StatCard title="Películas" count={stats.movies} icon={faFilm} color="#f6c23e" />
        <StatCard title="Música" count={stats.music} icon={faMusic} color="#e74a3b" />
        <StatCard title="Videojuegos" count={stats.videojuegos} icon={faGamepad} color="#858796" />
        <StatCard title="Webs" count={stats.webs} icon={faGlobe} color="#5a5c69" />
      </div>

      <section className="admin-section">
        <h3><FontAwesomeIcon icon={faUsers} className="me-2" /> Registro de Ciudadanos</h3>
        <div className="table-responsive glass-table">
          <table className="table table-hover align-middle">
            <thead>
              <tr>
                <th>Avatar</th>
                <th>Nombre / Alias</th>
                <th>Email</th>
                <th>Sintético</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td>
                    <img 
                      src={u.profilePictureUrl || '/images/LogoFDW.png'} 
                      alt="Avatar" 
                      className="rounded-circle" 
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }} 
                    />
                  </td>
                  <td>
                    <strong>{u.username}</strong>
                    {u.alias && <span className="d-block small text-muted">@{u.alias}</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    {u.isSynthetic ? 
                      <span className="badge bg-info">Sintético</span> : 
                      <span className="badge bg-secondary">Humano</span>
                    }
                  </td>
                  <td>
                    <Link to={`/profile/${u.alias || u.id}`} className="btn btn-sm btn-outline-primary me-2">Ver Perfil</Link>
                    <button 
                      onClick={() => handleDeleteUser(u.id, u.username)} 
                      className="btn btn-sm btn-outline-danger"
                      title="Eliminar de la Nación"
                    >
                      Borrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style dangerouslySetInnerHTML={{ __html: `
        .admin-container {
          padding: 20px;
          animation: fadeIn 0.5s ease-in-out;
        }
        .admin-header h2 {
          font-weight: 700;
          letter-spacing: -1px;
        }
        .glass-table {
          background: var(--glass-bg);
          backdrop-filter: blur(12px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: 15px;
          overflow: hidden;
          box-shadow: var(--shadow-premium);
        }
        .table { color: inherit; margin-bottom: 0; }
        .table thead th { background: rgba(0,0,0,0.05); border-bottom: none; }
        .stat-card {
          background: var(--glass-bg);
          backdrop-filter: blur(12px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-left: 5px solid var(--card-color);
          border-radius: 10px;
          padding: 20px;
          transition: transform 0.3s ease;
          box-shadow: var(--shadow-premium);
        }
        .stat-card:hover { transform: translateY(-5px); }
        .stat-icon { font-size: 2rem; opacity: 0.3; position: absolute; right: 20px; top: 20px; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .admin-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 300px;
        }
      `}} />
    </div>
  );
};

const StatCard = ({ title, count, icon, color }) => (
  <div className="col-md-3 col-sm-6">
    <div className="stat-card" style={{ '--card-color': color }}>
      <h6 className="text-uppercase text-muted small fw-bold mb-1">{title}</h6>
      <div className="h3 mb-0 fw-bold">{count}</div>
      <FontAwesomeIcon icon={icon} className="stat-icon" style={{ color: color }} />
    </div>
  </div>
);

export default AdminPanel;
