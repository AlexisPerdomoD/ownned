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
│   ├── comments/
│   │   └── api/
│   │       └── index.js      # DTOs + APIs para comentarios
│   └── docs/
│       └── api/
│           └── index.js      # DTOs + APIs para documentos (upload, download, delete)
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
│   │   │   ├── NodeList.jsx
│   │   │   └── UploadDropzone.jsx   # Drag & drop para upload de archivos
│   │   └── usecase/
│   │       ├── useGetNode.js        # Hook: obtener nodo por ID
│   │       ├── useGetRoot.js       # Hook: obtener nodos raíz
│   │       ├── useCreateFolder.js # Hook: crear carpeta
│   │       ├── useUpdateNode.js # Hook: actualizar nodo
│   │       ├── useDeleteNode.js # Hook: eliminar nodo
│   │       ├── useCreateDoc.js   # Hook: upload de archivo
│   │       ├── useDeleteDoc.js   # Hook: eliminar archivo
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
│       │   ├── CommentsList.jsx
│       │   └── CommentItem.jsx    # Comentario individual con edit inline
│       └── usecase/
│           ├── useGetComments.js
│           ├── useCreateComment.js
│           ├── useUpdateComment.js # Editar comentario
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
- Zona de upload de archivos (drag & drop) (si es folder)
- Botones Edit/Delete en header
- Formulario modal para crear/editar

**Componentes**:

- `NodeOverview`: info del nodo (nombre, tipo, descripción, fechas)
- `NodeList` para children (subcarpetas)
- `DocCard` para archivos con botones download/delete
- `UploadDropzone` para drag & drop de archivos
- `CommentsList` + `CommentForm` para comentarios
- Tabs para Contents/Comments
- `NodeForm` modal (crear/editar)
- `CommentItem` para comentarios editables inline

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
| Navbar     | shared/ui/Navbar.jsx     | Links + logout button           |
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
| PATCH  | `/api/v1/comments/:id`       | `{content}`         | Editar         |
| DELETE | `/api/v1/comments/:id`       |                      | Eliminar       |

### 7.6 Documentos

| Método | Ruta                      | Body                  | Descripción        |
| ------ | ------------------------- | --------------------- | ------------------ |
| POST   | `/api/v1/docs`           | multipart/form-data   | Upload archivo     |
| GET    | `/api/v1/docs/:id/download` |                     | Download archivo   |
| DELETE | `/api/v1/docs/:id`       |                       | Eliminar archivo   |

**Nota**: Upload requiere `multipart/form-data` con campos:
- `file`: El archivo binario
- `node_id`: UUID del nodo carpeta padre

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

### ⏳ Pendiente - Versión Funcional Inicial

#### P0 - Críticos

- [x] **Documentos: Upload UI** - `entities/docs/api/index.js` + `useCreateDoc.js` + `UploadDropzone.jsx`
- [x] **Documentos: Download UI** - `useDeleteDoc.js` + integración en `DocCard.jsx`
- [x] **Logout flow** - Botón logout en Navbar → `DELETE /api/v1/usrs/logout`

#### P1 - Importantes

- [ ] **Editar comentario** - `useUpdateComment.js` + `CommentItem.jsx` con modo edit inline

#### P2 - Mejoras UX

- [ ] **Node selector visual** - En `GroupView`, cambiar input UUID por selector con search
- [ ] **Access badges** - Mostrar nivel de acceso con badges en `GroupUsersList`

---

## 10. Mantenimiento y Escalabilidad

### 10.1 Áreas de Mejora Futura

1. **Breadcrumb**: Añadir Navigation.breadcrumb en NodeView
2. **Search Global**: Búsqueda unificada en navbar
3. **Theme Toggle**: Soporte dark/light mode
4. **Infinite Scroll**: Alternativa a Pagination para listas grandes

### 10.2 Dependencias Actuales

```
solid-js: ^1.9.12
@solidjs/router: ^0.16.1
tailwindcss: ^4.2.2
zod: ^4.3.6
```

> **Nota**: No agregar nuevas dependencias sin justificación extrema.

---

## 11. Guía de Implementación - Features Pendientes

### 11.1 Document Upload/Download (P0)

#### Archivos a crear:

```
entities/docs/
└── api/
    └── index.js          # DTOs + APIs

features/node/
├── ui/
│   └── UploadDropzone.jsx  # Drag & drop component
└── usecase/
    ├── useCreateDoc.js     # Upload hook
    └── useDeleteDoc.js     # Delete hook
```

#### API `entities/docs/api/index.js`

```javascript
// DTO para upload (usa FormData, no JSON)
class CreateDocDTO {
    static #schema = z.strictObject({
        node_id: z.string().uuid('Invalid UUID format.'),
        // file se maneja separado en FormData
    })
}

export async function apiCreateDoc(formData) {
    // POST /api/v1/docs con Content-Type: multipart/form-data
    // No usa reqJSON - usa fetch directo
}

export async function apiDeleteDoc(docId) {
    // DELETE /api/v1/docs/:docId
}

export async function apiDownloadDoc(docId) {
    // GET /api/v1/docs/:docId/download
    // Retorna blob para download
}
```

#### UI `UploadDropzone.jsx`

- Drag & drop zone con feedback visual
- Acepta cualquier tipo de archivo
- Muestra progreso de upload
- Integrar en `NodeView` cuando `node.type === 'folder'`

#### Integración en `DocCard.jsx`

```jsx
// Already exists, needs:
// - Download button → apiDownloadDoc
// - Delete button → useDeleteDoc + refresh
```

### 11.2 Logout Flow (P0)

#### Modificar `Navbar.jsx`

```jsx
// Agregar botón logout que llama a:
// DELETE /api/v1/usrs/logout
// Limpiar cookie de sesión
// Redirect a /login
```

#### API existente a usar:

- `DELETE /api/v1/usrs/logout` - No requiere body, limpia cookie

### 11.3 Editar Comentario (P1)

#### Archivos a modificar:

```
features/comment/
├── ui/
│   └── CommentItem.jsx   # CREAR - item individual con edit
└── usecase/
    └── index.js          # AGREGAR useUpdateComment
```

#### Hook `useUpdateComment.js`

```javascript
export function useUpdateComment() {
    const [loading, setLoading] = createSignal(false)

    const update = async (commentId, content) => {
        // PATCH /api/v1/comments/:id con { content }
        // Retorna [success, comment]
    }

    return { update, loading }
}
```

#### UI `CommentItem.jsx`

- Muestra contenido del comentario
- Botón "Edit" que muestra input inline
- Botón "Save" para confirmar
- Botón "Cancel" para abortar
- Mantiene modo edit local hasta confirmar

### 11.4 Node Selector Visual (P2)

#### Mejora en `GroupView`

```jsx
// En lugar de:
// <input name="node_id" placeholder="node-id" />

// Crear NodeSelector:
// - Input con búsqueda
// - Dropdown con resultados de /api/v1/nodes
// - Muestra nombre del nodo seleccionado
```

#### Componente sugerido:

```
features/node/
└── ui/
    └── NodeSelector.jsx  # CREAR
```

---

## 12. Convenciones API Client

### 12.1 Upload con FormData

Para uploads de archivos, NO usar `reqJSON`. Usar fetch directo:

```javascript
export async function apiCreateDoc(formData) {
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('session='))
        ?.split('=')[1]

    const res = await fetch('/api/v1/docs', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
    })

    if (!res.ok) throw new Error('Upload failed')
    return res.json()
}
```

### 12.2 Download de archivos

```javascript
export async function apiDownloadDoc(docId) {
    const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('session='))
        ?.split('=')[1]

    const res = await fetch(`/api/v1/docs/${docId}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })

    const blob = await res.blob()
    // Crear link temporal para download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}
```

---

## 13. Testing Checklist

Antes de considerar una feature completa, verificar:

- [ ] Loading state visible durante operaciones
- [ ] Error handling con mensajes apropiados
- [ ] Toast feedback en operaciones exitosas
- [ ] Refresh de datos después de CRUD
- [ ] Navegación correcta después de acciones
- [ ] Props accedidas como `props.x` (no desestructuradas)
- [ ] Null checks en datos opcionales

