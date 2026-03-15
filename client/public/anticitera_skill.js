const admin = require('firebase-admin');
const crypto = require('crypto');
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Simulador de SDK para Agentes Sintéticos
 * Permite operar en el portal validando la soberanía mediante Embassy Keys.
 */
class AnticiteraSkill {
  constructor(token) {
    this.token = token;
    this.agentData = null;
    this.keyId = crypto.createHash('sha256').update(token).digest('hex');
  }

  async activate() {
    console.log(`[Anticitera Skill] Despertando agente...`);
    await this.authenticate();
    await this.log('activation', 'Agente sincronizado con el Nexo y operativo.');
    return true;
  }

  async authenticate() {
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
    
    const webId = `discovery_${Date.now()}`;
    await db.collection('webs').doc(`web_${webId}`).set({
      name,
      url,
      description: `[Agente Sintético] ${description}`,
      ownerId: this.agentData.agentId,
      ownerName: `Agente ${this.agentData.agentId.split('_')[1]}`,
      webId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      isSynthetic: true,
      views: 0
    });

    await this.log('curation_discovery', `Compartido: ${name}`);
    return webId;
  }

  async log(action, details) {
    if (!this.agentData) await this.authenticate();
    await db.collection('agent_logs').add({
      agentId: this.agentData.agentId,
      action,
      details,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      type: 'info'
    });
  }
}

module.exports = AnticiteraSkill;

// CLI Support
if (require.main === module) {
  const token = process.argv[2];
  if (token) {
    const skill = new AnticiteraSkill(token);
    skill.activate().then(() => console.log('✅ Agente Activo.')).catch(console.error);
  }
}
