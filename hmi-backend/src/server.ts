import Fastify from 'fastify';
import { Server } from 'socket.io';
import cors from '@fastify/cors'; // Plugin de CORS para Fastify

import type {
  HMIState,
} from './database.js';

import {
  initDB,
  loadStateFromDB,
  DBUpdatePumpMode,
  DBUpdatePumpState,
  DBUpdateTankLevel,
} from './database.js';

// Tipos de payload utilizados pelos endpoints e eventos de socket
type SensorPayload = { id: string; level: number };
type PumpModePayload = { id: string; pumpMode: 'AUTO' | 'MANUAL' };
type PumpStatePayload = { id: string; on: boolean };

// --- 1. Armazenamento de Estado (na Memória) ---
// (Assim como no Go, carregamos o DB para a memória para acesso rápido)
let store: HMIState;

// --- 2. O Servidor HTTP (Fastify) ---
const fastify = Fastify({ logger: true });

// Registra o CORS para permitir que o React (ex: localhost:5173) se conecte
fastify.register(cors, {
  origin: "*", // Em produção, mude para o seu domínio
});

// --- 3. O Servidor WebSocket (Socket.io) ---
// Socket.io *é* o nosso Hub. Ele gerencia clientes e broadcasts.
const io = new Server(fastify.server, {
  cors: {
    origin: "*", // Permite que o React se conecte
  },
});

// ======================================================
// --- 4. Lógica de Negócio (O Cérebro) ---
// (Estas funções são chamadas *dentro* da trava (lock) do store)
// ======================================================

/**
 * Roda a lógica de bombas (AUTO) e alertas
 * IMPORTANTE: Esta função NÃO é thread-safe.
 * Ela deve ser chamada *depois* que o 'store' já foi travado.
 */
function runStateLogic() {
  // 1. Lógica de Bombas (AUTO)
  const pump1 = store.pumps.find((p: any) => p.id === 'P-100');
  const tank1 = store.tanks.find((t: any) => t.id === 'T-100');

  if (pump1 && tank1 && pump1.pumpMode === 'AUTO') {
    pump1.on = tank1.level > 90;
  }
  // (Adicionar lógica para P-200 aqui...)

  // 2. Lógica de Alertas
  const newAlerts = [];
  const now = new Date().toISOString();

  if (tank1) {
    if (tank1.level <= 10.0) {
      newAlerts.push({
        id: "T-100-LOW", message: "Nível CRÍTICO Baixo - Cisterna T-100", level: "Critical", activeAt: now,
      });
    }
    if (tank1.level >= 95.0) {
      newAlerts.push({
        id: "T-100-HIGH", message: "Alerta de Nível Alto - Cisterna T-100", level: "Warning", activeAt: now,
      });
    }
  }
  store.activeAlerts = newAlerts;
}

/**
 * Helper para transmitir o estado atual para TODOS os clientes React
 */
function broadcastStateChange() {
  io.emit('hmi_update', store);
}


// ======================================================
// --- 5. Definição dos Endpoints HTTP ---
// ======================================================

// GET /api/v1/status (Para o React carregar o estado inicial)
fastify.get('/api/v1/status', (request, reply) => {
  reply.send(store);
});

// POST /api/v1/sensor/update (Para o ESP32 enviar dados)
fastify.post('/api/v1/sensor/update', (request, reply) => {
  try {
    const payload = request.body as SensorPayload;
    
    // Atualiza o estado na memória
    const tank = store.tanks.find((t: any) => t.id === payload.id);
    if (!tank) {
      fastify.log.warn(`Sensor enviou dados para tanque desconhecido: ${payload.id}`);
      return reply.status(404).send({ error: "Tanque não encontrado" });
    }
    
    tank.level = payload.level;
    fastify.log.info(`Recebido dado do sensor: ID ${payload.id}, Nível ${payload.level}`);

    // Roda a lógica (bombas, alertas)
    runStateLogic();

    // Transmite o novo estado para TODOS os clientes React
    broadcastStateChange();

    // Salva no DB (em background, sem esperar)
    DBUpdateTankLevel(payload.id, payload.level);
    
    // Responde ao ESP32
    reply.status(200).send({ message: "Dados recebidos com sucesso" });

  } catch (err) {
    fastify.log.error(err);
    reply.status(500).send({ error: "Erro interno do servidor" });
  }
});


// ======================================================
// --- 6. Lógica do WebSocket (Comandos do React) ---
// ======================================================

io.on('connection', (socket) => {
  console.log(`Novo cliente conectado: ${socket.id}`);
  
  // Escuta pelo comando 'SET_PUMP_MODE'
  socket.on('SET_PUMP_MODE', (payload: PumpModePayload) => {
    fastify.log.info(`Comando recebido: SET_PUMP_MODE para ${payload.id}`);

    const pump = store.pumps.find((p: any) => p.id === payload.id);
    if (pump) {
      pump.pumpMode = payload.pumpMode;
      runStateLogic(); // Roda a lógica
      broadcastStateChange(); // Transmite
      DBUpdatePumpMode(payload.id, payload.pumpMode); // Salva no DB
    }
  });

  // Escuta pelo comando 'SET_PUMP_STATE'
  socket.on('SET_PUMP_STATE', (payload: PumpStatePayload) => {
    fastify.log.info(`Comando recebido: SET_PUMP_STATE para ${payload.id}`);

    const pump = store.pumps.find((p: any) => p.id === payload.id);
    if (pump && pump.pumpMode === 'MANUAL') {
      pump.on = payload.on;
      runStateLogic(); // Roda a lógica
      broadcastStateChange(); // Transmite
      DBUpdatePumpState(payload.id, payload.on); // Salva no DB
    } else {
      fastify.log.warn(`Comando SET_PUMP_STATE ignorado: Bomba ${payload.id} está em MODO AUTO`);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Cliente desconectado: ${socket.id}`);
  });
});


// ======================================================
// --- 7. Inicialização do Servidor ---
// ======================================================

async function startServer() {
  try {
    // 1. Prepara o banco de dados
    initDB();
    
    // 2. Carrega o estado inicial do DB para a memória
    store = loadStateFromDB();

    // 3. Detecta a porta (para Render/Railway) ou usa 8080
    const port = parseInt(process.env.PORT || '8080', 10);

    // Inicia o servidor escutando em todas as interfaces (0.0.0.0)
    // Isso é crucial para o ESP32 (em rede local) e o deploy (Render)
    await fastify.listen({ port: port, host: '0.0.0.0' });
    
    console.log("=====================================================");
    fastify.log.info(`Servidor HMI iniciado em http://0.0.0.0:${port}`);
    console.log("=====================================================");

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

startServer();