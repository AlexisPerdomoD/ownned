# build_indications.md - Frontend Ownned

## 1. Stack Tecnológico

| Área       | Tecnología      | Versión |
| ---------- | --------------- | ------- |
| Framework  | SolidJS         | 1.9.12  |
| Router     | @solidjs/router | 0.16.1  |
| Estilos    | TailwindCSS     | 4.2.2   |
| Build      | Vite            | 8.0.2   |
| Validación | Zod             | 4.3.6   |

---

## 2. Estructura de Archivos

### 2.1 Vista General del Proyecto

```
web/app/src/
├── entities/                    # Definiciones de tipos y APIs de la API
│   ├── nodes/
│   │   ├── api/
│   │   │   ├── createNode.js    # API: createFolder, updateNode, deleteNode
│   │   │   ├── getNode.js     # API: apiGetNode
│   │   │   └── getRoot.js     # API: apiGetRoot
│   │   └── index.js          # Tipos: Node, Folder, File, Doc, NodeComment
│   ├── usrs/
│   │   ├── api/
│   │   │   ├── loginUsr.js    # DTO: LoginPwdDTO, API: apiLogin
│   │   │   ├── paginateUsr.js # DTOs: CreateUsrDTO, APIs: paginate, create, delete
│   │   │   └── getMe.js     # API: apiGetMe
│   │   └── index.js          # Tipos: Usr, UsrRole
│   ├── groups/
│   │   ├── api/
│   │   │   └── index.js     # DTOs + APIs completas para Groups CRUD
│   │   └── index.js          # Tipos: Group, GroupUsr, GroupNode, PopulatedGroup
│   └── comments/
│       └── api/
│           └── index.js      # DTOs + APIs para comentarios
│
├── features/                   # Lógica de negocio por módulo
│   ├── auth/
│   │   ├── providers/
│   │   │   └── AuthProvider.jsx    # Context: usr, loginPwd, logout
│   │   ├── ui/
│   │   │   ├── LoginForm.jsx
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── RegisterForm.jsx
│   │   └── usecase/
│   │       ├── usePwdLogin.js
│   │       └── useRegister.js
│   ├── node/
│   │   ├── ui/
│   │   │   ├── DocCard.jsx
│   │   │   ├── NodeCard.jsx
│   │   │   └── NodeList.jsx
│   │   └── usecase/
│   │       ├── useGetNode.js        # Hook: obtener nodo por ID
│   │       ├── useGetRoot.js       # Hook: obtener nodos raíz
│   │       ├── useCreateFolder.js # Hook: crear carpeta
│   │       ├── useUpdateNode.js # Hook: actualizar nodo
│   │       ├── useDeleteNode.js # Hook: eliminar nodo
│   │       └── index.js
│   ├── group/
│   │   ├── ui/
│   │   │   ├── GroupsTable.jsx  # Tabla de grupos
│   │   │   ├── GroupForm.jsx    # Formulario crear/editar grupo
│   │   │   ├── GroupUsersList.jsx
│   │   │   └── GroupNodesList.jsx
│   │   └── usecase/
│   │       ├── useGetGroup.js
│   │       ├── usePaginateGroups.js
│   │       ├── useCreateGroup.js
│   │       ├── useUpdateGroup.js
│   │       ├── useDeleteGroup.js
│   │       ├── useUpsertGroupUsr.js
│   │       ├── useDeleteGroupUsr.js
│   │       ├── useUpsertGroupNode.js
│   │       ├── useDeleteGroupNode.js
│   │       └── index.js
│   ├── usr/
│   │   └── usecase/
│   │       ├── usePaginateUsrs.js
│   │       ├── useCreateUsr.js
│   │       ├── useDeleteUsr.js
│   │       └── index.js
│   └── comment/
│       ├── ui/
│       │   └── CommentsList.jsx
│       └── usecase/
│           ├── useGetComments.js
│           ├── useCreateComment.js
│           ├── useDeleteComment.js
│           └── index.js
│
├── pages/                     # Vistas (Routes)
│   ├── LoginView/
│   │   └── index.jsx        # Login de usuarios
│   ├── HomeView/
│   │   └── index.jsx        # Root nodes (archivos personales)
│   ├── NodeView/
│   │   └── index.jsx        # Detalle de nodo + children + comentarios
│   ├── GroupsView/
│   │   └── index.jsx        # Lista de grupos con paginación
│   ├── GroupView/
│   │   └── index.jsx        # Detalle de grupo + usuarios + nodos
│   ├── UsrsView/
│   │   └── index.jsx        # Lista de usuarios (admin)
│   └── NotFoundView/
│       └── index.jsx        # 404 página no encontrada
│
├── shared/
│   ├── api/
│   │   └── client.js         # reqJSON wrapper con manejo de errores
│   ├── config/
│   │   └── env.js
│   ├── errors.js            # Clases de errores de API
│   └── ui/                # Design System
│       ├── Atoms.jsx          # Divider, Avatar, Spinner, EmptyState
│       ├── Badge.jsx
│       ├── Button.jsx
│       ├── Card.jsx          # Card, Card.Header, Card.Body, Card.Footer
│       ├── Form.jsx           # Select, Textarea, Checkbox
│       ├── Input.jsx
│       ├── Layout.jsx         # AppShell, NavItem, PageHeader
│       ├── Modal.jsx
│       ├── Navbar.jsx         # Barra de navegación
│       ├── Navigation.jsx    # Tabs, Breadcrumb
│       ├── Table.jsx         # Table, Pagination
│       ├── Toast.jsx
│       ├── ErrView.jsx       # Vista de errores
│       └── index.jsx         # Exports centralizados
│
├── index.css                 # TailwindCSS theme + tokens
└── index.jsx                # Router setup + ProtectedLayout
```

---

## 3. Rutas del Frontend

| Ruta          | Vista               | autenticada | Descripción               |
| ------------- | ------------------- | ----------- | ------------------------- |
| `/login`      | LoginView           | ❌          | Login de usuarios         |
| `/`           | Redirect → `/nodes` | -           | Redirect                  |
| `/nodes`      | HomeView            | ✅          | Root nodes del usuario    |
| `/nodes/:id`  | NodeView            | ✅          | Detalle de nodo/carpeta   |
| `/groups`     | GroupsView          | ✅          | Lista de grupos           |
| `/groups/:id` | GroupView           | ✅          | Detalle de grupo          |
| `/usrs`       | UsrsView            | ✅          | Lista de usuarios (admin) |
| `*`           | NotFoundView        | ✅          | 404                       |

---

## 4. Descripción Visual de Vistas

### 4.1 LoginView

**Ubicación**: `pages/LoginView/index.jsx`

**Diseño**:

- Centro de pantalla vertical y horizontal
- Formulario de login con campos email y password
- Estilo minimalista con `--font-serif` para标题
- Fondo con `--color-bg`

**Componentes**:

- `LoginForm` (features/auth/ui/LoginForm.jsx)
- `Input` y `Button` del design system

---

### 4.2 HomeView (Nodes Root)

**Ubicación**: `pages/HomeView/index.jsx`

**Diseño**:

- Título: "Wellcome to your personal cloud storage."
- Lista de carpetas raíz del usuario
- Cards para cada nodo

**Componentes**:

- `NodeList` (features/node/ui/NodeList.jsx)
- Navegación via click en cards

---

### 4.3 NodeView

**Ubicación**: `pages/NodeView/index.jsx`

**Diseño**:

- `PageHeader` con título del nodo y botón Back → `/nodes`
- Tabs: Contents | Comments (para carpetas)
- Sección de crear nueva subcarpeta (si es folder)
- Botones Edit/Delete en header
- Formulario modal para crear/editar

**Componentes**:

- `NodeOverview`: info del nodo (nombre, tipo, descripción, fechas)
- `NodeList` para children
- `DocCard` para archivos
- `CommentsList` + `CommentForm` para comentarios
- Tabs para Contents/Comments
- `NodeForm` modal (crear/editar)

---

### 4.4 GroupsView

**Ubicación**: `pages/GroupsView/index.jsx`

**Diseño**:

- `PageHeader`: "Groups" + botón "+ New Group"
- Input de búsqueda + botón Search
- Tabla de grupos con columnas: Name, Description, Created, Actions
- Paginación inferior
- Modal para crear/editar grupo

**Componentes**:

- `GroupsTable` (features/group/ui/GroupsTable.jsx)
- `GroupForm` modal
- `Pagination`, `Button`, `Input`

---

### 4.5 GroupView

**Ubicación**: `pages/GroupView/index.jsx`

**Diseño**:

- `PageHeader` con título del grupo + botón Delete + Back → `/groups`
- Tabs: Users | Nodes
- Sección agregar usuario (select + access level)
- Lista de usuarios asignados
- Sección agregar nodo (input UUID)
- Lista de nodos compartidos

**Componentes**:

- `GroupUsersList` + `AddUserForm`
- `GroupNodesList`
- `Tabs`, `Badge`, `Button`

---

### 4.6 UsrsView (Admin)

**Ubicación**: `pages/UsrsView/index.jsx`

**Diseño**:

- `PageHeader`: "Users" + botón "+ New User"
- Input de búsqueda
- Tabla con columnas: Email, First Name, Last Name, Role (badge), Created, Actions
- Paginación
- Modal crear usuario con campos:
    - Email (required)
    - First Name (required)
    - Last Name (required)
    - Role (select: Normal User, Limited User)
    - Password (min 8 chars)

**Campos DTO (backend)**:

```javascript
{
    role: 'normal_usr_role' | 'limited_usr_role',
    firstname: string,
    lastname: string,
    username: string,
    password: string,
    access: [] // opcional
}
```

**Componentes**:

- `UsrsTable` (table inline)
- `CreateUsrForm` (modal)
- `Badge`, `Pagination`

---

### 4.7 NotFoundView

**Ubicación**: `pages/NotFoundView/index.jsx`

**Diseño**:

- Centro de pantalla
- Título "404" grande
- Mensaje: "Page Not Found"
- Botones: "Go to Files", "Go to Groups"

---

## 5. Design System - Componentes del UI

### 5.1 Tokens de Theme (index.css)

```css
/* Colores */
--color-bg: #f5f0e8 --color-bg-2: #ede6d8 --color-surface: #fdfbf7
    --color-border: #d6cfc2 --color-ink: #4a453e --color-ink-dark: #2a2520
    --color-accent: #c4714a --color-danger: #b05e39 --color-success: #4a9b5f
    /* Tipografía */ --font-sans: 'DM Sans' --font-serif: 'Lora'
    --font-mono: 'DM Mono' /* Tamaños */ --text-xs: 0.6875rem
    --text-sm: 0.8125rem --text-base: 0.9375rem --text-lg: 1.125rem
    --text-2xl: 1.75rem --text-3xl: 2.25rem;
```

### 5.2 Componentes Atómicos

| Componente | Archivo              | Descripción                         |
| ---------- | -------------------- | ----------------------------------- |
| Button     | shared/ui/Button.jsx | ghost, primary, accent, danger      |
| Input      | shared/ui/Input.jsx  | Con label, hint, error              |
| Card       | shared/ui/Card.jsx   | Card.Header, Card.Body, Card.Footer |
| Badge      | shared/ui/Badge.jsx  | neutral, accent, success, danger    |
| Spinner    | shared/ui/Atoms.jsx  | sm, md, lg                          |
| EmptyState | shared/ui/Atoms.jsx  | title, description, action          |

### 5.3 Componentes Compuestos

| Componente | Archivo                  | Descripción                      |
| ---------- | ------------------------ | -------------------------------- |
| Table      | shared/ui/Table.jsx      | columns, rows, emptyTitle        |
| Pagination | shared/ui/Table.jsx      | page, total, onChange            |
| PageHeader | shared/ui/Layout.jsx     | title, subtitle, actions, backTo |
| Navbar     | shared/ui/Navbar.jsx     | Links + logout                   |
| Tabs       | shared/ui/Navigation.jsx | items, active, onChange          |

---

## 6. Convenciones de Código

### 6.1 Naming

- **Componentes**: PascalCase (`LoginForm`, `NodeCard`)
- **Hooks**: camelCase con prefijo `use` (`useGetNode`, `usePwdLogin`)
- **Archivos**: kebab-case (`login-form.jsx`, `use-pwd-login.js`)

### 6.2 Estructura de Feature

```
features/[feature]/
├── providers/         # Context providers (si aplica)
│   └── FooProvider.jsx
├── ui/              # Componentes específicos del feature
│   ├── FooForm.jsx
│   ├── FooList.jsx
│   ├── FooCard.jsx
│   └── index.js      # Exports
└── usecase/         # Custom hooks
    ├── useFoo.js
    ├── useBar.js
    └── index.js     # Exports
```

### 6.3 Estructura de Vista

```jsx
export function FooView() {
    // 1. Hooks para data fetching
    const { data, loading } = useFoo()

    // 2. Handlers
    const handleAction = () => {...}

    // 3. Render
    return (
        <section class="flex flex-col p-6">
            <PageHeader
                title="Título"
                subTitle="subtítulo"
                backTo="/ruta"
                actions={<Button>acción</Button>}
            />

            {/* Contenido */}
        </section>
    )
}
```

### 6.4 Patrón de Loading

```jsx
<Show when={!loading()} fallback={<Spinner size="lg" />}>
    {/* Contenido cuando loaded */}
</Show>
```

### 6.5 Manejo de Errores

- Usar `ErrView` para errores no manejados
- Mostrar `error` prop en formularios
- Usar `toast` para feedback de acciones exitosas

### 6.6 ⚠️ Convenciones SolidJS (CRÍTICO)

**NUNCA desestructurar props en SolidJS**

En SolidJS, desestructurar `props` rompe la reactividad porque crea una copia que pierde la referencia al store original.

** ❌ INCORRECTO**:

```jsx
function CreateUsrForm({ open, loading, onSubmit }) {
    // open deja de ser reactivo!
    if (!open) return null
}
```

** ✅ CORRECTO**:

```jsx
function CreateUsrForm(props) {
    // Acceder como props.open
    if (!props.open) return null
}
```

**Excepciones válidas**:

1. Props con valores primitivos que **no** necesitan reactivity (no se actualizan dinámicamente):

```jsx
function Button({ variant = 'ghost', size = 'md', class: cls = '', ...props }) {
    // variant, size, cls son estáticos, se pueden desestructurar
}
```

2. Cuando se usa el valor solo una vez para inicializar una señal:

```jsx
function MyComponent(props) {
    const [value, setValue] = createSignal(props.initialValue) // OK
}
```

**Regla general**: Si el prop puede cambiar (como `open`, `loading`, `data`), acceder como `props.propName`.

---

## 7. API REST - Endpoints

### 7.1 Autenticación

| Método | Ruta                    | Body                   | Descripción    |
| ------ | ----------------------- | ---------------------- | -------------- |
| POST   | `/api/v1/usrs/login`    | `{username, password}` | Login          |
| POST   | `/api/v1/usrs/register` | `{username, password}` | Registro       |
| GET    | `/api/v1/usrs/me`       |                        | Usuario actual |

### 7.2 Nodos

| Método | Ruta                | Body                    | Descripción   |
| ------ | ------------------- | ----------------------- | ------------- |
| GET    | `/api/v1/nodes`     |                         | Nodos raíz    |
| POST   | `/api/v1/nodes`     | `{parent_id, name}`     | Crear carpeta |
| GET    | `/api/v1/nodes/:id` |                         | Obtener nodo  |
| PUT    | `/api/v1/nodes/:id` | `{name?, description?}` | Actualizar    |
| DELETE | `/api/v1/nodes/:id` |                         | Eliminar      |

### 7.3 Grupos

| Método | Ruta                               | Body                    | Descripción     |
| ------ | ---------------------------------- | ----------------------- | --------------- |
| GET    | `/api/v1/groups/paginate`          | `?page&limit&search`    | Lista           |
| POST   | `/api/v1/groups`                   | `{name, description}`   | Crear           |
| GET    | `/api/v1/groups/:id`               |                         | Detalle         |
| PUT    | `/api/v1/groups/:id`               | `{name?, description?}` | Actualizar      |
| DELETE | `/api/v1/groups/:id`               |                         | Eliminar        |
| POST   | `/api/v1/groups/:id/users`         | `{usr_id, access}`      | Asignar usuario |
| DELETE | `/api/v1/groups/:id/users/:usrID`  |                         | Remover usuario |
| POST   | `/api/v1/groups/:id/nodes`         | `{node_id}`             | Asociar nodo    |
| DELETE | `/api/v1/groups/:id/nodes/:nodeID` |                         | Desasociar      |

### 7.4 Usuarios (Admin)

| Método | Ruta                   | Body                      | Descripción |
| ------ | ---------------------- | ------------------------- | ----------- |
| GET    | `/api/v1/usrspaginate` | `?page&limit&search&role` | Lista       |
| POST   | `/api/v1/usrs`         | `{username, password}`    | Crear       |
| DELETE | `/api/v1/usrs/:id`     |                           | Eliminar    |

### 7.5 Comentarios

| Método | Ruta                         | Body                 | Descripción    |
| ------ | ---------------------------- | -------------------- | -------------- |
| GET    | `/api/v1/comments?node_id=x` |                      | Lista por nodo |
| POST   | `/api/v1/comments`           | `{node_id, content}` | Crear          |
| DELETE | `/api/v1/comments/:id`       |                      | Eliminar       |

---

## 8.Roles y Permisos

### 8.1 Roles de Usuario

| Rol        | Crear/Editar | Notas                |
| ---------- | ------------ | -------------------- |
| SuperUsr   | ✅ Todo      | Puede crear usuarios |
| NormalUsr  | ✅ Propios   | Grupos con acceso    |
| LimitedUsr | ❌           | Solo lectura         |

### 8.2 Group Access Levels

- `read_only_access`
- `write_access`
- `owner_access`

---

## 9. Estado de Implementación

### ✅ Completado

- [x] Login + autenticación (JWT)
- [x] HomeView (root nodes)
- [x] NodeView (detalle + CRUD + comentarios)
- [x] GroupsView (lista + CRUD)
- [x] GroupView (detalle + usuarios + nodos)
- [x] UsrsView (admin)
- [x] Navbar (navegación)
- [x] NotFoundView (404)
- [x] Design System completo

### ⏳ Pendiente

- [ ] Documentos: Upload/Download UI
- [x] Crear Usuario: CRUD alineado con backend (CORREGIDO)

---

## 10. Mantenimiento y Escalabilidad

### 10.1 Áreas de Mejora Futura

1. **Documentos**: Implementar UI para upload/download
2. **Breadcrumb**: Añadir Navigation.breadcrumb en NodeView
3. **Search Global**: Búsqueda unificada en navbar
4. **Theme Toggle**: Soporte dark/light mode
5. **Infinite Scroll**: Alternativa a Pagination para listas grandes

### 10.2 Dependencias Actuales

```
solid-js: ^1.9.12
@solidjs/router: ^0.16.1
tailwindcss: ^4.2.2
zod: ^4.3.6
```

> **Nota**: No agregar nuevas dependencias sin justificación extrema.

