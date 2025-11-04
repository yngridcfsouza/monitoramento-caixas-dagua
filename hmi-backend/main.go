package main

import (
	// Importa o sql
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	_ "github.com/godror/godror" // Importa o driver
	"github.com/gorilla/websocket"
)

// 'upgrader'
var upgrader = websocket.Upgrader{
	CheckOrigin:     func(r *http.Request) bool { return true },
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// --- 1. Modelos de Dados (Sem mudanças) ---
type PumpStatus struct {
	ID       string `json:"id"`
	On       bool   `json:"on"`
	PumpMode string `json:"pumpMode"`
}
type TankStatus struct {
	ID    string  `json:"id"`
	Level float64 `json:"level"`
}
type HMIState struct {
	Tanks        []TankStatus `json:"tanks"`
	Pumps        []PumpStatus `json:"pumps"`
	ActiveAlerts []Alert      `json:"activeAlerts"`
}
type Alert struct {
	ID       string `json:"id"`
	Message  string `json:"message"`
	Level    string `json:"level"`
	ActiveAt string `json:"activeAt"`
}
type WsMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}
type PumpModePayload struct {
	ID       string `json:"id"`
	PumpMode string `json:"pumpMode"`
}
type PumpStatePayload struct {
	ID string `json:"id"`
	On bool   `json:"on"`
}

// --- 2. O Hub (Sem mudanças) ---
type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
}
type Client struct {
	hub  *Hub
	conn *websocket.Conn
	send chan []byte
}

var hub *Hub

func newHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
	}
}
func (h *Hub) run() { /* ... (código do hub sem mudanças) ... */
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true
			log.Println("Novo cliente registrado. Total:", len(h.clients))
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				log.Println("Cliente desregistrado. Total:", len(h.clients))
			}
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// --- 3. Métodos do Cliente (Sem mudanças) ---
func (c *Client) readPump() { /* ... (código do readPump sem mudanças) ... */
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(60 * time.Second)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("Erro de WebSocket (inesperado): %v", err)
			}
			log.Println("Fechando readPump (cliente desconectou).")
			break
		}
		log.Printf("Comando recebido: %s", message)
		var wsMsg WsMessage
		if err := json.Unmarshal(message, &wsMsg); err != nil {
			log.Printf("Erro ao parsear 'envelope' JSON: %v", err)
			continue
		}
		switch wsMsg.Type {
		case "SET_PUMP_MODE":
			var p PumpModePayload
			if err := json.Unmarshal(wsMsg.Payload, &p); err != nil {
				log.Printf("Erro ao parsear payload SET_PUMP_MODE: %v", err)
				continue
			}
			processPumpModeChange(p)
		case "SET_PUMP_STATE":
			var p PumpStatePayload
			if err := json.Unmarshal(wsMsg.Payload, &p); err != nil {
				log.Printf("Erro ao parsear payload SET_PUMP_STATE: %v", err)
				continue
			}
			processPumpStateChange(p)
		default:
			log.Printf("Tipo de comando desconhecido: %s", wsMsg.Type)
		}
	}
}
func (c *Client) writePump() { /* ... (código de writePump sem mudanças) ... */
	ticker := time.NewTicker(45 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			c.conn.WriteMessage(websocket.TextMessage, message)
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// --- 4. Armazenamento de Estado (MUDANÇA) ---
// Removemos o estado 'hard-coded'. Agora o 'store' é só um 'Mutex'.
// O 'database.go' vai popular a variável 'store.state' no início.
type Store struct {
	sync.RWMutex
	state HMIState
}

var store = Store{} // Inicializa um store vazio

func seedDefaultState() {
    store.state = HMIState{
        Tanks: []TankStatus{
            {ID: "TANK_1", Level: 0.0},
            {ID: "TANK_2", Level: 30.0},
        },
        Pumps: []PumpStatus{
            {ID: "PUMP_1", On: false, PumpMode: "AUTO"},
            {ID: "PUMP_2", On: false, PumpMode: "MANUAL"},
        },
        ActiveAlerts: []Alert{},
    }
}

// --- 5. Lógica de Negócio (Atualizada) ---
func broadcastStateChange(state HMIState) {
	message, err := json.Marshal(state)
	if err != nil {
		log.Printf("Erro ao encodar JSON para broadcast: %v", err)
		return
	}
	hub.broadcast <- message
}

func processPumpModeChange(p PumpModePayload) {
	log.Printf("Processando mudança de modo: ID %s para Modo %s", p.ID, p.PumpMode)
	store.Lock()
	var changed bool = false
	for i, pump := range store.state.Pumps {
		if pump.ID == p.ID {
			store.state.Pumps[i].PumpMode = p.PumpMode
			changed = true
			break
		}
	}
	currentStateSnapshot := store.state
	store.Unlock()

	// --- MUDANÇA: Atualiza o DB ---
	if changed {
		// Faz isso *depois* de liberar a trava, para não bloquear o broadcast
		go DBUpdatePumpMode(p.ID, p.PumpMode)
	}
	// --- FIM DA MUDANÇA ---

	broadcastStateChange(currentStateSnapshot)
}

func processPumpStateChange(p PumpStatePayload) {
	log.Printf("Processando mudança de estado: ID %s para On=%t", p.ID, p.On)
	store.Lock()
	defer store.Unlock()

	var changed bool = false
	for i, pump := range store.state.Pumps {
		if pump.ID == p.ID {
			if store.state.Pumps[i].PumpMode == "MANUAL" {
				store.state.Pumps[i].On = p.On
				changed = true // Marca para salvar no DB
				log.Printf("Bomba %s alterada para On=%t (Modo Manual)", p.ID, p.On)
			} else {
				log.Printf("Comando SET_PUMP_STATE ignorado: Bomba %s está em MODO AUTO", p.ID)
			}
			break
		}
	}
	currentStateSnapshot := store.state

	// --- MUDANÇA: Atualiza o DB ---
	if changed {
		// go DBUpdatePumpState(p.ID, p.On) // Podemos fazer isso em uma goroutine
		// Mas, para garantir, vamos fazer síncrono por enquanto
		DBUpdatePumpState(p.ID, p.On)
	}
	// --- FIM DA MUDANÇA ---

	broadcastStateChange(currentStateSnapshot)
}

// --- 6. Handlers (Sem mudanças) ---
func statusHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("Requisição recebida em /api/v1/status")
	store.RLock()
	defer store.RUnlock()
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	if err := json.NewEncoder(w).Encode(store.state); err != nil {
		log.Printf("Erro ao encodar JSON: %v", err)
		http.Error(w, "Erro interno do servidor", http.StatusInternalServerError)
	}
}
func wsHandler(w http.ResponseWriter, r *http.Request) {
	log.Println("Nova conexão WebSocket recebida em /ws")
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Erro ao atualizar para WebSocket: %v", err)
		return
	}
	client := &Client{
		hub:  hub,
		conn: conn,
		send: make(chan []byte, 256),
	}
	client.hub.register <- client
	go client.writePump()
	go client.readPump()
}

// --- 7. Simulação (Sem mudanças) ---
func checkAlerts(state *HMIState) { /* ... (código de checkAlerts sem mudanças) ... */
	newAlerts := []Alert{}
	now := time.Now().Format(time.RFC3339)
	if state.Tanks[0].Level <= 10.0 {
		newAlerts = append(newAlerts, Alert{
			ID:       "T-100-LOW",
			Message:  "Nível CRÍTICO Baixo - Cisterna T-100",
			Level:    "Critical",
			ActiveAt: now,
		})
	}
	if state.Tanks[0].Level >= 95.0 {
		newAlerts = append(newAlerts, Alert{
			ID:       "T-100-HIGH",
			Message:  "Alerta de Nível Alto - Cisterna T-100",
			Level:    "Warning",
			ActiveAt: now,
		})
	}
	if state.Tanks[1].Level >= 95.0 {
		newAlerts = append(newAlerts, Alert{
			ID:       "T-200-HIGH",
			Message:  "Alerta de Nível Alto - Tanque Superior T-200",
			Level:    "Warning",
			ActiveAt: now,
		})
	}
	state.ActiveAlerts = newAlerts
}
func runSimulation() {
    log.Println("Simulação de HMI iniciada...")
    ticker := time.NewTicker(2 * time.Second)
    defer ticker.Stop()
    for range ticker.C {
        store.Lock()
        if len(store.state.Tanks) < 2 || len(store.state.Pumps) < 1 {
            seedDefaultState()
        }
        // 1. Simula Tanques
        if store.state.Tanks[0].Level < 100.0 {
            store.state.Tanks[0].Level += 0.5
        } else {
            store.state.Tanks[0].Level = 0.0
        }
        store.state.Tanks[1].Level += 1.0
        if store.state.Tanks[1].Level > 60.0 {
            store.state.Tanks[1].Level = 30.0
        }
        // 2. Simula Bombas (em AUTO)
        pump1 := &store.state.Pumps[0]
        if pump1.PumpMode == "AUTO" {
            pump1.On = store.state.Tanks[0].Level > 90
        }
        // 3. Checa Alertas
        checkAlerts(&store.state)
        currentStateSnapshot := store.state
        store.Unlock()
        // 4. Transmite
        broadcastStateChange(currentStateSnapshot)
    }
}

// --- 8. Função Principal (MUDANÇA) ---
func main() {
    // --- Modo resiliente: tenta conectar ao DB, mas não mata o servidor se falhar ---
    if err := InitDB(); err != nil {
        log.Printf("AVISO: não foi possível conectar ao Oracle DB (%v). Iniciando servidor sem dados do DB.", err)
        store.Lock()
        seedDefaultState()
        store.Unlock()
    } else {
        if _, err := LoadStateFromDB(); err != nil {
            log.Printf("AVISO: falha ao carregar estado do DB (%v). Continuando com estado padrão.", err)
            store.Lock()
            seedDefaultState()
            store.Unlock()
        }
        store.Lock()
        if len(store.state.Tanks) < 2 || len(store.state.Pumps) < 1 {
            seedDefaultState()
        }
        store.Unlock()
    }

	hub = newHub()
	go hub.run()
	go runSimulation()

	http.HandleFunc("/api/v1/status", statusHandler)
	http.HandleFunc("/ws", wsHandler)

	port := ":8080"
	log.Printf("Servidor backend iniciado. Escutando na porta %s", port)
	log.Println("Endpoint REST: http://localhost:8080/api/v1/status")
	log.Println("Endpoint WebSocket: ws://localhost:8080/ws")

    if err := http.ListenAndServe(port, nil); err != nil {
        log.Fatalf("Erro ao iniciar servidor: %v", err)
    }
}
