# 🚀 Aplicación Web de Gestión de Usuarios y Perfiles con Roles

Sistema web de gestión de usuarios, perfiles de negocio, roles con matriz de permisos y catálogos maestros desarrollado en **SvelteKit**, **TailwindCSS**, **shadcn-svelte** y **Supabase (PostgreSQL)**.

---

## 📋 Características Principales

1. **Gestión Global de Integriad & Mayúsculas**:
   - **Soft Delete**: Proceso de borrado lógico (`activo = false`) para evitar rupturas de integridad.
   - **Formato Gris Atenuado**: Registros desactivados se muestran en color gris atenuado y tachado.
   - **Entradas en Mayúsculas**: Todos los campos de texto (`InputUppercase`) presentan y registran datos en mayúsculas automáticamente.
2. **Autenticación y Sesiones**:
   - Registro (`/register`) e Inicio de sesión (`/login`) mediante **Supabase Auth**.
   - Cierre de sesión seguro (`/logout`).
3. **Perfiles con Roles y Geolocalización**:
   - Separación clara entre datos de autenticación y tabla de perfiles (`profiles`).
   - Soporte para **perfiles independientes sin usuario** y vinculación posterior.
   - Auto-completado de Ciudad, Estado y Municipio según País y Código Postal utilizando API pública de geolocalización (Zippopotam / Nominatim OpenStreetMap).
4. **Matriz de Roles y Permisos (CRUD completo)**:
   - Roles predefinidos (`admin`, `gerente`, `operador`, `cliente`).
   - Configuración granular de permisos por tipo: datos (`data`), menú (`menu`), registros (`form`) y acciones (`accion`).
5. **Maestro de Países (CRUD completo)**:
   - Códigos internacionales ISO 2 y ISO 3.
   - Configuración de límite de peso de carga (0 para sin límite).
6. **Maestro de Tipos de Adquisición (CRUD completo)**:
   - Canales de captación de clientes (Web, Facebook, Instagram, Google, Whatsapp, etc.).
7. **Panel de Administración (`/admin`)**:
   - Interfaz responsive y mobile-first protegida por guards de servidor (`/admin/+layout.server.ts`).
   - Paginación y filtro de búsqueda alfabética en todas las vistas de tablas.
8. **UX & Notificaciones**:
   - Mensajes emergentes toast (Sonner) configurados para auto-cerrarse en 3 segundos con botón de cierre.
9. **Control de Errores en Español y Páginas Personalizadas**:
   - **Traductor de Errores (`src/lib/utils/errors.ts`)**: Intercepta y traduce al español todos los errores devueltos por Supabase Auth y Base de Datos (ej. credenciales inválidas, límite de envío de correos superado, contraseñas cortas, registros duplicados, etc.).
   - **Página de Error de la Aplicación (`src/routes/+error.svelte`)**: Vista integrada de error personalizada responsive para manejar errores 404 (Página No Encontrada), 500 (Error Interno del Servidor) y 403 (Acceso Restringido), ofreciendo botones de retorno.
10. **Maestro de Unidades de Medida (CRUD completo en `/admin/unidades`)**:
   - Catálogo de unidades clasificadas por grupo: **Peso** (KG, LB, G, OZ, TN), **Volumen** (M3, FT3, L, GAL) y **Cantidad** (UND, CJ, PQT, PLT).
   - Integración directa con el **Maestro de Países** para definir la unidad de peso oficial por defecto de cada país.
11. **Codificación Consecutiva de Perfiles**:
   - Asignación automática de códigos mediante disparador atómico PL/pgSQL en PostgreSQL.
   - Panel de administración configurable para ajustar la opcionalidad del **Prefijo** y **Sufijo**, así como la **Longitud de Dígitos** (relleno de ceros a la izquierda).
   - Formatos admitidos: `Prefijo-Numero-Sufijo`, `Prefijo-Numero`, `Numero-Sufijo` y `Numero`.
12. **Sección Clientes (`/clientes`)**:
   - Nueva sección en el menú principal con un CRUD especializado para listar y gestionar exclusivamente los perfiles con rol `cliente`.
13. **CRUD de Tiendas (`/tiendas`)**:
   - Módulo de gestión de sucursales y oficinas con campos completos de ubicación, contacto, geolocalización automática y selector de supervisor (excluyendo el rol cliente).
14. **Maestro de Zonas (Integrado en Tiendas)**:
   - Configuración exclusiva para Administradores accesible directamente desde la sección de Tiendas (botón *"Gestionar Zonas"*).
15. **Asociación Directa de Usuario Auth**:
   - Permite al Administrador registrar credenciales de acceso Auth para cualquier perfil existente sin usuario directamente desde la interfaz.
16. **Exportación de Registros a CSV**:
   - Descarga en formato CSV de listas filtradas en Clientes, Usuarios y Tiendas para soporte operativo y logístico.

---

## 🛠️ Stack Tecnológico

- **Frontend & Backend**: Svelte 5 / SvelteKit (Runes API)
- **Estilos**: TailwindCSS v4
- **Componentes UI**: shadcn-svelte / bits-ui
- **Base de Datos & Auth**: PostgreSQL / Supabase JS
- **Geolocalización**: Zippopotam & Nominatim OpenStreetMap APIs

---

## 🗄️ Estructura de la Base de Datos

Las migraciones SQL y el seed se encuentran en la carpeta `supabase/`:

- `supabase/migrations/20260827000000_initial_schema.sql`: Creación de tablas (`roles`, `permisos`, `rol_permisos`, `paises`, `tipo_adquisiciones`, `profiles`), funciones RLS (`is_admin`) y trigger `handle_new_user()`.
- `supabase/seed.sql`: Datos semilla iniciales de roles, permisos, países y tipos de adquisición.

---

## 🚀 Instalación y Ejecución

### 1. Requisitos Previos

- Node.js (v18+)
- Instancia de Supabase o CLI local de Supabase

### 2. Configurar Variables de Entorno

Copia el archivo `.env.example` a `.env` e ingresa la URL y Clave Anónima de tu proyecto Supabase:

```bash
PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 3. Instalar Dependencias

```bash
npm install
```

### 4. Verificar Tipos de TypeScript y Svelte

```bash
npm run check
```

### 5. Iniciar Servidor de Desarrollo

```bash
npm run dev
```

### 6. Compilar para Producción

```bash
npm run build
npm run preview
```

---

## 🌿 Control de Versiones Git

- Rama principal: `main`
- Rama de desarrollo: `develop`
