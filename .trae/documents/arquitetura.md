# Arquitetura do Sistema de Monitoramento HMI

## Visão Geral
O sistema é uma aplicação HMI (Human-Machine Interface) para monitoramento em tempo real de níveis de caixas d'água e estado de bombas hidráulicas. A arquitetura é dividida em um Backend (API + WebSocket) e um Frontend (Dashboard React).

## Estrutura do Projeto

### 1. Backend (`/hmi-backend`)
Responsável pela persistência de dados, lógica de negócios e comunicação em tempo real.

*   **Tecnologias:** Node.js, Fastify, Socket.io, Better-SQLite3, TypeScript.
*   **Banco de Dados:** SQLite (`hmi-data.db`).
*   **Módulos Principais:**
    *   `server.ts`: Ponto de entrada. Configura o servidor Fastify e Socket.io. Recebe dados dos sensores via HTTP POST e transmite atualizações via WebSocket.
    *   `database.ts`: Gerencia a conexão com o SQLite, inicialização do schema (tabelas) e operações de leitura/escrita. Garante idempotência na inicialização.
    *   `logic.ts`: Contém regras de negócio, como lógica de detecção de alertas baseada nos níveis dos tanques.
    *   `types.ts`: Definições de tipos TypeScript compartilhadas (Interfaces: `TankStatus`, `PumpStatus`, `User`, `HMIState`).

*   **Banco de Dados (Schema):**
    *   `hmi_tanks`: Estado atual dos tanques (id, level_percent, metadados).
    *   `hmi_pumps`: Estado atual das bombas (id, is_on, flow).
    *   `readings`: Histórico de leituras (log de level e flow com timestamp).
    *   `users`: Tabela de usuários para autenticação (id, username, password, role).

### 2. Frontend (`/hmi-frontend`)
Interface gráfica para operadores visualizarem o estado do sistema.

*   **Tecnologias:** React, Vite, TypeScript, Tailwind CSS.
*   **Comunicação:** Conecta-se ao Backend via `socket.io-client` para receber atualizações de estado em tempo real (eventos `hmi_data` e `hmi_status`).
*   **Componentes Principais:**
    *   `App.tsx`: Gerenciador de estado global e layout principal.
    *   `Tank.tsx`: Visualização do tanque com régua de nível. Implementa lógica visual de alertas (piscagem em níveis críticos <40% ou >110%).
    *   `FixedAlertStatus.tsx`: Componente de destaque para o status do reservatório, com alertas visuais sincronizados.
    *   `Pump.tsx`: Indicador visual do estado da bomba (Ligada/Desligada).
    *   `AlertPanel.tsx`: Painel lateral para listagem de alertas ativos.

## Fluxo de Dados
1.  **Sensores (IoT):** Enviam dados (Nível, Vazão, Status Bomba) para o Backend via HTTP POST (`/api/sensor-data` ou similar).
2.  **Backend:**
    *   Recebe os dados.
    *   Atualiza o estado atual no Banco de Dados (`hmi_tanks`, `hmi_pumps`).
    *   Registra histórico na tabela `readings`.
    *   Processa lógica de alertas (`logic.ts`).
    *   Emite o novo estado para todos os clientes conectados via Socket.io.
3.  **Frontend:**
    *   Recebe o evento Socket.io.
    *   Atualiza o estado React.
    *   Interface reflete as mudanças instantaneamente (nível da água, cores de alerta, status da bomba).

## Status Atual (Desenvolvimento)
*   ✅ **Monitoramento:** Funcional com visualização de tanques e bombas.
*   ✅ **Alertas Visuais:** Implementados (Piscagem em níveis críticos).
*   ✅ **Persistência:** Histórico e estado atual salvos no SQLite.
*   ✅ **Estrutura de Usuários:** Tabela e interfaces criadas, pronto para implementação de Login.
*   🚧 **Autenticação:** Próximo passo (Login, JWT, Proteção de rotas).
