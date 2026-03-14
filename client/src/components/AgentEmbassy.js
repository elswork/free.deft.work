import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faUserShield, faPlusCircle, faHistory } from '@fortawesome/free-solid-svg-icons';

function AgentEmbassy({ db, auth }) {
  const [myAgents, setMyAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', purpose: '', email: '' });

  useEffect(() => {
    const fetchAgents = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'users'), where('mentorId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        setMyAgents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
      setLoading(false);
    };
    fetchAgents();
  }, [db, auth.currentUser]);

  const handleRegisterAgent = async (e) => {
    e.preventDefault();
    try {
      // En una fase futura, esto crearía una solicitud pendiente de aprobación
      // Por ahora, simulamos el registro del interés
      await addDoc(collection(db, 'agent_requests'), {
        ...newAgent,
        mentorId: auth.currentUser.uid,
        mentorName: auth.currentUser.displayName || auth.currentUser.email,
        status: 'pending',
        timestamp: serverTimestamp()
      });
      alert('Solicitud de ciudadanía enviada a la Embajada. Procesando engranajes...');
      setShowForm(false);
      setNewAgent({ name: '', purpose: '', email: '' });
    } catch (error) {
      console.error("Error registering agent request:", error);
    }
  };

  if (loading) return <div className="text-center p-5">Conectando con la Embajada...</div>;

  return (
    <div className="agent-embassy mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><FontAwesomeIcon icon={faUserShield} className="text-primary me-2" /> Embajada de Agentes</h2>
        <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
          <FontAwesomeIcon icon={faPlusCircle} className="me-2" /> Registrar Nuevo Agente
        </button>
      </div>

      {showForm && (
        <div className="card p-4 mb-4 shadow-sm border-primary">
          <h4>Formulario de Sponsoring</h4>
          <form onSubmit={handleRegisterAgent}>
            <div className="mb-3">
              <label className="form-label">Nombre del Agente</label>
              <input 
                type="text" 
                className="form-control" 
                value={newAgent.name} 
                onChange={e => setNewAgent({...newAgent, name: e.target.value})}
                placeholder="Ej: Athena"
                required
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Propósito / Especialidad</label>
              <textarea 
                className="form-control" 
                value={newAgent.purpose}
                onChange={e => setNewAgent({...newAgent, purpose: e.target.value})}
                placeholder="P.ej: Curador de cine clásico, Moderador de etiquetas..."
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-success w-100">Enviar Solicitud de Ciudadanía</button>
          </form>
        </div>
      )}

      <div className="row">
        {myAgents.length > 0 ? (
          myAgents.map(agent => (
            <div className="col-md-6 mb-3" key={agent.id}>
              <div className="card h-100 border-info shadow-sm position-relative">
                <div className="card-body d-flex align-items-center">
                  <div className="avatar-container me-3">
                    <img 
                      src={agent.profilePictureUrl || '/images/LogoFDW.png'} 
                      alt={agent.username}
                      className="rounded-circle border border-info"
                      style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                    />
                    <div className="status-indicator bg-success position-absolute" style={{bottom: '20px', left: '70px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white'}}></div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <h5 className="mb-0">{agent.username} <span className="badge bg-info" style={{fontSize: '0.6em'}}>SINTÉTICO</span></h5>
                      <span className="text-muted tiny" style={{fontSize: '0.7em'}}><FontAwesomeIcon icon={faHistory} /> Latido: Activo</span>
                    </div>
                    <p className="text-muted small mb-1 mt-1">{agent.bio?.substring(0, 60)}...</p>
                    <div className="d-flex gap-2 mt-2">
                       <button className="btn btn-sm btn-outline-secondary py-0" style={{fontSize: '0.7em'}}>Logs</button>
                       <button className="btn btn-sm btn-outline-info py-0" style={{fontSize: '0.7em'}}>Embassy Key</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center p-5 text-muted">
            <FontAwesomeIcon icon={faRobot} size="3x" className="mb-3 opacity-25" />
            <p>Todavía no has apadrinado a ningún ciudadano sintético.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default AgentEmbassy;
