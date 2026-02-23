# Instruções de Backend — SGP NUINF Frontend

Este documento descreve as mudanças necessárias no backend Spring Boot para que as funcionalidades implementadas no frontend funcionem corretamente.

---

## 1. Endpoint Público de Status do Setup

**Finalidade:** Permite que o frontend verifique, sem autenticação, se o banco de dados possui usuários cadastrados (primeiro acesso vs. login normal).

### Implementação

```java
// SetupController.java (ou onde estiver o POST /setup)

@GetMapping("/setup")
public ResponseEntity<Map<String, Boolean>> checkSetupStatus() {
    boolean needsSetup = userRepository.count() == 0;
    return ResponseEntity.ok(Map.of("needsSetup", needsSetup));
}
```

### Configuração de Segurança

No `SecurityConfig.java`, liberar o `GET /setup` sem autenticação:

```java
.requestMatchers(HttpMethod.GET, "/setup").permitAll()
.requestMatchers(HttpMethod.POST, "/setup").permitAll()
```

### Resposta esperada

```json
{ "needsSetup": true }   // banco vazio → frontend redireciona para /setup
{ "needsSetup": false }  // banco com usuários → frontend vai para /login
```

---

## 2. Modo de Manutenção (503 Service Unavailable)

**Finalidade:** Quando o sistema precisar de manutenção, o backend retorna `503` para todas as requisições. O frontend detecta esse status e redireciona automaticamente para a tela de manutenção (`/maintenance`).

O frontend também faz polling de `GET /setup` a cada 30 segundos para verificar quando o sistema volta. Quando receber qualquer status diferente de `503`, redireciona para `/login`.

### Implementação — Filtro de Manutenção

Criar um filtro Spring que intercede todas as requisições quando o modo de manutenção estiver ativo:

```java
// MaintenanceFilter.java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MaintenanceFilter extends OncePerRequestFilter {

    @Value("${app.maintenance.enabled:false}")
    private boolean maintenanceEnabled;

    @Value("${app.maintenance.message:Sistema em manutenção. Tente novamente em breve.}")
    private String maintenanceMessage;

    @Override
    protected void doFilterInternal(
        HttpServletRequest request,
        HttpServletResponse response,
        FilterChain filterChain
    ) throws ServletException, IOException {

        if (!maintenanceEnabled) {
            filterChain.doFilter(request, response);
            return;
        }

        // Permite o GET /setup para que o frontend possa fazer polling
        // e detectar quando o sistema voltou
        String path = request.getRequestURI();
        if (path.equals("/setup") && "GET".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        // Retorna 503 para todas as demais requisições
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("Retry-After", "1800"); // 30 minutos (em segundos)
        // IMPORTANTE: incluir CORS na resposta 503 para o frontend conseguir ler o status e redirecionar para /maintenance
        String origin = request.getHeader("Origin");
        if (origin != null && !origin.isEmpty()) {
            response.setHeader("Access-Control-Allow-Origin", origin);
            response.setHeader("Access-Control-Allow-Credentials", "true");
        }
        response.getWriter().write(
            "{\"status\":503,\"message\":\"" + maintenanceMessage + "\"}"
        );
    }
}
```

**Por que CORS na resposta 503:** Se a resposta 503 não tiver os headers CORS, o navegador bloqueia o corpo da resposta e o frontend recebe um erro de rede sem `response.status`. O front então trata como "não autenticado" e redireciona para `/login` em vez de `/maintenance`. Incluir `Access-Control-Allow-Origin` (e `Allow-Credentials` se usar cookies) na resposta do filtro evita isso.

### Propriedades de Configuração

No `application.properties` ou `application.yml`:

```properties
# application.properties
app.maintenance.enabled=false
app.maintenance.message=Sistema em manutenção programada. Previsão de retorno: em breve.
```

```yaml
# application.yml
app:
  maintenance:
    enabled: false
    message: "Sistema em manutenção programada."
```

### Como Ativar a Manutenção

**Opção 1 — Via variável de ambiente (recomendado para produção):**
```bash
APP_MAINTENANCE_ENABLED=true java -jar sgp-nuinf.jar
```

**Opção 2 — Editando o `application.properties` e reiniciando:**
```properties
app.maintenance.enabled=true
```

**Opção 3 — Via endpoint Spring Actuator (sem reiniciar, avançado):**

Adicionar `spring-boot-actuator` e criar um endpoint de administração:

```java
// MaintenanceController.java
@RestController
@RequestMapping("/admin/maintenance")
@PreAuthorize("hasRole('ADMIN')")
public class MaintenanceController {

    @Autowired
    private MaintenanceFilter maintenanceFilter;

    @PostMapping("/enable")
    public ResponseEntity<String> enableMaintenance() {
        maintenanceFilter.setMaintenanceEnabled(true);
        return ResponseEntity.ok("Modo manutenção ativado.");
    }

    @PostMapping("/disable")
    public ResponseEntity<String> disableMaintenance() {
        maintenanceFilter.setMaintenanceEnabled(false);
        return ResponseEntity.ok("Modo manutenção desativado.");
    }

    @GetMapping("/status")
    public ResponseEntity<Map<String, Boolean>> status() {
        return ResponseEntity.ok(Map.of("active", maintenanceFilter.isMaintenanceEnabled()));
    }
}
```

> ⚠ Para a Opção 3 funcionar, transformar `maintenanceEnabled` em campo anotado com `@Setter` e `@Getter` (Lombok) ou adicionar os métodos manualmente, removendo o `@Value` fixo.

---

## 3. Campo `defectDescription` no Swap de Equipamentos

**Finalidade:** Quando o usuário marca "Possui defeito?" ao substituir um equipamento, pode digitar a descrição do defeito. O backend deve **anexar** esse texto à descrição existente do equipamento — sem substituir.

### DTO Atualizado

```java
// SwapEquipmentDTO.java (ou record)
public record SwapEquipmentDTO(
    String outgoingEquipmentId,
    String incomingEquipmentId,
    boolean isDefective,
    String defectDescription  // ← novo campo (pode ser null)
) {}
```

### Lógica no Use Case / Service

```java
// SwapEquipmentUseCase.java (ou Service equivalente)

public void execute(SwapEquipmentDTO dto) {
    Equipment outgoing = equipmentRepository.findById(dto.outgoingEquipmentId())
        .orElseThrow(() -> new NotFoundException("Equipamento não encontrado"));

    Equipment incoming = equipmentRepository.findById(dto.incomingEquipmentId())
        .orElseThrow(() -> new NotFoundException("Equipamento não encontrado"));

    // ... lógica existente de troca de setores ...

    // Aplica descrição de defeito se informada
    if (dto.isDefective()
        && dto.defectDescription() != null
        && !dto.defectDescription().isBlank()) {

        String descAtual = outgoing.getDescription() != null
            ? outgoing.getDescription().trim()
            : "";

        String novaDesc = descAtual.isEmpty()
            ? "[DEFEITO] " + dto.defectDescription().trim()
            : descAtual + " | [DEFEITO] " + dto.defectDescription().trim();

        outgoing.setDescription(novaDesc);
    }

    // ... salvar equipamentos ...
}
```

---

## 4. Resumo das Mudanças Necessárias

| # | O que fazer | Arquivo(s) envolvido(s) | Prioridade |
|---|---|---|---|
| 1 | Adicionar `GET /setup` público retornando `{ needsSetup: boolean }` | `SetupController.java`, `SecurityConfig.java` | **Alta** (login do sistema depende disso) |
| 2 | Criar `MaintenanceFilter` que retorna 503 quando `app.maintenance.enabled=true` | `MaintenanceFilter.java`, `application.properties` | Média |
| 3 | Adicionar `defectDescription` ao `SwapEquipmentDTO` e lógica de append na descrição | `SwapEquipmentDTO.java`, `SwapEquipmentUseCase.java` | Baixa |

---

## 5. Fluxo Completo de Manutenção (Opções A + B)

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ANTES DA MANUTENÇÃO                             │
│                                                                     │
│  1. Admin edita o .env do FRONTEND:                                 │
│     VITE_MAINTENANCE_BANNER=Manutenção: Sab 15/03 das 22h às 02h   │
│     VITE_MAINTENANCE_DATE=2025-03-15T22:00:00                       │
│                                                                     │
│  2. Rebuild e redeploy do frontend                                  │
│                                                                     │
│  3. Um banner amarelo aparece no topo para todos os usuários        │
│     com o aviso e a contagem regressiva                             │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Na hora da manutenção
┌─────────────────────────────────────────────────────────────────────┐
│                    DURANTE A MANUTENÇÃO                             │
│                                                                     │
│  1. Admin ativa no backend:                                         │
│     app.maintenance.enabled=true (restart ou endpoint POST)        │
│                                                                     │
│  2. Backend passa a retornar 503 para tudo (exceto GET /setup)      │
│                                                                     │
│  3. Frontend detecta o 503 no interceptor Axios e redireciona       │
│     automaticamente todos os usuários para /maintenance             │
│                                                                     │
│  4. Tela de manutenção faz polling no GET /setup a cada 30s        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ Após a manutenção
┌─────────────────────────────────────────────────────────────────────┐
│                    RETORNO DO SISTEMA                               │
│                                                                     │
│  1. Admin desativa: app.maintenance.enabled=false                   │
│                                                                     │
│  2. GET /setup volta a retornar 200                                 │
│                                                                     │
│  3. Frontend detecta no polling e redireciona para /login           │
│                                                                     │
│  4. Admin limpa VITE_MAINTENANCE_BANNER e faz rebuild do frontend   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Log de Auditoria — Aba "Auditoria" para ADMINs

O frontend espera um endpoint paginado que retorne as últimas ações do sistema.

### 4.1 Endpoint esperado

```
GET /api/audit?page=0&size=20&sort=createdAt,desc
```

**Permissão:** somente `ADMIN`.

**Resposta (200 OK):**
```json
{
  "content": [
    {
      "id": "uuid",
      "actorUsername": "joao.silva",
      "actionType": "EQUIPMENT_SWAP",
      "entityType": "Equipment",
      "entityId": "uuid-equipamento",
      "description": "Substituição de Notebook Dell por HP — Setor TI",
      "ipAddress": "192.168.1.10",
      "createdAt": "2026-02-22T14:35:00"
    }
  ],
  "totalElements": 150,
  "totalPages": 8,
  "number": 0,
  "size": 20
}
```

### 4.2 Entidade `AuditLog`

```java
@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id @GeneratedValue private UUID id;

    private String actorUsername;   // quem realizou a ação

    @Enumerated(EnumType.STRING)
    private AuditActionType actionType; // enum: EQUIPMENT_CREATE, EQUIPMENT_UPDATE,
                                        // EQUIPMENT_DELETE, EQUIPMENT_SWAP,
                                        // EQUIPMENT_TRANSFER, USER_CREATE,
                                        // USER_UPDATE, USER_DELETE, LOGIN, LOGOUT

    private String entityType;   // "Equipment", "User", "Sector"
    private String entityId;     // UUID da entidade afetada
    private String description;  // mensagem human-readable
    private String ipAddress;    // opcional

    @CreationTimestamp
    private LocalDateTime createdAt;
}
```

### 4.3 Como registrar

Recomenda-se usar um `@Aspect` Spring AOP para interceptar automaticamente os use cases,
ou chamar o `AuditService.log(...)` explicitamente nos use cases já existentes:

```java
@Service
public class AuditService {
    public void log(String actor, AuditActionType action,
                    String entityType, String entityId, String description) {
        AuditLog entry = new AuditLog();
        entry.setActorUsername(actor);
        entry.setActionType(action);
        entry.setEntityType(entityType);
        entry.setEntityId(entityId);
        entry.setDescription(description);
        auditLogRepository.save(entry);
    }
}
```

### 4.4 Configuração de segurança

```java
.requestMatchers(HttpMethod.GET, "/api/audit/**").hasRole("ADMIN")
```

---

## 5. Último Acesso (Last Login) — Perfil do Usuário

O frontend exibe no card de perfil quando foi o último login do usuário, auxiliando na detecção de acessos não autorizados.

### 5.1 Campo necessário em `UserResponse`

Adicionar o campo `lastLoginAt` ao DTO de resposta do usuário:

```json
{
  "id": "uuid",
  "username": "joao.silva",
  "fullName": "João Silva",
  "email": "joao@sgp.mil",
  "role": "USER",
  "active": true,
  "lastLoginAt": "2026-02-22T14:30:00"
}
```

### 5.2 Entidade `User`

```java
// Adicionar ao entity User:
private LocalDateTime lastLoginAt;
```

### 5.3 Atualização no login

No `AuthService.authenticate(...)`, após validar as credenciais e gerar o JWT:

```java
user.setLastLoginAt(LocalDateTime.now());
userRepository.save(user);
```

### 5.4 Incluir no mapper

```java
// UserMapper.toResponse(User user):
response.setLastLoginAt(user.getLastLoginAt());
```

### 5.5 Configuração de segurança

O campo `lastLoginAt` é retornado pelo endpoint existente `GET /api/auth/me`,
que já é público para usuários autenticados — nenhuma mudança adicional de segurança é necessária.

---

## 6. Rate Limiting — Header `Retry-After`

O frontend lê o header `Retry-After` (em segundos) da resposta `429 Too Many Requests`
para exibir um countdown visual preciso. Sem esse header, o frontend usa 30 segundos como padrão.

### 6.1 Configuração no Spring Boot

Se estiver usando o Spring Security Rate Limiter ou Bucket4j, certifique-se de incluir o header:

```java
response.setHeader("Retry-After", "30"); // segundos até liberar nova tentativa
response.setStatus(429);
```

Ou, com `Bucket4j` + Spring Boot Starter:

```yaml
bucket4j:
  filters:
    - cache-name: login-rate-limit
      url: /api/auth/login
      rate-limits:
        - bandwidths:
            - capacity: 5
              time: 1
              unit: minutes
      http-response-headers:
        Retry-After: "30"
```

---

## 7. Role DEV e Painel do Desenvolvedor

O frontend introduziu uma nova role `DEV` com acesso exclusivo ao **Painel do Desenvolvedor** (`/dev`).
Usuários DEV herdam todas as permissões de ADMIN e adicionalmente podem controlar o sistema.

### 7.1 Adicionar DEV ao enum `UserRole`

```java
public enum UserRole {
    ADMIN,
    USER,
    VIEWER,
    DEV   // ← novo
}
```

> **Atenção:** após adicionar, rode a migration do banco para atualizar o `CHECK CONSTRAINT` na coluna `role` (se houver), ou use `@Enumerated(EnumType.STRING)` sem constraint explícita.

### 7.2 Configuração de Segurança — `SecurityConfig`

Adicione as permissões dos novos endpoints `/dev/**`:

```java
.requestMatchers("/api/dev/**").hasAnyRole("DEV")

// DEV deve acessar tudo que ADMIN acessa:
.requestMatchers("/api/audit/**").hasAnyRole("ADMIN", "DEV")
.requestMatchers("/api/users/**").hasAnyRole("ADMIN", "DEV")
.requestMatchers("/admin/maintenance/**").hasAnyRole("ADMIN", "DEV")
```

### 7.3 Criar `DevController` — endpoints do painel

O frontend chama os seguintes endpoints (prefixo: `/api/dev`):

#### `GET /api/dev/maintenance/status`
Retorna o status atual do modo manutenção.

```java
@RestController
@RequestMapping("/api/dev")
@RequiredArgsConstructor
@PreAuthorize("hasRole('DEV')")
public class DevController {

    private final MaintenanceFilter maintenanceFilter;

    @GetMapping("/maintenance/status")
    public ResponseEntity<Map<String, Boolean>> getMaintenanceStatus() {
        return ResponseEntity.ok(Map.of("active", maintenanceFilter.isMaintenanceEnabled()));
    }

    @PostMapping("/maintenance/enable")
    public ResponseEntity<Map<String, String>> enableMaintenance() {
        maintenanceFilter.setMaintenanceEnabled(true);
        return ResponseEntity.ok(Map.of("message", "Modo manutenção ativado."));
    }

    @PostMapping("/maintenance/disable")
    public ResponseEntity<Map<String, String>> disableMaintenance() {
        maintenanceFilter.setMaintenanceEnabled(false);
        return ResponseEntity.ok(Map.of("message", "Modo manutenção desativado."));
    }

    @GetMapping("/system/info")
    public ResponseEntity<Map<String, Object>> getSystemInfo() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("javaVersion",   System.getProperty("java.version"));
        info.put("springVersion",  SpringVersion.getVersion());
        info.put("maintenanceActive", maintenanceFilter.isMaintenanceEnabled());
        // adicione outros campos conforme necessário
        return ResponseEntity.ok(info);
    }
}
```

#### Respostas esperadas

| Endpoint | Método | Resposta |
|---|---|---|
| `/api/dev/maintenance/status` | GET | `{ "active": false }` |
| `/api/dev/maintenance/enable` | POST | `{ "message": "Modo manutenção ativado." }` |
| `/api/dev/maintenance/disable` | POST | `{ "message": "Modo manutenção desativado." }` |
| `/api/dev/system/info` | GET | `{ "javaVersion": "21", ... }` |

### 7.4 Atualizar `MaintenanceFilter` — liberar `/api/dev/**`

O `MaintenanceFilter` existente precisa liberar os endpoints DEV durante manutenção (assim como já faz com `/admin/maintenance/**`):

```java
String path = request.getRequestURI();
if ((path.equals("/setup") && "GET".equalsIgnoreCase(request.getMethod()))
        || path.startsWith("/admin/maintenance")
        || path.startsWith("/api/dev"))  // ← adicionar esta linha
{
    filterChain.doFilter(request, response);
    return;
}
```

### 7.5 Atualizar `UserResponse` — incluir `DEV` no enum do record

Se `UserRole` for validado pelo Jackson com uma lista fechada de valores, atualize-o para incluir `DEV`.

### 7.6 Gerenciar usuário DEV

Para criar o primeiro usuário DEV, insira diretamente no banco (ou via setup):

```sql
-- Exemplo: promover usuário existente a DEV
UPDATE users SET role = 'DEV' WHERE username = 'isaac';
```

Ou, se o `SetupRequest` permitir `role`, use a tela de setup/criação de usuário.
O painel de Usuários do frontend (role ADMIN e DEV) já exibe e permite atribuir a role `DEV` ao criar/editar usuários.

### 7.7 Fluxo de permissões resumido

```
DEV
 ├── Acessa /dev (painel exclusivo)
 ├── Controla manutenção (enable/disable)
 ├── Visualiza auditoria
 ├── Gerencia usuários
 └── Faz tudo que ADMIN faz

ADMIN
 ├── Visualiza auditoria
 ├── Gerencia usuários
 └── Acessa /admin/maintenance/** (via curl/Postman)

USER
 ├── Cria e edita equipamentos
 └── Movimentação

VIEWER
 └── Somente leitura
```
