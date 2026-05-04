// ── API Configuration ─────────────────────────────────────────
// Auto-detects local vs production
// Covers: localhost, 127.0.0.1, and any LAN IP (192.168.x.x, 10.x.x.x, 172.x.x.x)
const _host = window.location.hostname;
const _isLocal = _host === 'localhost'
  || _host === '127.0.0.1'
  || /^10\./.test(_host)
  || /^192\.168\./.test(_host)
  || /^172\.(1[6-9]|2\d|3[01])\./.test(_host);

const API = _isLocal
  ? `http://${_host}:5002`
  : 'https://terra-nova-backend.onrender.com';
