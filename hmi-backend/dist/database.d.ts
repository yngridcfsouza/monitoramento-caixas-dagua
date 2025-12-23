import type { HMIState, User } from './types.js';
/**
 * Inicializa o banco de dados e cria as tabelas (se não existirem)
 */
export declare function initDB(): void;
/**
 * Carrega o estado inicial do DB para a memória
 */
export declare function loadStateFromDB(): HMIState;
export declare function DBUpdatePumpState(id: string, on: boolean, flow?: number): Promise<void>;
export declare function DBUpdateTankLevel(id: string, level: number, flow: number): Promise<void>;
/**
 * Busca usuário pelo nome de usuário
 */
export declare function DBGetUserByUsername(username: string): User | undefined;
//# sourceMappingURL=database.d.ts.map