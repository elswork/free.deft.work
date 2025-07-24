import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { useHistory } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUserPlus, faSignInAlt } from '@fortawesome/free-solid-svg-icons';

function AuthForm({ auth }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState(null);
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert('Registro exitoso. ¡Ahora puedes iniciar sesión!');
        setIsRegistering(false); // Cambiar a modo de inicio de sesión después del registro
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        history.push('/'); // Redirigir a la página principal después del inicio de sesión
      }
    } catch (err) {
      setError(err.message);
      console.error("Error de autenticación:", err);
    }
  };

  return (
    <div className="container mt-5">
      <div className="card p-4 shadow-sm mx-auto" style={{ maxWidth: '400px' }}>
        <h2 className="card-title text-center mb-4">{isRegistering ? 'Registrarse' : 'Iniciar Sesión'}</h2>
        {error && <div className="alert alert-danger">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="emailInput" className="form-label">Correo Electrónico</label>
            <input
              type="email"
              className="form-control"
              id="emailInput"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="passwordInput" className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              id="passwordInput"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">
            {isRegistering ? <><FontAwesomeIcon icon={faUserPlus} /> Registrarse</> : <><FontAwesomeIcon icon={faSignInAlt} /> Iniciar Sesión</>}
          </button>
        </form>
        <p className="text-center mt-3">
          {isRegistering ? (
            <>¿Ya tienes una cuenta? <button className="btn btn-link p-0" onClick={() => setIsRegistering(false)}>Iniciar Sesión</button></>
          ) : (
            <>¿No tienes una cuenta? <button className="btn btn-link p-0" onClick={() => setIsRegistering(true)}>Registrarse</button></>
          )}
        </p>
      </div>
    </div>
  );
}

export default AuthForm;