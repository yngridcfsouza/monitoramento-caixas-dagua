# --- ETAPA 1: O "Builder" ---
FROM oraclelinux:8 AS builder

# Adicionado 'gcc' e ferramentas de build
RUN yum groupinstall -y "Development Tools" && \
    yum install -y oracle-epel-release-el8 oracle-instantclient-release-el8 git wget tar && \
    yum clean all

WORKDIR /app

# Instalar Go 1.24
RUN wget https://go.dev/dl/go1.24.1.linux-amd64.tar.gz && \
    tar -C /usr/local -xzf go1.24.1.linux-amd64.tar.gz && \
    ln -sf /usr/local/go/bin/go /usr/bin/go && \
    ln -sf /usr/local/go/bin/gofmt /usr/bin/gofmt && \
    rm -f go1.24.1.linux-amd64.tar.gz

# Oracle Instant Client completo (build)
RUN yum install -y oracle-instantclient-basic oracle-instantclient-devel && \
    yum clean all

# Variáveis para compilação com godror
ENV LD_LIBRARY_PATH=/usr/lib/oracle/21/client64/lib
ENV TNS_ADMIN=/tmp
ENV CGO_ENABLED=1
ENV OCI_LIB_DIR=/usr/lib/oracle/21/client64/lib
ENV OCI_INC_DIR=/usr/include/oracle/21/client64/sdk/include

RUN mkdir -p ${TNS_ADMIN}

# Copiar dependências Go e baixar módulos
COPY go.mod go.sum* ./
RUN go mod download

# Copiar código e compilar
COPY . .
RUN go build -tags oracle -o /server-app

# --- ETAPA 2: Imagem final (slim) ---
FROM oraclelinux:8-slim

# Oracle Instant Client runtime
RUN microdnf install -y oracle-instantclient-release-el8 && \
    microdnf install -y oracle-instantclient-basic oracle-instantclient-tools oracle-instantclient-sqlplus openssl openssl-libs ca-certificates && \
    microdnf clean all

WORKDIR /app

# Variáveis runtime
ENV LD_LIBRARY_PATH=/usr/lib/oracle/21/client64/lib
ENV TNS_ADMIN=/usr/oracle/wallet
ENV LD_LIBRARY_PATH=/usr/lib/oracle/21/client64/lib
ENV DPI_DEBUG_LEVEL=64
RUN mkdir -p ${TNS_ADMIN}

# ⚡ Copiar a pasta wallet (com tnsnames.ora)
COPY wallet/* ${TNS_ADMIN}/

# Copiar apenas o binário compilado do builder
COPY --from=builder /server-app .

# Expor porta e executar
EXPOSE 8080
CMD ["./server-app"]
