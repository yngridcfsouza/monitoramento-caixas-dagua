import Fastify from 'fastify';
import { Server } from 'socket.io';
import cors from '@fastify/cors'; // Plugin de CORS para Fastify
import { initDB, loadStateFromDB, DBUpdatePumpState, DBUpdateTankLevel, } from './database.js';
import { runAlertLogic } from './logic.js';
// Tipos de payload utilizados pelos endpoints e eventos de socket
// tipos em types.ts
// Removidos: PumpModePayload e PumpStatePayload (decisão de bomba vem do sensor)
// --- 1. Armazenamento de Estado (na Memória) ---
// (Assim como no Go, carregamos o DB para a memória para acesso rápido)
let store;
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
    // Lógica de Alertas apenas (decisão de bomba já vem do sensor)
    const tank1 = store.tanks.find((t) => t.id === 'T-100');
    const newAlerts = [];
    const now = new Date().toISOString();
    if (tank1) {
        if (tank1.level <= 40.0) {
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
        const payload = request.body;
        // Atualiza o estado na memória
        const tank = store.tanks.find((t) => t.id === payload.id);
        if (!tank) {
            fastify.log.warn(`Sensor enviou dados para tanque desconhecido: ${payload.id}`);
            return reply.status(404).send({ error: "Tanque não encontrado" });
        }
        tank.level = payload.level;
        tank.flowRate = payload.flow;
        tank.pumpStatus = payload.pumpStatus;
        fastify.log.info(`Recebido dado do sensor: ID ${payload.id}, Nível ${payload.level}`);
        const tankToPump = { 'T-100': 'P-100', 'T-200': 'P-200' };
        const pumpId = tankToPump[payload.id];
        if (pumpId) {
            const pump = store.pumps.find((p) => p.id === pumpId);
            if (pump) {
                const flowVal = payload.flow;
                pump.flow = flowVal;
                const nextOn = payload.pumpStatus === 'Ligada';
                pump.on = nextOn;
                DBUpdatePumpState(pumpId, nextOn, flowVal);
            }
        }
        runAlertLogic(store);
        // Transmite o novo estado para TODOS os clientes React
        broadcastStateChange();
        // Salva no DB (em background, sem esperar)
        const flowVal = payload.flow;
        DBUpdateTankLevel(payload.id, payload.level, flowVal);
        // Responde ao ESP32
        reply.status(200).send({ message: "Dados recebidos com sucesso" });
    }
    catch (err) {
        fastify.log.error(err);
        reply.status(500).send({ error: "Erro interno do servidor" });
    }
});
// Removido endpoint separado de bomba: dados vêm apenas do sensor
// ======================================================
// --- 6. Lógica do WebSocket (Comandos do React) ---
// ======================================================
io.on('connection', (socket) => {
    console.log(`Novo cliente conectado: ${socket.id}`);
    // Removidos handlers de controle de bomba via WebSocket
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
    }
    catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
}
startServer();
//# sourceMappingURL=server.js.map