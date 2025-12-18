import Database from 'better-sqlite3';
import path from 'path';
import type { PumpStatus, TankStatus, HMIState } from './types.js';

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
    // Tabela de Tanques (com campos opcionais bloco, categoria, local)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS hmi_tanks (
        id TEXT PRIMARY KEY,2
        level_percent REAL NOT NULL,
        bloco TEXT,
        categoria TEXT CHECK(categoria IN ('inferior', 'superior')),
        local TEXT
      )
    `).run();

    // Tabela de Bombas (sem pump_mode)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS hmi_pumps (
        id TEXT PRIMARY KEY,
        is_on INTEGER NOT NULL,
        flow REAL DEFAULT 0
      )
    `).run();
    
    // Tabela de Histórico (todos NOT NULL)
    db.prepare(`
      CREATE TABLE IF NOT EXISTS readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tank_id TEXT NOT NULL,
        level REAL NOT NULL,
        flow REAL NOT NULL,
        timestamp DATETIME DEFAULT (datetime('now'))
      )
    `).run();

    // Migração: remover pump_mode se existir em hmi_pumps
    try {
      const cols = db.prepare("PRAGMA table_info(hmi_pumps)").all() as any[];
      const hasPumpMode = cols.some((c: any) => c.name === 'pump_mode');
      if (hasPumpMode) {
        db.prepare(`CREATE TABLE IF NOT EXISTS hmi_pumps_new (
          id TEXT PRIMARY KEY,
          is_on INTEGER NOT NULL,
          flow REAL DEFAULT 0
        )`).run();
        db.prepare(`INSERT INTO hmi_pumps_new (id, is_on, flow)
          SELECT id, is_on, COALESCE(flow, 0) FROM hmi_pumps`).run();
        db.prepare(`DROP TABLE hmi_pumps`).run();
        db.prepare(`ALTER TABLE hmi_pumps_new RENAME TO hmi_pumps`).run();
      }
    } catch {}

    // Migração: garantir colunas opcionais em hmi_tanks
    try {
      const tcols = db.prepare("PRAGMA table_info(hmi_tanks)").all() as any[];
      const hasBloco = tcols.some((c: any) => c.name === 'bloco');
      const hasCategoria = tcols.some((c: any) => c.name === 'categoria');
      const hasLocal = tcols.some((c: any) => c.name === 'local');
      if (!hasBloco) db.prepare("ALTER TABLE hmi_tanks ADD COLUMN bloco TEXT").run();
      if (!hasCategoria) db.prepare("ALTER TABLE hmi_tanks ADD COLUMN categoria TEXT CHECK(categoria IN ('inferior','superior'))").run();
      if (!hasLocal) db.prepare("ALTER TABLE hmi_tanks ADD COLUMN local TEXT").run();
    } catch {}

    // Migração: reforçar NOT NULL em readings (recriar se necessário)
    try {
      const rcols = db.prepare("PRAGMA table_info(readings)").all() as any[];
      const okTankId = rcols.some((c: any) => c.name === 'tank_id' && c.notnull === 1);
      const okLevel = rcols.some((c: any) => c.name === 'level' && c.notnull === 1);
      const okFlow = rcols.some((c: any) => c.name === 'flow' && c.notnull === 1);
      if (!(okTankId && okLevel && okFlow)) {
        db.prepare(`CREATE TABLE IF NOT EXISTS readings_new (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          tank_id TEXT NOT NULL,
          level REAL NOT NULL,
          flow REAL NOT NULL,
          timestamp DATETIME DEFAULT (datetime('now'))
        )`).run();
        db.prepare(`INSERT INTO readings_new (tank_id, level, flow, timestamp)
          SELECT tank_id, level, COALESCE(flow, 0), COALESCE(timestamp, datetime('now')) FROM readings`).run();
        db.prepare(`DROP TABLE readings`).run();
        db.prepare(`ALTER TABLE readings_new RENAME TO readings`).run();
      }
    } catch {}

    // Dados iniciais idempotentes
    db.prepare("INSERT OR IGNORE INTO hmi_tanks (id, level_percent) VALUES (?, ?)").run('T-100', 50.0);
    db.prepare("INSERT OR IGNORE INTO hmi_tanks (id, level_percent) VALUES (?, ?)").run('T-200', 60.0);
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
    flow: typeof p.flow === 'number' ? p.flow : undefined,
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

export async function DBUpdatePumpState(id: string, on: boolean, flow?: number) {
  try {
    const isOnInt = on ? 1 : 0;
    if (typeof flow === 'number') {
      db.prepare("UPDATE hmi_pumps SET is_on = ?, flow = ? WHERE id = ?").run(isOnInt, flow, id);
    } else {
      db.prepare("UPDATE hmi_pumps SET is_on = ? WHERE id = ?").run(isOnInt, id);
    }
  } catch (err) {
    console.error(`ERRO AO SALVAR ESTADO NO DB: ${(err as Error).message}`);
  }
}

export async function DBUpdateTankLevel(id: string, level: number, flow: number) {
  try {
    // Atualiza o estado principal
    db.prepare("UPDATE hmi_tanks SET level_percent = ? WHERE id = ?").run(level, id);
    // Insere no histórico
    db.prepare("INSERT INTO readings (tank_id, level, flow) VALUES (?, ?, ?)").run(id, level, flow);
  } catch (err) {
    console.error(`ERRO AO SALVAR NÍVEL NO DB: ${(err as Error).message}`);
  }
}
