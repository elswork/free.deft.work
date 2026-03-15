const https = require('https');

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
}

module.exports = AnticiteraSkill;
