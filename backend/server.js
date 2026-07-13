import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3002;
const JWT_SECRET = process.env.JWT_SECRET || 'admin-secret-token-3a';

app.use(cors());
app.use(express.json());

// Helper para ler/escrever JSON em arquivo
async function readJSONFile(filePath, defaultValue) {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJSONFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Middleware de Autenticação
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
  }

  // Permite acesso via token estático (para chamadas fáceis) ou JWT real
  if (token === JWT_SECRET) {
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido ou expirado.' });
    req.user = user;
    next();
  });
};

// Admin-only middleware
const adminOnly = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token não fornecido.' });
  if (token === JWT_SECRET || token === 'admin-secret-token-3a') {
    return next();
  }
  return res.status(403).json({ error: 'Permissão insuficiente.' });
};

// Gerar token JWT
app.post('/api/auth/token', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'admin') {
    const token = jwt.sign({ role: 'admin' }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Credenciais inválidas' });
});

// Endpoint de Logs do Traccar
app.get('/api/logs/traccar', authenticateToken, async (req, res) => {
  try {
    const lines = req.query.lines || 200;
    const { stdout, stderr } = await execAsync(`docker logs traccar --tail ${lines}`);
    
    const rawLogs = (stdout + '\n' + stderr).split('\n').filter(line => line.trim() !== '');

    const formattedLogs = rawLogs.map((line, index) => {
      let level = 'INFO';
      if (line.includes('ERROR')) level = 'ERROR';
      else if (line.includes('WARN')) level = 'WARN';
      else if (line.includes('Auth') || line.includes('session')) level = 'AUTH';
      else if (line.includes('Device')) level = 'DEVICE';

      return {
        id: index,
        raw: line,
        level: level,
        timestamp: new Date().toISOString()
      };
    });

    res.json({ logs: formattedLogs });
  } catch (error) {
    console.error('Erro ao buscar logs do docker:', error);
    res.status(500).json({ error: 'Falha ao buscar logs do container', details: error.message });
  }
});

// File para persistir estados de bloqueio
const VEHICLE_BLOCKS_FILE = path.join(__dirname, 'vehicleBlocks.json');

// Endpoints de Block State
app.post('/api/vehicle/:id/block', adminOnly, async (req, res) => {
  const { id } = req.params;
  const { state } = req.body;
  if (!['blocked', 'unblocked'].includes(state)) {
    return res.status(400).json({ error: 'Estado inválido.' });
  }
  const blocks = await readJSONFile(VEHICLE_BLOCKS_FILE, {});
  blocks[id] = state;
  await writeJSONFile(VEHICLE_BLOCKS_FILE, blocks);
  return res.json({ deviceId: id, state });
});

app.get('/api/vehicle/block-states', adminOnly, async (req, res) => {
  const blocks = await readJSONFile(VEHICLE_BLOCKS_FILE, {});
  res.json(blocks);
});

// Endpoint de Status (Health check)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: '3a-backend' });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend de Logs rodando na porta ${PORT}`);
});
