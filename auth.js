// auth.js — JSONBin storage (original working bins)

const JSONBIN_KEY = '$2a$10$cGsSALCiLByGNUgdr5uhHO79MdzZhH.U9aon.E3.0ANUd6qiUUU.C';
const BIN_PARTY   = '6a2871c4f5f4af5e29d424f6';
const BIN_CHAT    = '6a2871e9da38895dfea2a153';
const BIN_PLAYERS = '6a287205f5f4af5e29d426da';
const API         = 'https://api.jsonbin.io/v3/b/';
const H           = { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Versioning': 'false' };

async function binGet(id) {
  const r = await fetch(API + id + '/latest', { headers: H });
  if (!r.ok) throw new Error('GET failed ' + r.status);
  return (await r.json()).record;
}

async function binSet(id, data) {
  const r = await fetch(API + id, { method: 'PUT', headers: H, body: JSON.stringify(data) });
  if (!r.ok) throw new Error('PUT failed ' + r.status);
  return true;
}

// Auth
const Auth = {
  role()      { return sessionStorage.getItem('dnd-role'); },
  isDM()      { return this.role() === 'dm'; },
  isLoggedIn(){ return !!this.role(); },
  logout()    { sessionStorage.clear(); window.location.href = 'index.html'; },
  require()   {
    if (!this.isLoggedIn()) { window.location.href = 'index.html'; return false; }
    return true;
  }
};

// Party
const Store = {
  async getParty()       { try { return (await binGet(BIN_PARTY)).party || []; }  catch { return []; } },
  async saveParty(party) { try { await binSet(BIN_PARTY, { party }); return true; } catch { return false; } }
};

// Chat
const ChatStore = {
  async getMessages()          { try { return (await binGet(BIN_CHAT)).messages || []; } catch { return []; } },
  async saveMessages(messages) { try { await binSet(BIN_CHAT, { messages: messages.slice(-200) }); return true; } catch { return false; } }
};

// Players
const PlayerStore = {
  async getPlayers()         { try { return (await binGet(BIN_PLAYERS)).players || {}; } catch { return {}; } },
  async savePlayers(players) { try { await binSet(BIN_PLAYERS, { players }); return true; } catch { return false; } }
};

// Online presence
const OnlineStore = {
  async heartbeat(name, isDM) {
    try {
      const rec = await binGet(BIN_PLAYERS);
      if (!rec.online) rec.online = {};
      rec.online[name] = { name, isDM: !!isDM, ts: Date.now() };
      const cutoff = Date.now() - 120000;
      Object.keys(rec.online).forEach(k => { if (rec.online[k].ts < cutoff) delete rec.online[k]; });
      await binSet(BIN_PLAYERS, rec);
    } catch(e) { console.warn('heartbeat failed:', e.message); }
  },
  async getOnline() {
    try {
      const rec = await binGet(BIN_PLAYERS);
      const cutoff = Date.now() - 120000;
      return Object.values(rec.online || {}).filter(u => u.ts > cutoff);
    } catch { return []; }
  }
};

// Scores
const ScoreStore = {
  async getPlayerData(username) {
    try {
      const players = await PlayerStore.getPlayers();
      const entry = players[username.toLowerCase()];
      return entry ? (entry.gameData || { totalScore:0, unlockedColors:[], bonusUnlocked:false, activeColor:null, activeTitle:null }) : null;
    } catch { return null; }
  },
  async savePlayerData(username, gameData) {
    try {
      const rec = await binGet(BIN_PLAYERS);
      if (!rec.players || !rec.players[username.toLowerCase()]) return false;
      rec.players[username.toLowerCase()].gameData = gameData;
      await binSet(BIN_PLAYERS, rec);
      return true;
    } catch { return false; }
  }
};
