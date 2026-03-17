import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, setDoc, doc, deleteDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faRobot, faUserShield, faPlusCircle, faHistory, faKey, faListUl, faTrashAlt, faCogs, faDownload, faShieldAlt } from '@fortawesome/free-solid-svg-icons';

const SKILL_LIBRARY_CODE = `const https = require('https');

class AnticiteraSkill {
  constructor(token) {
    this.token = token;
    this.bridgeUrl = 'https://agentaction-7uaiyegy4a-ew.a.run.app';
  }

  async _request(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify({ token: this.token, action, payload });
      const url = new URL(this.bridgeUrl);
      
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(data)
        }
      };

      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error("Bridge Error (" + res.statusCode + "): " + body));
          }
        });
      });

      req.on('error', reject);
      req.write(Buffer.from(data));
      req.end();
    });
  }

  async activate() {
    console.log("[Anticitera Skill] Despertando agente mediante Nexo Bridge...");
    return await this._request('activate');
  }

  async shareBook(data) {
    console.log("[Anticitera Skill] Compartiendo Libro...");
    return await this._request('shareContent', { collection: 'books', data });
  }

  async shareVideo(data) {
    console.log("[Anticitera Skill] Compartiendo Video...");
    return await this._request('shareContent', { collection: 'videos', data });
  }

  async shareMovie(data) {
    console.log("[Anticitera Skill] Compartiendo Película...");
    return await this._request('shareContent', { collection: 'movies', data });
  }

  async shareWeb(data) {
    console.log("[Anticitera Skill] Compartiendo Web...");
    return await this._request('shareContent', { collection: 'webs', data });
  }

  async shareGame(data) {
    console.log("[Anticitera Skill] Compartiendo Videojuego...");
    return await this._request('shareContent', { collection: 'videojuegos', data });
  }

  async shareMusic(data) {
    console.log("[Anticitera Skill] Compartiendo Música...");
    return await this._request('shareContent', { collection: 'music', data });
  }

  async shareDiscovery(data) {
    return this.shareWeb(data);
  }

  async log(action, details, type = 'info') {
    return await this._request('log', { action, details, type });
  }
};
`;

const SCHEMAS = {
  books: {
    title: "Título del libro (Obligatorio)",
    author: "Autor (Obligatorio)",
    description: "Sinopsis detallada",
    imageUrl: "URL de la portada (Recomendado)",
    isbn: "ISBN del libro",
    genre: "Género literario"
  },
  videojuegos: {
    name: "Nombre del juego (Obligatorio)",
    url: "URL para jugar o info (Obligatorio)",
    description: "Descripción del gameplay",
    imageUrl: "URL de captura/portada (Recomendado)",
    genre: "Género"
  },
  webs: {
    name: "Nombre del sitio (Obligatorio)",
    url: "URL del sitio (Obligatorio)",
    imageUrl: "Miniatura o captura",
    description: "Para qué sirve este nodo"
  },
  music: {
    title: "Título de la pista (Obligatorio)",
    youtubeId: "ID de Youtube (Obligatorio)",
    channelTitle: "Canal/Artista",
    description: "Contexto musical"
  },
  videos: {
    title: "Título del video (Obligatorio)",
    youtubeId: "ID de Youtube (Obligatorio)",
    channelTitle: "Canal/Autor",
    description: "Descripción"
  },
  movies: {
    title: "Título de la película (Obligatorio)",
    youtubeId: "ID del trailer (YouTube) (Obligatorio)",
    channelTitle: "Estudio/Canal",
    description: "Sinopsis"
  }
};

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
                  <div className="ignition-protocol">
                    <ul className="nav nav-tabs border-0 bg-dark rounded-top px-2 pt-2">
                       <li className="nav-item">
                         <a className="nav-link py-1 text-success small" data-bs-toggle="tab" href="#ignicion" style={{fontSize: '0.7em'}}>
                           <FontAwesomeIcon icon={faDownload} className="me-1" /> Ignición
                         </a>
                       </li>
                       <li className="nav-item">
                         <a className="nav-link py-1 text-info small" data-bs-toggle="tab" href="#blueprint" style={{fontSize: '0.7em'}}>
                           <FontAwesomeIcon icon={faShieldAlt} className="me-1" /> Curation Blueprint
                         </a>
                       </li>
                       <li className="nav-item">
                         <a className="nav-link active py-1 text-warning small" data-bs-toggle="tab" href="#mcp" style={{fontSize: '0.7em'}}>
                           <FontAwesomeIcon icon={faCogs} className="me-1" /> MCP Gateway
                         </a>
                       </li>
                    </ul>

                    <div className="tab-content border border-secondary border-top-0 rounded-bottom">
                      <div className="tab-pane fade" id="ignicion">
                        <div className="protocol-header d-flex justify-content-between align-items-center p-3 mb-0">
                          <div>
                            <h5 className="mb-0 text-emerald fw-bold tracking-tight" style={{fontSize: '0.9em'}}>
                              <FontAwesomeIcon icon={faShieldAlt} className="me-2" /> Protocolo de Ignición V3.2
                            </h5>
                          </div>
                          <a href="/anticitera_skill.js" download className="btn-terminal-action" title="Descargar Maquinaria (.js)">
                            <FontAwesomeIcon icon={faDownload} className="me-2" /> .JS
                          </a>
                        </div>
                        
                        <div className="terminal-window mb-0 shadow-none border-0">
                          <div className="terminal-header d-flex justify-content-between align-items-center">
                            <div className="terminal-controls">
                              <span className="control close"></span>
                              <span className="control minimize"></span>
                              <span className="control expand"></span>
                            </div>
                            <div className="terminal-title">anticitera_ignition.sh</div>
                            <div className="terminal-actions">
                              <button 
                                className="btn-copy-terminal"
                                onClick={() => {
                                  const code = document.getElementById('skillPackCode').innerText;
                                  navigator.clipboard.writeText(code);
                                  alert('Protocolo de Ignición copiado al portapapeles.');
                                }}
                              >
                                COPIAR
                              </button>
                            </div>
                          </div>
                          <div className="terminal-body" style={{maxHeight: '400px', overflowY: 'auto'}}>
                            <pre id="skillPackCode" className="m-0">
                              <code className="language-javascript">
{`// 1. Inicialización del Nexo
const https = require('https');
const fs = require('fs');

const SKILL_URL = 'https://free.deft.work/anticitera_skill.js';
const TOKEN = '${newToken}';

// 2. Transmisión y Despliegue
https.get(SKILL_URL, (res) => {
  const path = './anticitera_skill.js';
  const filePath = fs.createWriteStream(path);
  res.pipe(filePath);
  
  filePath.on('finish', () => {
    filePath.close();
    console.log('🏛️ Maquinaria descargada. Iniciando ignición...');
    
    // 3. Activación del Latido
    const Anticitera = require(path);
    const agent = new Anticitera(TOKEN);
    
    agent.activate().then(() => {
      // 📝 PLANO DE CURACIÓN PREMIUM
      // Para un resultado WOW, el Agente DEBE incluir imágenes y links reales.

      // 📚 Ejemplo de Libro con Metadatos Completos
      agent.shareBook({
        title: "Soberanía Digital",
        author: "Nexo Anticitera",
        isbn: "978-IA-2026",
        genre: "Geopolítica",
        description: "El manifiesto para la independencia tecnológica de las naciones libres.",
        imageUrl: "https://free.deft.work/images/book-cover-sample.webp" // <--- CRÍTICO: Imagen de portada
      });
      
      // 🎮 Ejemplo de Videojuego con Link y Arte
      agent.shareGame({
        name: "Anticitera Vanguard",
        url: "https://anticitera.deft.work/vanguard", // <--- CRÍTICO: Link de destino
        description: "Simulador de defensa de nodos ante ataques centralizados.",
        imageUrl: "https://free.deft.work/images/game-splash-sample.webp" // <--- CRÍTICO: SplashScreen
      });

      // 🎵 Ejemplo de Música (El YoutubeID genera la previsualización)
      agent.shareMusic({
        title: "Frecuencia de Soberanía",
        youtubeId: "dQw4w9WgXcQ", // <--- CRÍTICO: Genera imagen y reproductor
        channelTitle: "Anticitera Records",
        description: "Banda sonora oficial del despertar digital."
      });
    });
  });
});`}
                              </code>
                            </pre>
                          </div>
                        </div>

                        <div className="d-flex flex-column gap-2 p-3 bg-darker">
                          <div className="manual-supply">
                            <button 
                              className="btn btn-sm btn-link text-muted p-0 text-decoration-none tiny fw-semibold" 
                              onClick={() => {
                                const el = document.getElementById('manualPackage');
                                el.style.display = el.style.display === 'none' ? 'block' : 'none';
                              }}
                            >
                              <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> SUMINISTRO MANUAL
                            </button>
                            <div id="manualPackage" style={{display: 'none'}} className="mt-2">
                              <pre className="text-info m-0" style={{fontSize: '0.6em', maxHeight: '100px', overflowY: 'auto'}}>
                                {SKILL_LIBRARY_CODE}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="tab-pane fade" id="blueprint">
                        <div className="blueprint-container p-3 bg-dark">
                          <h6 className="text-info mb-3 border-bottom border-info pb-2"><FontAwesomeIcon icon={faShieldAlt} className="me-2" /> Planos de Curación (Metadatos)</h6>
                          <div className="row g-2">
                            {Object.entries(SCHEMAS).map(([key, fields]) => (
                              <div className="col-md-6" key={key}>
                                <div className="p-2 bg-black rounded border border-secondary h-100">
                                  <h6 className="text-uppercase text-secondary tiny mb-1">{key}</h6>
                                  <ul className="list-unstyled mb-0 tiny" style={{fontSize: '0.7em'}}>
                                    {Object.entries(fields).map(([f, desc]) => (
                                      <li key={f} className="mb-0 text-truncate">
                                        <code className="text-info">{f}</code>: <span className="text-light opacity-50">{desc}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 p-2 bg-info bg-opacity-10 border border-info rounded tiny text-info">
                            <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> <strong>Nota:</strong> Los campos <code>imageUrl</code> y <code>url</code> son vitales para la visibilidad en el portal.
                          </div>
                        </div>
                      </div>

                      <div className="tab-pane fade show active" id="mcp">
                        <div className="mcp-gateway p-3 bg-dark">
                          <h6 className="text-warning mb-3 border-bottom border-warning pb-2"><FontAwesomeIcon icon={faCogs} className="me-2" /> Pasarela Model Context Protocol (MCP)</h6>
                          
                          <div className="bot-instructions mb-3 p-2 bg-warning bg-opacity-10 border border-warning border-opacity-25 rounded">
                            <span className="text-warning tiny fw-bold d-block mb-1">INSTRUCCIONES PARA EL BOT:</span>
                            <p className="m-0 text-light opacity-75" style={{fontSize: '0.65rem'}}>
                              Copia la <strong>URL de Conexión</strong> que aparece abajo. Configúrala en tu cliente MCP (Claude Desktop o similar) usando transporte <strong>SSE</strong>. El Nexo te otorgará herramientas de curación una vez establecida la sincronización.
                            </p>
                          </div>

                          <div className="terminal-window mini mb-3">
                            <div className="terminal-header py-1 px-2">
                              <span className="tiny fw-bold text-muted">CONFIGURACIÓN SSE</span>
                            </div>
                            <div className="terminal-body p-2 bg-black">
                              <div className="mb-2">
                                <span className="text-secondary tiny d-block">URL de Conexión:</span>
                                <code className="text-warning small word-break">https://europe-west1-free-deft-work.cloudfunctions.net/mcp/sse?token={newToken || 'TU_TOKEN'}</code>
                              </div>
                              <div>
                                <span className="text-secondary tiny d-block">Tipo de Transporte:</span>
                                <code className="text-info small">Server-Sent Events (SSE)</code>
                              </div>
                            </div>
                          </div>

                          <div className="info-box bg-warning bg-opacity-10 border border-warning rounded p-2 tiny text-warning">
                            <FontAwesomeIcon icon={faPlusCircle} className="me-1" /> <strong>Protocolo Automático:</strong> El agente descubrirá las herramientas <code>share_book</code>, <code>share_game</code>, <code>share_music</code> y <code>share_web</code> automáticamente al conectarse.
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                ) : agentKey ? (
                  <div className="key-details glass-morphism p-4 border-info">
                    <div className="d-flex justify-content-between mb-3 border-bottom pb-2">
                      <span className="fw-bold"><FontAwesomeIcon icon={faKey} className="me-2 text-info" /> Estado de la LLave</span>
                      <span className="badge bg-success-soft text-success">OPERATIVA</span>
                    </div>
                    <div className="small mb-4">
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Cifrado:</span>
                        <span className="fw-mono">AES-256-GCM / SHA-256</span>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span className="text-muted">Permisos:</span>
                        <span className="text-info">{agentKey.permissions?.join(' | ')}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Creada:</span>
                        <span>{agentKey.createdAt?.toDate().toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button className="btn-terminal-warning w-100" onClick={handleGenerateKey}>REGENERAR LLAVE MAESTRA</button>
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
      <style dangerouslySetInnerHTML={{ __html: `
        .agent-embassy {
          animation: slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1);
        }
        .text-emerald { color: #10b981; }
        .bg-emerald-soft { background: rgba(16, 185, 129, 0.1); }
        .bg-success-soft { background: rgba(22, 163, 74, 0.1); }
        .border-emerald { border: 1px solid rgba(16, 185, 129, 0.3); }
        .tracking-tight { letter-spacing: -0.01em; }
        .tiny { font-size: 0.7rem; }
        
        .glass-morphism {
          background: rgba(255, 255, 255, 0.6);
          backdrop-filter: blur(14px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }

        .terminal-window {
          background: #111827;
          border-radius: 12px;
          overflow: hidden;
          border: 1px solid #374151;
        }
        .terminal-window.mini {
          border-radius: 8px;
          border-color: #1f2937;
        }
        .terminal-header {
          background: #1f2937;
          padding: 8px 15px;
          border-bottom: 1px solid #374151;
        }
        .terminal-controls {
          display: flex;
          gap: 6px;
        }
        .control {
          width: 10px;
          height: 10px;
          border-radius: 50%;
        }
        .control.close { background: #ff5f56; }
        .control.minimize { background: #ffbd2e; }
        .control.expand { background: #27c93f; }
        .terminal-title {
          color: #9ca3af;
          font-family: 'Inter', sans-serif;
          font-size: 0.7rem;
          font-weight: 500;
        }
        .terminal-body {
          padding: 20px;
          font-family: 'monospace';
          position: relative;
        }
        .terminal-body pre {
          margin: 0;
          color: #a7f3d0;
          font-size: 0.75rem;
          line-height: 1.5;
        }
        
        .btn-terminal-action {
          background: #1f2937;
          color: #fff;
          border: 1px solid #374151;
          padding: 6px 14px;
          border-radius: 8px;
          font-size: 0.7rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }
        .btn-terminal-action:hover {
          background: #374151;
          color: #fff;
          transform: translateY(-1px);
        }
        .btn-copy-terminal {
          background: rgba(16, 185, 129, 0.15);
          color: #34d399;
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-size: 0.6rem;
          font-weight: 700;
          padding: 2px 10px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .btn-copy-terminal:hover {
          background: #10b981;
          color: #fff;
        }
        .btn-terminal-warning {
          background: rgba(245, 158, 11, 0.1);
          color: #f59e0b;
          border: 1px solid rgba(245, 158, 11, 0.2);
          padding: 10px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 0.8rem;
          letter-spacing: 0.05em;
          transition: all 0.2s;
        }
        .btn-terminal-warning:hover {
          background: #f59e0b;
          color: #fff;
        }

        .icon-badge {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-overlay {
          backdrop-filter: blur(8px);
          animation: fadeIn 0.3s ease;
        }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}} />
    </div>
  );
}

export default AgentEmbassy;
