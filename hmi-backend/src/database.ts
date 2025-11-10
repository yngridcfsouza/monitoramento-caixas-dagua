import Database from 'better-sqlite3';
import path from 'path';

// --- 1. Modelos de Dados 
export interface PumpStatus {
  id: string;
  on: boolean;
  pumpMode: string;
}
export interface TankStatus {
  id: string;
  level: number;
}
export interface Alert {
  id: string;
  message: string;
  level: string;
  activeAt: string;
}
export interface HMIState {
  tanks: TankStatus[];
  pumps: PumpStatus[];
  activeAlerts: Alert[];
}

// --- 2. Conexão com o Banco de Dados ---

// Define o caminho do banco. Em produção (Render/Railway),
// usaremos um "volume" em /var/data. Localmente, será './hmi-data.db'.
const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'hmi-data.db');
const db = new Database(dbPath);
console.log(`Banco de dados SQLite conectado em: ${dbPath}`);

/**
 * Inicializa o banco de dados e cria as tabelas (se não existirem)
 */
export function initDB() {
  console.log('Inicializando schema do banco de dados...');
  
  // Usamos 'transaction' para garantir que tudo execute de uma vez
  const createSchema = db.transaction(() => {
    // Tabela de Tanques
    db.prepare(`
      CREATE TABLE IF NOT EXISTS hmi_tanks (
        id TEXT PRIMARY KEY,
        level_percent REAL NOT NULL
      )
    `).run();

    // Tabela de Bombas
    db.prepare(`
      CREATE TABLE IF NOT EXISTS hmi_pumps (
        id TEXT PRIMARY KEY,
        is_on INTEGER NOT NULL,
        pump_mode TEXT NOT NULL
      )
    `).run();
    
    // Tabela de Histórico (como você sugeriu)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tank_id TEXT,
        level REAL,
        timestamp DATETIME DEFAULT (datetime('now'))
      )
    `).run();

    // --- Dados Padrão (Idempotente) ---
    // (INSERT OR IGNORE é a sintaxe do SQLite para "só insira se não existir")
    db.prepare("INSERT OR IGNORE INTO hmi_tanks (id, level_percent) VALUES (?, ?)").run('T-100', 50.0);
    db.prepare("INSERT OR IGNORE INTO hmi_tanks (id, level_percent) VALUES (?, ?)").run('T-200', 60.0);
    db.prepare("INSERT OR IGNORE INTO hmi_pumps (id, is_on, pump_mode) VALUES (?, ?, ?)").run('P-100', 0, 'AUTO');
    db.prepare("INSERT OR IGNORE INTO hmi_pumps (id, is_on, pump_mode) VALUES (?, ?, ?)").run('P-200', 0, 'AUTO');
  });

  createSchema();
  console.log('Schema do banco de dados pronto.');
}

// --- 3. Funções de Leitura/Escrita ---

/**
 * Carrega o estado inicial do DB para a memória
 */
export function loadStateFromDB(): HMIState {
  const tanks = db.prepare("SELECT * FROM hmi_tanks ORDER BY id").all() as TankStatus[];
  
  const pumpsRaw = db.prepare("SELECT * FROM hmi_pumps ORDER BY id").all() as any[];
  const pumps: PumpStatus[] = pumpsRaw.map(p => ({
    id: p.id,
    on: p.is_on === 1, // Converte 0/1 para false/true
    pumpMode: p.pump_mode,
  }));

  console.log(`Carregados ${tanks.length} tanques e ${pumps.length} bombas do DB.`);
  
  return {
    tanks,
    pumps,
    activeAlerts: [], // Alertas são sempre em tempo real
  };
}

// --- Funções de Escrita no DB (assíncronas) ---
// (Não precisamos esperar elas terminarem)

export async function DBUpdatePumpMode(id: string, mode: string) {
  try {
    db.prepare("UPDATE hmi_pumps SET pump_mode = ? WHERE id = ?").run(mode, id);
  } catch (err) {
    console.error(`ERRO AO SALVAR MODO NO DB: ${(err as Error).message}`);
  }
}

export async function DBUpdatePumpState(id: string, on: boolean) {
  try {
    const isOnInt = on ? 1 : 0; // Converte true/false para 1/0
    db.prepare("UPDATE hmi_pumps SET is_on = ? WHERE id = ?").run(isOnInt, id);
  } catch (err) {
    console.error(`ERRO AO SALVAR ESTADO NO DB: ${(err as Error).message}`);
  }
}

export async function DBUpdateTankLevel(id: string, level: number) {
  try {
    // Atualiza o estado principal
    db.prepare("UPDATE hmi_tanks SET level_percent = ? WHERE id = ?").run(level, id);
    // Insere no histórico
    db.prepare("INSERT INTO readings (tank_id, level) VALUES (?, ?)").run(id, level);
  } catch (err) {
    console.error(`ERRO AO SALVAR NÍVEL NO DB: ${(err as Error).message}`);
  }
}