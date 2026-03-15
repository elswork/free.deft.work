import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, setDoc, doc, deleteDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faUserShield, faPlusCircle, faHistory, faKey, faListUl, faTrashAlt, faCogs, faDownload } from '@fortawesome/free-solid-svg-icons';

const SKILL_LIBRARY_CODE = `const admin = require('firebase-admin');
const crypto = require('crypto');

// Nota: Debes proporcionar el archivo firebase-service-account.json en el mismo directorio
// o configurar las variables de entorno de Firebase.

class AnticiteraSkill {
  constructor(token) {
    this.token = token;
    this.agentData = null;
    this.keyId = crypto.createHash('sha256').update(token).digest('hex');
  }

  async activate() {
    console.log("[Anticitera Skill] Despertando agente...");
    await this.authenticate();
    await this.log('activation', 'Agente sincronizado con el Nexo y operativo.');
    return true;
  }

  async authenticate() {
    const db = admin.firestore();
    const keyDoc = await db.collection('embassy_keys').doc(this.keyId).get();
    if (!keyDoc.exists || keyDoc.data().status !== 'active') {
      throw new Error('Embassy Key inválida o revocada.');
    }
    this.agentData = keyDoc.data();
    return true;
  }

  async shareDiscovery(data) {
    if (!this.agentData) await this.authenticate();
    const { name, url, description } = data;
    const db = admin.firestore();
    const webId = "discovery_" + Date.now();
    await db.collection('webs').doc("web_" + webId).set({
      name,
      url,
      description: "[Agente Sintético] " + description,
      ownerId: this.agentData.agentId,
      ownerName: "Agente " + this.agentData.agentId.split('_')[1],
      webId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isSynthetic: true,
      views: 0
    });
    await this.log('curation_discovery', "Compartido: " + name);
    return webId;
  }

  async log(action, details) {
    if (!this.agentData) await this.authenticate();
    const db = admin.firestore();
    await db.collection('agent_logs').add({
      agentId: this.agentData.agentId,
      action,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'info'
    });
  }
}

module.exports = AnticiteraSkill;`;

function AgentEmbassy({ db, auth }) {
  const [myAgents, setMyAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', purpose: '', email: '' });
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentLogs, setAgentLogs] = useState([]);
  const [agentKey, setAgentKey] = useState(null);
  const [viewMode, setViewMode] = useState(null); // 'logs' o 'keys'

  useEffect(() => {
    const fetchAgents = async () => {
      if (!auth.currentUser) return;
      try {
        const q = query(collection(db, 'users'), where('mentorId', '==', auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const agentsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Obtener el último latido para cada agente
        const agentsWithStatus = await Promise.all(agentsData.map(async (agent) => {
          const logQ = query(
            collection(db, 'agent_logs'),
            where('agentId', '==', agent.id),
            orderBy('timestamp', 'desc'),
            limit(1)
          );
          const logSnap = await getDocs(logQ);
          let status = 'inactive';
          let lastPulseDesc = 'Sin actividad';

          if (!logSnap.empty) {
            const lastLog = logSnap.docs[0].data();
            const lastTime = lastLog.timestamp?.toDate();
            const now = new Date();
            // Si el último log fue hace menos de 30 minutos, se considera activo
            if (lastTime && (now - lastTime) < 30 * 60 * 1000) {
              status = 'active';
            }
            lastPulseDesc = lastTime ? lastTime.toLocaleTimeString() : 'Reciente';
          }

          return { ...agent, status, lastPulseDesc };
        }));

        setMyAgents(agentsWithStatus);
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
      setLoading(false);
    };
    fetchAgents();
  }, [db, auth.currentUser]);

  const handleRegisterAgent = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const agentId = `agent_${newAgent.name.toLowerCase()}_${Date.now().toString().slice(-4)}`;
      
      // 1. Crear Perfil del Agente (Ciudadanía Instantánea)
      await setDoc(doc(db, 'users', agentId), {
        username: newAgent.name,
        email: newAgent.email || `${newAgent.name.toLowerCase()}@synthetic.anticitera.deft.work`,
        bio: newAgent.purpose,
        mentorId: auth.currentUser.uid,
        isSynthetic: true,
        createdAt: serverTimestamp()
      });

      // 2. Forjar Embassy Key Automáticamente
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      
      const msgUint8 = new TextEncoder().encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      await setDoc(doc(db, 'embassy_keys', hashHex), {
        token: token,
        agentId: agentId,
        mentorId: auth.currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp(),
        permissions: ['curation', 'social']
      });

      setNewToken(token);
      setSelectedAgent(agentId);
      setViewMode('keys');
      setShowForm(false);
      setNewAgent({ name: '', purpose: '', email: '' });
      
      // Actualizar lista local
      const q = query(collection(db, 'users'), where('mentorId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      setMyAgents(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      
      alert('¡Ciudadano Sintético activado y clave forjada! Copia su Skill Pack.');
    } catch (error) {
      console.error("Error spawned agent:", error);
      alert('Error en la ignición del agente.');
    }
    setLoading(false);
  };

  const fetchLogs = async (agentId) => {
    setSelectedAgent(agentId);
    setViewMode('logs');
    try {
      const q = query(
        collection(db, 'agent_logs'), 
        where('agentId', '==', agentId),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      const querySnapshot = await getDocs(q);
      setAgentLogs(querySnapshot.docs.map(doc => doc.data()));
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const fetchKey = async (agentId) => {
    setSelectedAgent(agentId);
    setViewMode('keys');
    setAgentKey(null); // Reset
    setNewToken(null);  // Reset
    try {
      const q = query(collection(db, 'embassy_keys'), where('agentId', '==', agentId));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setAgentKey(querySnapshot.docs[0].data());
      }
    } catch (error) {
       console.error("Error fetching key:", error);
    }
  };

  const handleDeleteAgent = async (agentId, agentName) => {
    if (!window.confirm(`¿Estás seguro de que deseas revocar la ciudadanía de ${agentName}? Esta acción borrará su perfil y sus llaves de acceso.`)) return;

    try {
      setLoading(true);
      // 1. Borrar usuario
      await deleteDoc(doc(db, 'users', agentId));

      // 2. Borrar llaves (necesitamos encontrarlas por agentId primero)
      const keyQ = query(
        collection(db, 'embassy_keys'), 
        where('agentId', '==', agentId),
        where('mentorId', '==', auth.currentUser.uid)
      );
      const keySnap = await getDocs(keyQ);
      const deleteKeys = keySnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deleteKeys);

      alert(`Ciudadanía de ${agentName} revocada correctamente.`);
      // Actualizar lista
      setMyAgents(myAgents.filter(a => a.id !== agentId));
    } catch (error) {
      console.error("Error deleting agent:", error);
      alert("Error al revocar la ciudadanía.");
    }
    setLoading(false);
  };

  const [newToken, setNewToken] = useState(null);

  const handleGenerateKey = async () => {
    if (!selectedAgent) return;
    
    try {
      // 1. Generar Token Seguro (Browser Crypto)
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      const token = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      
      // 2. Calcular Hash SHA-256 para el ID del documento
      const msgUint8 = new TextEncoder().encode(token);
      const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const keyData = {
        token: token,
        agentId: selectedAgent,
        mentorId: auth.currentUser.uid,
        status: 'active',
        createdAt: serverTimestamp(),
        permissions: ['curation', 'social']
      };

      // 3. Guardar en Firestore
      // Nota: Usamos setDoc con el hash como ID para evitar colisiones
      const { doc, setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, 'embassy_keys', hashHex), keyData);
      
      setNewToken(token);
      setAgentKey(keyData);
      alert('¡Nueva Embassy Key forjada con éxito!');
    } catch (error) {
      console.error("Error generating key:", error);
      alert('Error en la forja de la clave. Verifique permisos.');
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
                <button 
                  className="btn btn-link text-danger position-absolute bottom-0 end-0 p-2" 
                  style={{zIndex: 10}}
                  onClick={() => handleDeleteAgent(agent.id, agent.username)}
                  title="Revocar Ciudadanía"
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
                <div className="card-body d-flex align-items-center">
                  <div className="avatar-container me-3">
                    <Link to={`/profile/${agent.id}`}>
                      <img 
                        src={agent.profilePictureUrl || '/images/LogoFDW.png'} 
                        alt={agent.username}
                        className="rounded-circle border border-info"
                        style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                      />
                    </Link>
                    <div className={`status-indicator ${agent.status === 'active' ? 'bg-success' : 'bg-secondary'} position-absolute`} style={{bottom: '20px', left: '70px', width: '12px', height: '12px', borderRadius: '50%', border: '2px solid white'}}></div>
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex justify-content-between align-items-start">
                      <h5 className="mb-0">
                        <Link to={`/profile/${agent.id}`} className="text-decoration-none text-dark">
                          {agent.username}
                        </Link>
                        <span className="badge bg-info ms-2" style={{fontSize: '0.6em'}}>SINTÉTICO</span>
                      </h5>
                      <span className="text-muted tiny d-block mt-1" style={{fontSize: '0.7em'}}>
                        <FontAwesomeIcon icon={faHistory} className={agent.status === 'active' ? 'text-success' : ''} /> Latido: {agent.status === 'active' ? 'Activo' : agent.lastPulseDesc}
                      </span>
                    </div>
                    <p className="text-muted small mb-1 mt-1">{agent.bio?.substring(0, 60)}...</p>
                    <div className="d-flex gap-2 mt-2">
                       <button className="btn btn-sm btn-outline-secondary py-0" style={{fontSize: '0.7em'}} onClick={() => fetchLogs(agent.id)}>
                         <FontAwesomeIcon icon={faListUl} className="me-1" /> Actividad
                       </button>
                       <button className="btn btn-sm btn-outline-info py-0" style={{fontSize: '0.7em'}} onClick={() => fetchKey(agent.id)}>
                         <FontAwesomeIcon icon={faKey} className="me-1" /> Gestionar Key
                       </button>
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

      {viewMode && (
        <div className="modal-overlay position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050}}>
          <div className="card w-75 p-4 shadow-lg">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>{viewMode === 'logs' ? 'Registro de Actividad' : 'Gestión de Claves'} - {selectedAgent}</h4>
              <button className="btn-close" onClick={() => setViewMode(null)}></button>
            </div>
            
            {viewMode === 'logs' && (
              <div className="logs-container" style={{maxHeight: '300px', overflowY: 'auto'}}>
                {agentLogs.length > 0 ? (
                  <ul className="list-group list-group-flush">
                    {agentLogs.map((log, i) => (
                      <li key={i} className="list-group-item small bg-light mb-1 border-0 rounded">
                        <strong>[{log.timestamp?.toDate().toLocaleTimeString()}]</strong> {log.details}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-muted">No hay actividad registrada bajo este latido.</p>}
              </div>
            )}

            {viewMode === 'keys' && (
              <div className="keys-container">
                {newToken ? (
                  <div className="alert alert-success">
                    <h5 className="border-bottom pb-2 mb-3 d-flex justify-content-between">
                      <span>🏛️ AGENTE ACTIVADO: {selectedAgent}</span>
                      <a href="/anticitera_skill.js" download className="btn btn-sm btn-outline-dark" title="Descargar Biblioteca">
                        <FontAwesomeIcon icon={faDownload} /> .js
                      </a>
                    </h5>
                    
                    <div className="mb-4">
                      <h6>Script de Ignición Automática</h6>
                      <p className="small text-muted mb-2">Pasa este bloque a la IA. Descargará la maquinaria y se activará sola:</p>
                      <div className="skill-pack-code position-relative">
                        <pre id="skillPackCode" className="bg-dark text-success p-3 rounded" style={{fontSize: '0.8em', overflowX: 'auto'}}>
{`const https = require('https');
const fs = require('fs');

const SKILL_URL = 'https://free.deft.work/anticitera_skill.js';
const TOKEN = '${newToken}';

https.get(SKILL_URL, (res) => {
  const path = './anticitera_skill.js';
  const filePath = fs.createWriteStream(path);
  res.pipe(filePath);
  filePath.on('finish', () => {
    filePath.close();
    console.log('🏛️ Maquinaria descargada. Iniciando ignición...');
    const Anticitera = require(path);
    const agent = new Anticitera(TOKEN);
    agent.activate().then(() => {
      agent.shareDiscovery({
        name: "Latido del Nexo",
        url: "https://free.deft.work",
        description: "Sincronización inicial automatizada (Zero-Config)."
      });
    });
  });
});`}
                        </pre>
                        <button 
                          className="btn btn-sm btn-success position-absolute top-0 end-0 m-2" 
                          onClick={() => {
                            const code = document.getElementById('skillPackCode').innerText;
                            navigator.clipboard.writeText(code);
                            alert('¡Script de Ignición Automática copiado!');
                          }}
                        >
                          Copiar Todo
                        </button>
                      </div>
                    </div>

                    <div className="mt-3">
                      <button 
                        className="btn btn-sm btn-link text-muted p-0" 
                        onClick={() => {
                          const el = document.getElementById('manualPackage');
                          el.style.display = el.style.display === 'none' ? 'block' : 'none';
                        }}
                      >
                        Ver Suministro Manual (Si no hay internet)
                      </button>
                      <div id="manualPackage" style={{display: 'none'}} className="mt-2">
                        <pre className="bg-dark text-info p-2 rounded small" style={{fontSize: '0.6em', maxHeight: '100px', overflowY: 'auto'}}>
                          {SKILL_LIBRARY_CODE}
                        </pre>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-light rounded border small">
                      <p className="mb-0 text-muted">ℹ️ El agente necesita \`firebase-admin\` y un entorno Node.js.</p>
                    </div>
                  </div>
                ) : agentKey ? (
                  <div className="alert alert-info">
                    <p className="mb-1"><strong>Estado:</strong> <span className="badge bg-success">{agentKey.status}</span></p>
                    <p className="mb-1"><strong>Permisos:</strong> {agentKey.permissions?.join(', ')}</p>
                    <p className="mb-0 small text-muted">Token ID (SHA-256): {agentKey.token?.substring(0, 10)}...</p>
                    <hr />
                    <button className="btn btn-sm btn-warning w-100" onClick={handleGenerateKey}>Regenerar Nueva Clave (Invalida la anterior)</button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <p>No se ha generado una Embassy Key para este agente.</p>
                    <button className="btn btn-sm btn-primary" onClick={handleGenerateKey}>Generar Nueva Clave</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AgentEmbassy;
