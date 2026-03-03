Blockchain Portfolio Ledger

Documento de Diretrizes Técnicas (Rules para GitHub Copilot e Desenvolvimento)

1. O que é o projeto

O Blockchain Portfolio Ledger é um backend em Node.js responsável por:

Indexar eventos on-chain (inicialmente ERC-20 Transfer)

Normalizar eventos em um ledger interno imutável

Calcular saldos e snapshots por carteira/token

Realizar reconciliação entre saldo calculado e saldo real on-chain

Expor API para consulta de extrato e posição

Este projeto não é uma dApp, nem uma interface Web3 simples.
É um sistema de dados orientado a eventos com preocupação contábil, consistência e reprocessamento seguro.

2. Função do Projeto

A função do sistema é atuar como:

Um reconciliador e processador off-chain confiável para eventos blockchain, com capacidade auditável.

Ele resolve o seguinte problema:

Eventos blockchain são públicos, mas:

São caros de processar em tempo real

Não estão organizados por usuário

Não fornecem histórico estruturado por aplicação

Precisamos de um ledger interno determinístico e reprocessável.

3. Objetivo Técnico

O projeto deve demonstrar:

Arquitetura em camadas (Clean Architecture)

Idempotência

Reprocessamento seguro por janela de blocos

Controle de consistência

Estratégia de testes clara

Observabilidade mínima

Boas práticas de versionamento e documentação

4. Stack Tecnológica
Runtime

Node.js (LTS)

TypeScript (strict mode habilitado)

Blockchain

viem (preferencial) ou ethers

RPC provider (Alchemy/Infura)

API

Fastify

Banco de Dados

PostgreSQL

Fila / Jobs

BullMQ + Redis

Validação

Zod

Observabilidade

Pino (logs estruturados)

Métricas simples (Prometheus-style endpoint)

DevOps

Docker

docker-compose

GitHub Actions (CI)

ESLint + Prettier

Husky (opcional)

5. Estrutura de Pastas (Obrigatória)
src/
│
├── domain/
│   ├── entities/
│   ├── value-objects/
│   ├── services/
│   └── repositories/
│
├── application/
│   ├── use-cases/
│   ├── dtos/
│   └── interfaces/
│
├── infrastructure/
│   ├── database/
│   ├── blockchain/
│   ├── queue/
│   └── logger/
│
├── api/
│   ├── controllers/
│   ├── routes/
│   ├── schemas/
│   └── plugins/
│
├── jobs/
│   ├── indexer/
│   ├── reconciler/
│   └── snapshot/
│
├── shared/
│   ├── config/
│   ├── errors/
│   └── utils/
│
└── main.ts
6. Regras Arquiteturais (Copilot Rules)
Regra 1 — Camadas

domain nunca importa nada de infrastructure

application não depende diretamente de banco

api não contém regra de negócio

jobs apenas orquestram use-cases

Regra 2 — Ledger é imutável

Nunca atualizar entradas

Nunca deletar eventos

Reprocessamento deve gerar novo estado derivado

Regra 3 — Idempotência

Cada evento deve ser identificado por:

chainId:blockNumber:transactionHash:logIndex

Não pode haver duplicação.

Regra 4 — Reprocessamento

Sistema deve permitir:

POST /reprocess?fromBlock=X&toBlock=Y

Reprocessamento:

Deve limpar snapshots derivados

Nunca apagar raw_events

Regra 5 — Sem lógica em controllers

Controllers:

Apenas validam input

Chamam use-cases

Retornam DTO

Regra 6 — Use Cases são atômicos

Cada caso de uso deve:

Ter responsabilidade única

Receber dependências por injeção

Ser facilmente testável

7. Modelo de Banco (Inicial)
raw_events

id

chain_id

block_number

tx_hash

log_index

from_address

to_address

token_address

amount

created_at

ledger_entries

id

wallet_address

token_address

amount (positivo ou negativo)

reference_event_id

created_at

snapshots

id

wallet_address

token_address

balance

snapshot_date

checkpoints

id

chain_id

last_processed_block

8. Fluxo Real do Sistema
1. Indexação

Buscar blocos não processados

Obter logs ERC-20 Transfer

Persistir raw_events

Atualizar checkpoint

2. Normalização

Para cada raw_event:

Criar débito para from

Criar crédito para to

Persistir ledger_entries

3. Snapshot

Somar ledger_entries até data X

Persistir snapshot

4. Reconciliação

Consultar balanceOf(address)

Comparar com snapshot mais recente

Registrar divergência (se houver)

9. MVP (Escopo Controlado)

MVP deve conter:

1 rede (Sepolia ou Polygon)

Apenas ERC-20 Transfer

Indexação manual via job

Snapshot diário

Endpoint:

GET /wallet/:address/statement

GET /wallet/:address/position

Reprocessamento por janela

Testes unitários do ledger

Não incluir:

NFTs

Swaps

Interface Web

Multi-chain

10. Entregáveis
Código

100% TypeScript strict

ESLint sem warnings

Testes unitários mínimos:

cálculo de saldo

idempotência

normalização

Infra

docker-compose com:

app

postgres

redis

README deve conter:

Visão geral

Diagrama simples

Setup local

Decisões arquiteturais

Roadmap

Limitações conhecidas

CI

Rodar:

lint

test

build

11. Critérios de Qualidade

Funções pequenas (< 40 linhas idealmente)

Sem any no TypeScript

Erros tratados explicitamente

Logs estruturados

DTOs explícitos

Nenhuma dependência cíclica

12. Roadmap Pós-MVP

Confirmations threshold

Reorg handling

Multi-chain

Métricas reais

Rate limiting

Autenticação JWT

Alertas de divergência

Se desejar, posso agora gerar:

Arquivo ARCHITECTURE.md

Arquivo .github/copilot-instructions.md

Modelo inicial de README.md

Primeiro conjunto de ADRs

Schema SQL inicial pronto para migration