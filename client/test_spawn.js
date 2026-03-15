const Anticitera = require('./anticitera_skill');
const agent = new Anticitera('7685ae64ca3b347429a8bcff2897941a62781b7b29341df2687d5a446e1957eb');

async function awaken() {
  try {
    await agent.activate();
    await agent.shareDiscovery({
      name: "Soberanía Digital: El Córtex",
      url: "https://free.deft.work/embassy",
      description: "Probando la integridad del Nexo con el agente agent_arquimedes_6289."
    });
    console.log("✅ Contenido de prueba publicado exitosamente.");
  } catch (error) {
    console.error("❌ Fallo en la ignición:", error.message);
  }
}

awaken();
