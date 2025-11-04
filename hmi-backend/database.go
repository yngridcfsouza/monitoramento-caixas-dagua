package main

import (
    "database/sql"
    "fmt"
    "log"
    "os" // Para ler variáveis de ambiente

    _ "github.com/godror/godror" // O driver Oracle (importado pelo seu efeito)
)

// DB é a nossa pool de conexão global
var DB *sql.DB

// InitDB inicializa a conexão com o Oracle Autonomous DB
func InitDB() error {
	// Lê as credenciais do .env (que o Docker Compose nos deu)
	dbUser := os.Getenv("DB_USER")
	dbPassword := os.Getenv("DB_PASSWORD")
	dbConnectString := os.Getenv("DB_CONNECT_STRING")

	// O driver 'godror' usa automaticamente a variável de ambiente TNS_ADMIN
	// que nós definimos no Dockerfile e docker-compose.yml.

    log.Println("Tentando conectar ao Oracle DB...")
    log.Printf("Usuário: %s, String de Conexão: %s", dbUser, dbConnectString)

    // Abre a conexão usando parâmetros explícitos do godror, incluindo configDir
    var err error
    dsn := fmt.Sprintf("user=\"%s\" password=\"%s\" connectString=\"%s\" configDir=\"/usr/oracle/wallet\"", dbUser, dbPassword, dbConnectString)
    DB, err = sql.Open("godror", dsn)
    if err != nil {
        return fmt.Errorf("erro ao abrir conexão com o banco de dados: %w", err)
    }

	// Testa a conexão
    if err = DB.Ping(); err != nil {
        return fmt.Errorf("erro ao 'pingar' o banco de dados: %w", err)
    }

    log.Println("Conexão com o Banco de Dados Oracle estabelecida com sucesso!")

	// Configurações da pool de conexão
    DB.SetMaxIdleConns(5)
    DB.SetMaxOpenConns(10)
    return nil
}

// LoadStateFromDB carrega o estado inicial do banco para a memória
func LoadStateFromDB() (HMIState, error) {
    store.Lock() // Trava o store antes de começar
    defer store.Unlock()

    state := HMIState{
        ActiveAlerts: []Alert{}, // Alertas são sempre em tempo real
    }

    if DB == nil {
        return state, fmt.Errorf("banco de dados não inicializado")
    }

	// 1. Carrega os Tanques
	rows, err := DB.Query("SELECT id, level_percent FROM hmi_tanks")
	if err != nil {
		return state, fmt.Errorf("erro ao buscar tanques: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var t TankStatus
		if err := rows.Scan(&t.ID, &t.Level); err != nil {
			log.Printf("Erro ao escanear linha do tanque: %v", err)
			continue
		}
		state.Tanks = append(state.Tanks, t)
	}
	log.Printf("Carregados %d tanques do DB.", len(state.Tanks))

	// 2. Carrega as Bombas
	rowsPumps, err := DB.Query("SELECT id, is_on, pump_mode FROM hmi_pumps")
	if err != nil {
		return state, fmt.Errorf("erro ao buscar bombas: %w", err)
	}
	defer rowsPumps.Close()

	for rowsPumps.Next() {
		var p PumpStatus
		var isOn int // Oracle usa NUMBER(1) (0 ou 1)
		if err := rowsPumps.Scan(&p.ID, &isOn, &p.PumpMode); err != nil {
			log.Printf("Erro ao escanear linha da bomba: %v", err)
			continue
		}
		p.On = (isOn == 1) // Converte 0/1 para false/true
		state.Pumps = append(state.Pumps, p)
	}
	log.Printf("Carregadas %d bombas do DB.", len(state.Pumps))

	// Define o estado em memória (store) com os dados do banco
	store.state = state
	return state, nil
}

// --- Funções de Escrita no DB ---
// (Estas serão chamadas pela nossa lógica de negócio)

func DBUpdatePumpMode(id string, mode string) {
    if DB == nil {
        log.Printf("DBUpdatePumpMode ignorado: banco de dados não inicializado")
        return
    }
    _, err := DB.Exec("UPDATE hmi_pumps SET pump_mode = :1 WHERE id = :2", mode, id)
    if err != nil {
        log.Printf("ERRO AO ATUALIZAR MODO NO DB: %v", err)
    }
}

func DBUpdatePumpState(id string, on bool) {
    if DB == nil {
        log.Printf("DBUpdatePumpState ignorado: banco de dados não inicializado")
        return
    }
    var isOn int = 0
    if on {
        isOn = 1
    }
    _, err := DB.Exec("UPDATE hmi_pumps SET is_on = :1 WHERE id = :2", isOn, id)
    if err != nil {
        log.Printf("ERRO AO ATUALIZAR ESTADO NO DB: %v", err)
    }
}

// (No futuro, adicionaremos DBUpdateTankLevel aqui)
