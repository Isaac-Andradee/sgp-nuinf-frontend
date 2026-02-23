# SGP NUINF — Frontend Instructions

Guia completo para implementação do frontend React do Sistema de Gestão de Patrimônio da NUINF. Este documento descreve toda a API, modelos de dados, regras de negócio, fluxos de autenticação e sugestões de melhoria. O design visual já foi definido no Figma — este documento foca exclusivamente no contrato com o backend e nas decisões de implementação.

---

## Índice

1. [Visão Geral do Sistema](#1-visão-geral-do-sistema)
2. [Configuração do Projeto React](#2-configuração-do-projeto-react)
3. [Autenticação e Segurança](#3-autenticação-e-segurança)
4. [Rotas e Telas](#4-rotas-e-telas)
5. [Referência Completa da API](#5-referência-completa-da-api)
6. [Modelos de Dados (TypeScript)](#6-modelos-de-dados-typescript)
7. [Regras de Negócio](#7-regras-de-negócio)
8. [Tratamento de Erros](#8-tratamento-de-erros)
9. [RBAC — Controle de Acesso por Papel](#9-rbac--controle-de-acesso-por-papel)
10. [Bugs do Frontend Legado a Corrigir](#10-bugs-do-frontend-legado-a-corrigir)
11. [Sugestões de Melhoria e Features Novas](#11-sugestões-de-melhoria-e-features-novas)
12. [Arquitetura de Frontend Recomendada](#12-arquitetura-de-frontend-recomendada)

---

## 1. Visão Geral do Sistema

**Nome:** SGP NUINF — Sistema de Gestão de Patrimônio NUINF  
**Finalidade:** Controle de equipamentos de TI (desktops, monitores, laptops, periféricos, impressoras, servidores, roteadores, switches), com rastreamento por setor, responsável, status e movimentações.

### Stack do Backend

| Componente | Tecnologia |
|---|---|
| Framework | Spring Boot 3 (Java 21) |
| Banco de dados | PostgreSQL |
| Autenticação | JWT via cookie httpOnly `AC_TOKEN` |
| Migração de schema | Flyway |
| Porta padrão | `8081` |
| Base URL da API | `/api` |

### Fluxo de alto nível

```
Usuário → React SPA → API REST (Spring Boot :8081) → PostgreSQL
```

O React **deve** rodar numa origem diferente do backend (ex: `http://localhost:3000` em dev). CORS está configurado no backend via variável `CORS_ALLOWED_ORIGINS`.

---

## 2. Configuração do Projeto React

### Variáveis de ambiente (`.env`)

```env
# URL base da API — sem trailing slash
VITE_API_BASE_URL=http://localhost:8081/api

# Para produção (Docker):
# VITE_API_BASE_URL=http://seu-servidor:8081/api
```

### CORS — configuração do backend

O backend precisa ter a origem do React adicionada. Edite o `.env` do backend:

```env
CORS_ALLOWED_ORIGINS=http://localhost:3000
```

Para múltiplas origens:
```env
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://seu-dominio.com
```

### Cliente HTTP — configuração obrigatória

**CRÍTICO:** O backend usa cookie httpOnly `AC_TOKEN`. Toda request deve incluir `credentials: 'include'`. Sem isso, o cookie não é enviado e todas as requests retornam `401`.

```typescript
// lib/api.ts — cliente base com Axios
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true, // OBRIGATÓRIO — envia o cookie AC_TOKEN
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Interceptor global: redirecionar para /login em 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Limpar estado local e redirecionar
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

> **Não use `localStorage` ou `sessionStorage` para armazenar o token JWT.** O backend retorna o token no body do login (campo `token`) apenas como referência — o mecanismo real de autenticação é o cookie httpOnly gerenciado pelo browser automaticamente.

---

## 3. Autenticação e Segurança

### Fluxo de Login

```
1. POST /api/auth/login { username, password }
   → Backend valida credenciais
   → Backend define cookie httpOnly "AC_TOKEN" (SameSite=Lax, Path=/)
   → Backend retorna LoginResponse no body

2. Browser armazena o cookie automaticamente

3. Todas as requests subsequentes enviam o cookie automaticamente
   (desde que withCredentials: true esteja configurado)

4. POST /api/auth/logout
   → Backend zera maxAge do cookie (AC_TOKEN="", maxAge=0)
   → Cookie é removido pelo browser
```

### Rate Limiting

O backend aplica limites de requisição por IP:

| Grupo de endpoints | Limite |
|---|---|
| `/api/auth/*` e `/setup` | 20 requisições/minuto |
| Todos os outros (`/api/**`) | 100 requisições/minuto |

Quando o limite é excedido, o backend retorna `429 Too Many Requests`. Exibir mensagem amigável ao usuário.

### Bloqueio de Conta

Após **5 tentativas de login com falha** (configurável via `SECURITY_LOCK_MAX_FAILED_ATTEMPTS`), a conta é bloqueada por **15 minutos** (configurável via `SECURITY_LOCK_LOCK_MINUTES`).

O backend retorna `401` com mensagem indicando o bloqueio. O frontend deve:
- Detectar a mensagem de bloqueio na resposta
- Exibir um aviso claro ao usuário (ex: "Conta bloqueada. Tente novamente às HH:MM")

### Política de Senha

Regex padrão: `^(?=.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).*$`

Requisitos que devem ser validados **no frontend antes de enviar**:
- Mínimo 8 caracteres
- Pelo menos 1 letra maiúscula
- Pelo menos 1 letra minúscula
- Pelo menos 1 número
- Pelo menos 1 caractere especial (ex: `!@#$%^&*`)

### Reset de Senha

```
1. POST /api/auth/forgot-password?email=usuario@dominio.com
   → Sempre retorna 200 OK (independente de o email existir ou não)
   → Backend envia email com link contendo token
   → Link formato: http://ORIGIN/reset-password?token=UUID

2. POST /api/auth/reset-password?token=TOKEN&password=NOVA_SENHA
   → Retorna 200 OK em sucesso
   → Retorna 4xx em caso de token inválido, expirado ou já utilizado
```

> O backend retorna `200 OK` mesmo para emails inexistentes, mitigando ataques de enumeração de email. O frontend deve sempre exibir "Se este email estiver cadastrado, você receberá um link."

---

## 4. Rotas e Telas

### Mapa de Rotas

| Rota | Tela | Autenticação | Role mínima |
|---|---|---|---|
| `/setup` | Criação do primeiro administrador | Pública | — |
| `/login` | Login | Pública | — |
| `/forgot-password` | Solicitar reset de senha | Pública | — |
| `/reset-password` | Definir nova senha (via `?token=`) | Pública | — |
| `/dashboard` | Painel com KPIs e tabela de equipamentos | Autenticado | VIEWER, USER, ADMIN |
| `/movimentacao` | Transferência e substituição de equipamentos | Autenticado | VIEWER, USER, ADMIN |
| `/setores` | Gestão de setores | Autenticado | VIEWER, USER, ADMIN |
| `/usuarios` | Gestão de usuários do sistema | Autenticado | **ADMIN only** |
| `/perfil` | Dados do usuário logado e troca de senha | Autenticado | VIEWER, USER, ADMIN |
| `/equipamento/:id` | Detalhe completo de um equipamento | Autenticado | VIEWER, USER, ADMIN |

### Guards de Rota

```typescript
// Exemplo com React Router v6
function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" />;
  if (requiredRole && user?.role !== requiredRole) return <Navigate to="/dashboard" />;

  return children;
}

// Uso:
<Route path="/usuarios" element={
  <ProtectedRoute requiredRole="ADMIN">
    <UsersPage />
  </ProtectedRoute>
} />
```

### Tela de Setup (Primeiro Acesso)

A tela `/setup` só é funcional quando o banco está vazio. Após o primeiro admin ser criado, o endpoint retorna `404` para qualquer tentativa subsequente.

**Lógica recomendada:**
```
1. Ao inicializar a app, tente GET /api/auth/me
2. Se retornar 401 → verificar se é primeiro acesso
3. Opcionalmente: tentar POST /setup com dados fictícios e checar se retorna 404 (banco não vazio) ou 201 (banco vazio)
4. Exibir /setup somente se banco estiver vazio
```

Alternativa mais simples: adicionar a rota `/setup` como acessível manualmente pelo administrador, e após o sucesso (`201`), redirecionar para `/login`.

---

## 5. Referência Completa da API

### 5.1 Autenticação — `/api/auth`

---

#### `POST /api/auth/login`
Autentica o usuário e define o cookie de sessão.

**Requer autenticação:** Não

**Request Body:**
```json
{
  "username": "admin",
  "password": "Senha@123"
}
```

**Response `200 OK`:**
```json
{
  "token": "eyJhbGci...",
  "type": "Bearer",
  "expiresIn": 86400000,
  "username": "admin",
  "fullName": "Administrador",
  "role": "ADMIN"
}
```

**Response `401 Unauthorized`** (credenciais inválidas ou conta bloqueada):
```json
{
  "timestamp": "2026-02-22T10:30:00",
  "status": 401,
  "error": "Unauthorized",
  "message": "Credenciais inválidas",
  "path": "/api/auth/login"
}
```

**Cookie definido:** `AC_TOKEN=<jwt>; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`

---

#### `GET /api/auth/me`
Retorna os dados do usuário autenticado.

**Requer autenticação:** Sim (cookie `AC_TOKEN`)

**Response `200 OK`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "admin",
  "email": "admin@nuinf.mil.br",
  "fullName": "Administrador",
  "role": "ADMIN"
}
```

**Response `401 Unauthorized`:** Cookie ausente ou expirado.

---

#### `POST /api/auth/logout`
Invalida o cookie de sessão.

**Requer autenticação:** Não (pode ser chamado mesmo sem cookie)

**Request Body:** Nenhum

**Response `200 OK`:** Body vazio. Cookie `AC_TOKEN` zerado (`Max-Age=0`).

---

#### `POST /api/auth/forgot-password`
Solicita o envio de email com link de reset de senha.

**Requer autenticação:** Não

**Query Parameter:** `email` (string, obrigatório)

**Exemplo:** `POST /api/auth/forgot-password?email=usuario@dominio.com`

**Response `200 OK`:** Body vazio. **Sempre retorna 200, independente de o email existir.**

**Request Header (opcional):** `Origin: http://localhost:3000`
> O backend usa o header `Origin` para construir o link do email. Certifique-se de que o browser envia este header automaticamente (ele envia para requests cross-origin).

---

#### `POST /api/auth/reset-password`
Redefine a senha usando o token recebido por email.

**Requer autenticação:** Não

**Query Parameters:**
- `token` (string) — UUID do token de reset
- `password` (string) — nova senha (deve obedecer a política)

**Exemplo:** `POST /api/auth/reset-password?token=abc123&password=NovaSenha@1`

**Response `200 OK`:** Senha redefinida com sucesso.

**Response `4xx`:** Token inválido, expirado ou já utilizado.

---

### 5.2 Setup — `/setup`

---

#### `POST /setup`
Cria o primeiro usuário administrador. Retorna `404` se já existir qualquer usuário.

**Requer autenticação:** Não

**Request Body:**
```json
{
  "username": "admin",
  "password": "Senha@123",
  "email": "admin@nuinf.mil.br",
  "fullName": "Administrador NUINF"
}
```

**Validações:**
- `username`: obrigatório
- `password`: obrigatório, deve obedecer à política de senha
- `email`: obrigatório, formato de email válido
- `fullName`: opcional

**Response `201 Created`:** `"Admin created: admin"`

**Response `404 Not Found`:** Banco já possui usuários cadastrados.

---

### 5.3 Usuários — `/api/users` (ADMIN only)

Todos os endpoints desta seção requerem autenticação e role `ADMIN`.

---

#### `GET /api/users`
Lista todos os usuários com paginação.

**Query Parameters:**
| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | int | 0 | Número da página (0-indexed) |
| `size` | int | 10 | Itens por página |
| `sort` | string | — | Campo de ordenação (ex: `username,asc`) |

**Response `200 OK`:** `PagedResponse<UserResponse>` (ver seção de modelos)

---

#### `POST /api/users`
Cria um novo usuário.

**Request Body:**
```json
{
  "username": "joao.silva",
  "password": "Senha@123",
  "email": "joao@nuinf.mil.br",
  "fullName": "João Silva",
  "role": "USER"
}
```

**Validações:**
| Campo | Regras |
|---|---|
| `username` | Obrigatório, 3–50 caracteres |
| `password` | Obrigatório, mín. 8 caracteres, deve obedecer à política |
| `email` | Obrigatório, formato de email válido |
| `fullName` | Obrigatório, máx. 200 caracteres |
| `role` | Obrigatório, um de: `ADMIN`, `USER`, `VIEWER` |

**Response `201 Created`:** `UserResponse`

---

#### `GET /api/users/{id}`
Retorna um usuário pelo UUID.

**Response `200 OK`:** `UserResponse`

**Response `404 Not Found`:** Usuário não encontrado.

---

#### `PUT /api/users/{id}`
Atualiza um usuário existente. Todos os campos são opcionais (PATCH semântico).

**Request Body:**
```json
{
  "email": "novo@nuinf.mil.br",
  "fullName": "Novo Nome",
  "role": "ADMIN",
  "enabled": false,
  "password": "NovaSenha@1"
}
```

**Validações (campos opcionais):**
| Campo | Regras |
|---|---|
| `password` | Mín. 8 caracteres, deve obedecer à política |
| `email` | Formato de email válido |
| `fullName` | Máx. 200 caracteres |
| `role` | Um de: `ADMIN`, `USER`, `VIEWER` |
| `enabled` | Boolean |

**Response `200 OK`:** `UserResponse`

**Response `404 Not Found`:** Usuário não encontrado.

---

#### `DELETE /api/users/{id}`
Remove um usuário.

**Response `204 No Content`:** Usuário removido.

**Response `404 Not Found`:** Usuário não encontrado.

---

#### `POST /api/users/{id}/change-password`
Altera a senha de um usuário. Admins podem alterar qualquer senha; usuários comuns, apenas a própria.

**Requer autenticação:** Sim. Role `ADMIN` **ou** o próprio usuário (`id` corresponde ao usuário logado).

**Request Body:**
```json
{
  "currentPassword": "SenhaAtual@1",
  "newPassword": "NovaSenha@2"
}
```

**Validações:**
| Campo | Regras |
|---|---|
| `currentPassword` | Obrigatório |
| `newPassword` | Obrigatório, mín. 6 caracteres (recomenda-se validar a política completa no frontend) |

**Response `204 No Content`:** Senha alterada com sucesso.

**Response `400 Bad Request`:** Senha atual incorreta.

**Response `404 Not Found`:** Usuário não encontrado.

---

### 5.4 Equipamentos — `/api/equipments`

Todos os endpoints requerem autenticação. Não há restrição de role adicional além de autenticado (o backend aplica `canEditEquipment`/`canDeleteEquipment` no nível de domínio — o frontend deve respeitar esses flags do `UserResponse`).

---

#### `GET /api/equipments`
Lista equipamentos com paginação.

**Query Parameters:**
| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `page` | int | 0 | Número da página |
| `size` | int | 10 | Itens por página |
| `sortBy` | string | `createdAt` | Campo de ordenação |
| `sortDirection` | string | `DESC` | `ASC` ou `DESC` |

**Response `200 OK`:** `PagedResponse<EquipmentResponseDTO>`

---

#### `POST /api/equipments/filter`
Filtra equipamentos com critérios avançados.

**Request Body:**
```json
{
  "textoBusca": "Dell",
  "marca": "Dell",
  "setorId": "550e8400-e29b-41d4-a716-446655440000",
  "tipo": "DESKTOP",
  "status": "DISPONIVEL"
}
```

Todos os campos são opcionais. Campos não informados são ignorados.

**Validações:**
| Campo | Regras |
|---|---|
| `textoBusca` | Máx. 200 caracteres |
| `marca` | Máx. 100 caracteres |
| `setorId` | UUID válido |
| `tipo` | Um dos valores de `EquipmentType` |
| `status` | Um dos valores de `EquipmentStatus` |

**Response `200 OK`:** `List<EquipmentResponseDTO>` (sem paginação)

---

#### `POST /api/equipments`
Cadastra um novo equipamento.

**Request Body:**
```json
{
  "assetNumber": "TI-2024-001",
  "serialNumber": "SN123456",
  "description": "Desktop para uso administrativo",
  "hostname": "pc-admin-01",
  "ipAddress": "192.168.1.100",
  "brand": "Dell",
  "type": "DESKTOP",
  "status": "EM_USO",
  "equipmentUser": "João Silva",
  "sectorId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Validações:**
| Campo | Regras |
|---|---|
| `assetNumber` | Obrigatório, máx. 50 chars, regex `^[A-Za-z0-9-]+$`. Envie `"TEMP-"` para item sem etiqueta (backend gera PROV-XXXXXX) |
| `serialNumber` | Opcional, máx. 100 caracteres |
| `description` | Opcional, máx. 500 caracteres |
| `hostname` | Opcional, regex `^[a-zA-Z0-9.-]*$`, máx. 100 caracteres |
| `ipAddress` | Opcional, formato IPv4 válido |
| `brand` | Obrigatório, 2–100 caracteres |
| `type` | Obrigatório, um dos valores de `EquipmentType` |
| `status` | Obrigatório, um dos valores de `EquipmentStatus` |
| `equipmentUser` | Opcional, máx. 200 caracteres |
| `sectorId` | Obrigatório, UUID válido |

**Response `201 Created`:** `EquipmentResponseDTO`

**Header de resposta:** `Location: /api/equipments/{id}`

---

#### `PUT /api/equipments/{id}`
Atualiza um equipamento existente.

**Request Body:** Mesma estrutura do `POST /api/equipments`

**Response `200 OK`:** `EquipmentResponseDTO`

**Response `404 Not Found`:** Equipamento não encontrado.

---

#### `DELETE /api/equipments/{id}`
Remove (desativa) um equipamento. Operação de **soft delete**: o equipamento recebe status `BAIXADO` e o responsável é removido.

**Response `204 No Content`:** Equipamento desativado.

**Response `404 Not Found`:** Equipamento não encontrado.

---

#### `POST /api/equipments/move`
Transfere um equipamento para outro setor.

**Request Body:**
```json
{
  "equipmentId": "550e8400-e29b-41d4-a716-446655440000",
  "targetSectorId": "660e8400-e29b-41d4-a716-446655440001",
  "targetUser": "Maria Santos",
  "targetStatus": "EM_USO"
}
```

**Validações:**
| Campo | Regras |
|---|---|
| `equipmentId` | Obrigatório, UUID válido |
| `targetSectorId` | Obrigatório, UUID válido |
| `targetUser` | Opcional, máx. 200 caracteres. Ignorado se `targetStatus` limpa o responsável |
| `targetStatus` | Obrigatório, um dos valores de `EquipmentStatus` |

**Response `200 OK`:** Body vazio.

**Regra de negócio:** Se o status destino for `DISPONIVEL`, `INDISPONIVEL`, `MANUTENCAO` ou `BAIXADO`, o campo `targetUser` é ignorado e o responsável é limpo automaticamente.

---

#### `POST /api/equipments/swap`
Substitui um equipamento por outro (troca).

**Request Body:**
```json
{
  "outgoingEquipmentId": "550e8400-e29b-41d4-a716-446655440000",
  "incomingEquipmentId": "660e8400-e29b-41d4-a716-446655440001",
  "isDefective": false
}
```

**Campos:**
| Campo | Regras |
|---|---|
| `outgoingEquipmentId` | Obrigatório, UUID do equipamento que está saindo |
| `incomingEquipmentId` | Obrigatório, UUID do equipamento que está entrando |
| `isDefective` | Obrigatório, boolean. Se `true`, o equipamento saindo vai para MANUTENCAO no setor NUINF |

**Response `200 OK`:** Body vazio.

**Lógica do swap:**
- O equipamento **entrando** herda: setor, status e responsável do equipamento saindo
- O equipamento **saindo**, se `isDefective = true`: vai para setor NUINF com status `MANUTENCAO`
- O equipamento **saindo**, se `isDefective = false`: se veio do setor NUINF → `DISPONIVEL`; caso contrário → `EM_USO`

---

#### `GET /api/equipments/types`
Retorna a lista de tipos de equipamento disponíveis.

**Response `200 OK`:**
```json
["DESKTOP", "MONITOR", "TECLADO", "MOUSE", "LAPTOP", "IMPRESSORA", "ROTEADOR", "SWITCH", "SERVIDOR"]
```

---

#### `GET /api/equipments/statuses`
Retorna a lista de status disponíveis.

**Response `200 OK`:**
```json
["DISPONIVEL", "INDISPONIVEL", "PROVISORIO", "EM_USO", "MANUTENCAO", "BAIXADO"]
```

---

#### `GET /api/equipments/stats/kpi`
Retorna os KPIs para o dashboard.

**Response `200 OK`:**
```json
{
  "totalDisponivel": 42,
  "totalIndisponivel": 5,
  "totalAtivos": 120,
  "totalManutencao": 8,
  "totalProvisorio": 3,
  "totalGeral": 178
}
```

---

#### `GET /api/equipments/stats/sectors`
Retorna métricas de equipamentos agrupadas por setor.

**Response `200 OK`:**
```json
[
  {
    "acronym": "TI",
    "fullName": "Tecnologia da Informação",
    "totalItens": 45,
    "distributionByType": {
      "DESKTOP": 20,
      "MONITOR": 18,
      "LAPTOP": 7
    }
  },
  {
    "acronym": "ADM",
    "fullName": "Administração",
    "totalItens": 30,
    "distributionByType": {
      "DESKTOP": 15,
      "IMPRESSORA": 5,
      "MONITOR": 10
    }
  }
]
```

Ordenado por `totalItens` de forma decrescente.

---

### 5.5 Setores — `/api/sectors`

Todos os endpoints requerem autenticação.

---

#### `GET /api/sectors`
Lista todos os setores ativos.

**Response `200 OK`:** `List<SectorResponseDTO>`

```json
[
  { "id": "550e8400...", "acronym": "TI", "fullName": "Tecnologia da Informação" },
  { "id": "660e8400...", "acronym": "ADM", "fullName": "Administração" }
]
```

---

#### `POST /api/sectors`
Cria um novo setor.

**Request Body:**
```json
{
  "fullName": "Recursos Humanos",
  "acronym": "RH"
}
```

**Validações:**
| Campo | Regras |
|---|---|
| `fullName` | Obrigatório, 3–200 caracteres |
| `acronym` | Obrigatório, 2–20 caracteres, regex `^[A-Z0-9-]+$` (apenas maiúsculas, números e hífen) |

**Response `201 Created`:** `SectorResponseDTO`

**Header:** `Location: /api/sectors/{id}`

---

#### `GET /api/sectors/{id}`
Retorna um setor pelo UUID.

**Response `200 OK`:** `SectorResponseDTO`

**Response `404 Not Found`:** Setor não encontrado.

---

#### `PUT /api/sectors/{id}`
Atualiza um setor existente.

**Request Body:** Mesma estrutura do `POST /api/sectors`

**Response `200 OK`:** `SectorResponseDTO`

---

#### `DELETE /api/sectors/{id}`
Desativa um setor (soft delete: campo `active = false`).

**Response `204 No Content`:** Setor desativado.

---

## 6. Modelos de Dados (TypeScript)

### Enums

```typescript
export type UserRole = 'ADMIN' | 'USER' | 'VIEWER';

export type EquipmentType =
  | 'DESKTOP'
  | 'MONITOR'
  | 'TECLADO'
  | 'MOUSE'
  | 'LAPTOP'
  | 'IMPRESSORA'
  | 'ROTEADOR'
  | 'SWITCH'
  | 'SERVIDOR';

export type EquipmentStatus =
  | 'DISPONIVEL'
  | 'INDISPONIVEL'
  | 'PROVISORIO'
  | 'EM_USO'
  | 'MANUTENCAO'
  | 'BAIXADO';
```

### Labels para exibição

```typescript
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  DESKTOP: 'Desktop',
  MONITOR: 'Monitor',
  TECLADO: 'Teclado',
  MOUSE: 'Mouse',
  LAPTOP: 'Laptop',
  IMPRESSORA: 'Impressora',
  ROTEADOR: 'Roteador',
  SWITCH: 'Switch',
  SERVIDOR: 'Servidor',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  DISPONIVEL: 'Disponível',
  INDISPONIVEL: 'Indisponível',
  PROVISORIO: 'Provisório',
  EM_USO: 'Em Uso',
  MANUTENCAO: 'Manutenção',
  BAIXADO: 'Baixado',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, { bg: string; text: string }> = {
  DISPONIVEL:   { bg: 'bg-green-100',  text: 'text-green-800'  },
  EM_USO:       { bg: 'bg-blue-100',   text: 'text-blue-800'   },
  PROVISORIO:   { bg: 'bg-purple-100', text: 'text-purple-800' },
  INDISPONIVEL: { bg: 'bg-red-100',    text: 'text-red-800'    },
  MANUTENCAO:   { bg: 'bg-yellow-100', text: 'text-yellow-800' },
  BAIXADO:      { bg: 'bg-gray-100',   text: 'text-gray-500'   },
};

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  USER: 'Usuário',
  VIEWER: 'Visualizador',
};
```

### Auth

```typescript
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  token: string;      // JWT (referência — o cookie httpOnly é o mecanismo real)
  type: string;       // sempre "Bearer"
  expiresIn: number;  // milissegundos (padrão: 86400000 = 24h)
  username: string;
  fullName: string;
  role: UserRole;
}

export interface SetupRequest {
  username: string;
  password: string;
  email: string;
  fullName?: string;
}
```

### Usuários

```typescript
export interface UserResponse {
  id: string;         // UUID
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  // Nota: enabled, canEditEquipment, canDeleteEquipment existem no domínio
  // mas podem não ser retornados na versão atual do UserResponse.
  // Se necessário para RBAC no frontend, confirmar com o backend.
}

export interface CreateUserRequest {
  username: string;   // 3–50 chars
  password: string;   // mín. 8 chars, política de senha
  email: string;      // email válido
  fullName: string;   // máx. 200 chars
  role: UserRole;
}

export interface UpdateUserRequest {
  password?: string;  // mín. 8 chars
  email?: string;
  fullName?: string;  // máx. 200 chars
  role?: UserRole;
  enabled?: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;  // mín. 8 chars, política de senha
}
```

### Equipamentos

```typescript
export interface SectorResponseDTO {
  id: string;         // UUID
  acronym: string;    // ex: "TI"
  fullName: string;   // ex: "Tecnologia da Informação"
}

export interface EquipmentResponseDTO {
  id: string;                // UUID
  assetNumber: string;       // Número de patrimônio (ex: "TI-2024-001" ou "PROV-240001")
  serialNumber?: string;
  description?: string;
  hostname?: string;
  ipAddress?: string;
  brand: string;
  type: EquipmentType;
  status: EquipmentStatus;
  equipmentUser?: string;    // Responsável pelo equipamento
  currentSector: SectorResponseDTO;
  createdAt: string;         // ISO 8601
}

export interface CreateEquipmentDTO {
  assetNumber: string;       // Use "TEMP-" para item sem etiqueta
  serialNumber?: string;
  description?: string;
  hostname?: string;
  ipAddress?: string;
  brand: string;
  type: EquipmentType;
  status: EquipmentStatus;
  equipmentUser?: string;
  sectorId: string;          // UUID do setor
}

export interface EquipmentFilterDTO {
  textoBusca?: string;       // Busca geral no texto
  marca?: string;
  setorId?: string;          // UUID do setor
  tipo?: EquipmentType;
  status?: EquipmentStatus;
}

export interface MoveEquipmentDTO {
  equipmentId: string;       // UUID
  targetSectorId: string;    // UUID
  targetUser?: string;
  targetStatus: EquipmentStatus;
}

export interface SwapEquipmentDTO {
  outgoingEquipmentId: string;  // UUID do equipamento saindo
  incomingEquipmentId: string;  // UUID do equipamento entrando
  isDefective: boolean;
}
```

### Setores

```typescript
export interface CreateSectorDTO {
  fullName: string;   // 3–200 chars
  acronym: string;    // 2–20 chars, apenas [A-Z0-9-]
}
```

### Dashboard

```typescript
export interface DashboardStatsDTO {
  totalDisponivel: number;
  totalIndisponivel: number;
  totalAtivos: number;
  totalManutencao: number;
  totalProvisorio: number;
  totalGeral: number;
}

export interface SectorMetricDTO {
  acronym: string;
  fullName: string;
  totalItens: number;
  distributionByType: Partial<Record<EquipmentType, number>>;
}
```

### Paginação e Erros

```typescript
export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface ErrorResponse {
  timestamp: string;           // ISO 8601
  status: number;
  error: string;               // ex: "Not Found", "Bad Request"
  message: string;             // mensagem legível
  path: string;                // endpoint que gerou o erro
  validationErrors?: Record<string, string>; // campo → mensagem de erro (para 400)
}
```

---

## 7. Regras de Negócio

### 7.1 Setup do Sistema

- A tela `/setup` só tem função quando o banco está vazio (sem nenhum usuário)
- O endpoint `POST /setup` retorna `201` se criou o admin, `404` se já existe algum usuário
- Após criação com sucesso, redirecionar para `/login`
- Não exibir a tela de setup para usuários já autenticados

### 7.2 Equipamento Provisório (Sem Etiqueta)

Quando um equipamento ainda não possui número de patrimônio (etiqueta), o usuário deve marcar um checkbox "Sem etiqueta" no formulário. Nesse caso:
- O campo `assetNumber` deve ser enviado como `"TEMP-"` (string literal)
- O backend gerará automaticamente um número no formato `PROV-XXXXXX`
- O status será automaticamente definido como `PROVISORIO`

```typescript
const assetNumber = semEtiqueta ? 'TEMP-' : valorDoInput;
```

### 7.3 Status e Responsável

Certos status indicam que o equipamento não está atribuído a nenhum usuário. O campo "Responsável" deve ser desabilitado/oculto quando o status for:
- `DISPONIVEL` — disponível para uso, sem responsável
- `INDISPONIVEL` — indisponível por algum motivo, sem responsável
- `MANUTENCAO` — em manutenção, sem responsável
- `BAIXADO` — desativado, sem responsável

O campo "Responsável" está ativo apenas para:
- `EM_USO` — em uso por alguém (responsável obrigatório)
- `PROVISORIO` — item provisório (responsável opcional)

```typescript
export const STATUS_REQUIRES_USER: Partial<Record<EquipmentStatus, boolean>> = {
  EM_USO: true,
  PROVISORIO: false, // opcional
};

export function shouldShowUserField(status: EquipmentStatus): boolean {
  return status === 'EM_USO' || status === 'PROVISORIO';
}
```

### 7.4 Lógica de Transferência (Move)

1. Usuário seleciona o equipamento a transferir (busca por patrimônio, serial ou nome)
2. Usuário seleciona o setor destino
3. Usuário seleciona o status no destino
4. Se o status destino permitir responsável (`EM_USO`, `PROVISORIO`), exibir campo de responsável
5. Confirmar e enviar `POST /api/equipments/move`

### 7.5 Lógica de Substituição (Swap)

1. **Item Saindo**: buscar o equipamento que será substituído
   - Opcional: marcar "Possui Defeito?" → se sim, vai para MANUTENCAO no setor NUINF
2. **Item Entrando**: buscar o equipamento que tomará o lugar
   - Herda setor, status e responsável do item saindo
3. Confirmar e enviar `POST /api/equipments/swap`

> O setor **NUINF** tem papel especial no sistema: é o setor de origem/destino para itens disponíveis e defeituosos. Certifique-se de que esse setor existe no banco.

### 7.6 Paginação

A API de equipamentos e usuários usa paginação server-side. O frontend deve:
- Enviar `page` (0-indexed) e `size` nos parâmetros
- Usar `totalPages` e `totalElements` para renderizar o controle de paginação
- Usar `first` e `last` para desabilitar botões de navegação
- Não recarregar a lista inteira ao mudar de página

### 7.7 Política de Senha (Frontend)

Validar **antes de enviar** ao servidor:

```typescript
const PASSWORD_REGEX = /^(?=.{8,}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^\w\s]).*$/;

export function validatePassword(password: string): string | null {
  if (!password) return 'Senha obrigatória';
  if (password.length < 8) return 'Mínimo de 8 caracteres';
  if (!PASSWORD_REGEX.test(password)) {
    return 'Deve conter maiúscula, minúscula, número e caractere especial';
  }
  return null; // válido
}
```

### 7.8 Acrônimo de Setor

O campo `acronym` aceita apenas letras maiúsculas, números e hífen:

```typescript
const ACRONYM_REGEX = /^[A-Z0-9-]+$/;
// Válido: "TI", "ADM", "RH-1", "NUINF"
// Inválido: "ti", "R H", "setor@1"
```

---

## 8. Tratamento de Erros

### Estrutura padrão de erro

```typescript
// ErrorResponse do backend
{
  "timestamp": "2026-02-22T10:30:00",
  "status": 400,
  "error": "Bad Request",
  "message": "Erro de validação",
  "path": "/api/equipments",
  "validationErrors": {
    "brand": "must not be blank",
    "sectorId": "must not be null"
  }
}
```

### Mapeamento de códigos HTTP

| Status | Cenário | Ação no Frontend |
|---|---|---|
| `200` / `201` / `204` | Sucesso | Toast de confirmação |
| `400` | Dados inválidos | Exibir `validationErrors` nos campos do formulário |
| `401` | Não autenticado / sessão expirada | Redirecionar para `/login` com mensagem |
| `403` | Sem permissão | Exibir mensagem "Sem permissão" |
| `404` | Recurso não encontrado | Exibir mensagem de erro ou redirecionar |
| `409` | Conflito (ex: username duplicado) | Exibir mensagem específica do campo |
| `423` / `401` com msg de bloqueio | Conta bloqueada | Exibir aviso de bloqueio com tempo |
| `429` | Rate limit excedido | Exibir "Muitas tentativas. Aguarde e tente novamente" |
| `500` | Erro interno do servidor | Exibir mensagem genérica sem expor detalhes |

### Interceptor global recomendado

```typescript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || '';

    switch (status) {
      case 401:
        // Limpar estado e redirecionar
        queryClient.clear();
        window.location.href = '/login';
        break;
      case 429:
        toast.error('Muitas tentativas. Aguarde um momento e tente novamente.');
        break;
      case 500:
        toast.error('Erro interno do servidor. Tente novamente mais tarde.');
        break;
    }

    return Promise.reject(error);
  }
);
```

---

## 9. RBAC — Controle de Acesso por Papel

### Papéis disponíveis

| Role | Acesso |
|---|---|
| `ADMIN` | Acesso total. Pode gerenciar usuários, setores e equipamentos |
| `USER` | Pode gerenciar equipamentos e setores. Não acessa gerenciamento de usuários |
| `VIEWER` | Acesso somente leitura. Pode visualizar mas não criar/editar/excluir |

### Permissões adicionais por usuário

O domínio `User` possui flags individuais além do `role`:
- `canEditEquipment` — se `false`, mesmo `USER` não pode editar equipamentos
- `canDeleteEquipment` — se `false`, mesmo `USER` não pode deletar equipamentos

> **Nota:** Esses campos podem não estar disponíveis no `UserResponse` atual. Se precisar dessas informações, verifique com o backend ou use o `role` como controle simplificado.

### Elementos de UI por role

| Elemento | ADMIN | USER | VIEWER |
|---|---|---|---|
| Menu "Usuários" | Visível | Oculto | Oculto |
| Botão "Novo Equipamento" | Visível | Visível | Oculto |
| Botão "Editar" equipamento | Visível | Condicional (`canEdit`) | Oculto |
| Botão "Excluir" equipamento | Visível | Condicional (`canDelete`) | Oculto |
| Botão "Novo Setor" | Visível | Visível | Oculto |
| Botão "Editar/Excluir" setor | Visível | Visível | Oculto |
| Transferência/Substituição | Visível | Visível | Oculto |

### Hook recomendado

```typescript
export function usePermissions() {
  const { user } = useAuth();

  return {
    isAdmin: user?.role === 'ADMIN',
    isViewer: user?.role === 'VIEWER',
    canManageUsers: user?.role === 'ADMIN',
    canCreateEquipment: user?.role !== 'VIEWER',
    canEditEquipment: user?.role === 'ADMIN' || user?.role === 'USER',
    canDeleteEquipment: user?.role === 'ADMIN',
    canManageSectors: user?.role !== 'VIEWER',
  };
}
```

---

## 10. Bugs do Frontend Legado a Corrigir

O frontend atual (Vanilla JS em `src/main/resources/static/`) possui os seguintes bugs que **devem ser corrigidos** no React:

### Bug 1 — Método HTTP incorreto em `equipmentService.update`

```javascript
// ERRADO (legado):
async update(id, data) {
  return await apiService.post(`/equipments/${id}`, data); // POST está errado
}

// CORRETO (React):
async updateEquipment(id: string, data: CreateEquipmentDTO) {
  return api.put(`/equipments/${id}`, data); // deve ser PUT
}
```

### Bug 2 — Método HTTP incorreto em `sectorService.update`

```javascript
// ERRADO (legado):
async update(id, data) {
  return await apiService.post(`/sectors/${id}`, data); // POST está errado
}

// CORRETO (React):
async updateSector(id: string, data: CreateSectorDTO) {
  return api.put(`/sectors/${id}`, data); // deve ser PUT
}
```

### Bug 3 — JWT em `localStorage`

```javascript
// ERRADO (legado): armazena JWT em localStorage e envia via header
localStorage.setItem('auth_token', token);
headers['Authorization'] = `Bearer ${token}`;

// CORRETO (React): usar cookie httpOnly automático
// Configurar apenas withCredentials: true no cliente HTTP
// O cookie AC_TOKEN é gerenciado automaticamente pelo browser
```

### Bug 4 — `STATUS_COLORS` incompleto

```javascript
// ERRADO (legado — faltam INDISPONIVEL, PROVISORIO, BAIXADO):
const STATUS_COLORS = {
  DISPONIVEL: { bg: 'bg-green-100', text: 'text-green-800', label: 'Disponível' },
  EM_USO: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Em Uso' },
  MANUTENCAO: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Manutenção' },
  INATIVO: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inativo' }, // 'INATIVO' não existe no backend!
};

// CORRETO (React): usar o objeto EQUIPMENT_STATUS_COLORS definido na seção 6
```

---

## 11. Sugestões de Melhoria e Features Novas

### 11.1 Telas Novas a Implementar (Backend já suporta)

#### Gerenciamento de Usuários (`/usuarios`) — Inexistente no legado

A tela atual não possui nenhuma interface para gerenciar usuários. O backend já tem o CRUD completo (`/api/users`). Implementar:
- Tabela paginada de usuários com colunas: Nome, Username, Email, Role, Status (ativo/inativo)
- Modal de criação com todos os campos validados
- Modal de edição (campos opcionais)
- Toggle de ativo/inativo via `PUT /api/users/{id}` com `{ enabled: false }`
- Confirmação de exclusão
- Visível apenas para `ADMIN`

#### Página de Perfil (`/perfil`)

- Exibir dados do usuário logado (nome, email, username, role)
- Formulário de troca de senha própria via `POST /api/users/{id}/change-password`
- Validação da política de senha no frontend

#### Detalhe do Equipamento (`/equipamento/:id`)

A rota já estava preparada no legado mas nunca implementada. Implementar:
- Todos os campos do equipamento em layout legível
- Histórico (quando disponível no backend)
- Botões de ação contextuais (editar, mover, trocar, baixar)

### 11.2 Melhorias de UX

#### Feedback de Rate Limit (429)

```typescript
// Detectar 429 no interceptor
if (status === 429) {
  toast.warning('Muitas requisições. Aguarde um momento antes de tentar novamente.');
}
```

#### Indicador de Bloqueio de Conta no Login

Ao receber `401` com mensagem de conta bloqueada:
- Exibir aviso claro: "Conta bloqueada por tentativas excessivas"
- Exibir estimativa de quando o bloqueio expira (15 minutos a partir da última tentativa)
- Desabilitar o botão de login pelo período de bloqueio

#### Toast de Expiração de Sessão

```typescript
// No interceptor global de 401:
if (status === 401 && !isLoginPage()) {
  toast.info('Sua sessão expirou. Faça login novamente.');
  setTimeout(() => { window.location.href = '/login'; }, 2000);
}
```

#### Busca de Equipamentos com Autocomplete

Na tela de Movimentação, a busca de equipamentos para transferência/substituição deve usar autocomplete com debounce:

```typescript
// Ao digitar no campo de busca:
const results = await api.post('/equipments/filter', {
  textoBusca: searchTerm
});
```

#### Filtros Persistentes no Dashboard

Usar URL params para persistir filtros (ex: `?setor=TI&tipo=DESKTOP&status=EM_USO`). Isso permite compartilhar links de listas filtradas.

### 11.3 Melhorias de Performance

#### React Query / TanStack Query

Substituir fetch manual por React Query para:
- Cache automático de dados
- Revalidação em background
- Loading e error states padronizados
- Invalidação de cache após mutações

```typescript
// Exemplo:
const { data: kpis, isLoading } = useQuery({
  queryKey: ['kpis'],
  queryFn: () => api.get('/equipments/stats/kpi').then(r => r.data),
  staleTime: 30_000, // revalidar após 30 segundos
});

const moveMutation = useMutation({
  mutationFn: (data: MoveEquipmentDTO) => api.post('/equipments/move', data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['equipments'] });
    toast.success('Equipamento transferido com sucesso!');
  },
});
```

#### Optimistic Updates

Para ações de movimentação e troca, atualizar a UI imediatamente e reverter em caso de erro:

```typescript
const moveMutation = useMutation({
  mutationFn: moveEquipment,
  onMutate: async (data) => {
    // Cancelar queries em andamento
    await queryClient.cancelQueries({ queryKey: ['equipments'] });
    // Salvar snapshot
    const previous = queryClient.getQueryData(['equipments']);
    // Atualizar otimisticamente
    queryClient.setQueryData(['equipments'], (old) => updateLocal(old, data));
    return { previous };
  },
  onError: (err, data, context) => {
    // Reverter em caso de erro
    queryClient.setQueryData(['equipments'], context.previous);
    toast.error('Erro ao transferir equipamento');
  },
});
```

### 11.4 Melhorias de Segurança

#### Validação com Zod

Usar Zod para validação de formulários, alinhada com as constraints do backend:

```typescript
import { z } from 'zod';

export const createEquipmentSchema = z.object({
  assetNumber: z.string().regex(/^[A-Za-z0-9-]+$/).max(50),
  brand: z.string().min(2).max(100),
  type: z.enum(['DESKTOP', 'MONITOR', 'TECLADO', 'MOUSE', 'LAPTOP', 'IMPRESSORA', 'ROTEADOR', 'SWITCH', 'SERVIDOR']),
  status: z.enum(['DISPONIVEL', 'INDISPONIVEL', 'PROVISORIO', 'EM_USO', 'MANUTENCAO', 'BAIXADO']),
  sectorId: z.string().uuid(),
  serialNumber: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  hostname: z.string().regex(/^[a-zA-Z0-9.-]*$/).max(100).optional(),
  ipAddress: z.string().ip({ version: 'v4' }).optional().or(z.literal('')),
  equipmentUser: z.string().max(200).optional(),
});
```

#### Não Expor Informações Sensíveis

- Nunca exibir stack traces ou detalhes internos ao usuário
- Usar mensagens genéricas para erros `500`
- O backend já está configurado para não expor `message` ou `binding-errors` em erros de validação HTTP

### 11.5 Acessibilidade (a11y)

- Gerenciar foco ao abrir/fechar modais (`focus-trap`)
- Adicionar `aria-label` em botões de ícone
- Usar `role="dialog"` e `aria-modal="true"` em modais
- Tabelas com `<caption>` e `scope` nas células de cabeçalho
- Controles de formulário sempre com `<label>` associado via `htmlFor`
- Suporte a navegação por teclado (Escape fecha modais, Tab circula em campos)

### 11.6 Features Futuras (Backend a Implementar)

Estas telas podem ser preparadas no frontend como rotas em desenvolvimento, exibindo "Em breve":

| Feature | Rota sugerida | Descrição |
|---|---|---|
| Histórico de movimentações | `/historico` | Log de todas as transferências e substituições com data, usuário que realizou e equipamentos envolvidos |
| Relatórios exportáveis | `/relatorios` | Exportar lista de equipamentos por setor/tipo/status em CSV/PDF |
| Licenças de software | `/licencas` | Gestão de `SoftwareLicense` vinculadas a equipamentos (domínio já existe no backend) |
| Notificações | — | Alertas para equipamentos em manutenção há muito tempo, expiração de licenças, etc. |

---

## 12. Arquitetura de Frontend Recomendada

### Estrutura de pastas sugerida

```
src/
├── api/                    # Clientes e tipos da API
│   ├── client.ts           # Axios com withCredentials e interceptors
│   ├── auth.api.ts
│   ├── equipment.api.ts
│   ├── sector.api.ts
│   └── user.api.ts
├── types/                  # Interfaces TypeScript (da seção 6)
│   ├── auth.types.ts
│   ├── equipment.types.ts
│   ├── sector.types.ts
│   └── common.types.ts
├── hooks/                  # React Query hooks
│   ├── useAuth.ts
│   ├── useEquipments.ts
│   ├── useSectors.ts
│   └── useUsers.ts
├── components/             # Componentes reutilizáveis
│   ├── ui/                 # Primitivos (Button, Input, Modal, Toast, Badge...)
│   ├── layout/             # Sidebar, Header, Breadcrumb
│   └── equipment/          # Componentes específicos de equipamento
├── pages/                  # Telas (uma por rota)
│   ├── SetupPage.tsx
│   ├── LoginPage.tsx
│   ├── ForgotPasswordPage.tsx
│   ├── ResetPasswordPage.tsx
│   ├── DashboardPage.tsx
│   ├── MovimentacaoPage.tsx
│   ├── SetoresPage.tsx
│   ├── UsuariosPage.tsx
│   ├── PerfilPage.tsx
│   └── EquipamentoDetailPage.tsx
├── guards/                 # Proteção de rotas
│   ├── AuthGuard.tsx
│   └── RoleGuard.tsx
├── constants/              # Labels, cores, enums (da seção 6)
└── utils/                  # Formatadores, validadores
    ├── password.ts
    ├── format.ts
    └── date.ts
```

### Dependências recomendadas

```json
{
  "dependencies": {
    "react": "^18",
    "react-dom": "^18",
    "react-router-dom": "^6",
    "axios": "^1",
    "@tanstack/react-query": "^5",
    "zod": "^3",
    "react-hook-form": "^7",
    "@hookform/resolvers": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "vite": "^5",
    "@vitejs/plugin-react": "^4",
    "tailwindcss": "^3"
  }
}
```

---

*Documento gerado em 22/02/2026. Baseado no estado atual do backend SGP NUINF com Spring Boot 3, PostgreSQL, JWT via cookie httpOnly, Flyway e Docker.*
