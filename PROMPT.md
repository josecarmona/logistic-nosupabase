# 🚀 Prompt: Aplicación Web de Usuarios y Perfiles con Roles

## 📋 Contexto

Desarrolla una primera funcionalidad de una aplicación web con diseño primero para celular de **gestión de usuarios y perfiles** que será parte de una aplicación más grande y completa que se irá desarrollando con diferentes prompts relacionados y usando el siguiente stack:

### Stack Tecnológico

- **Frontend/Backend**: Svelte 5 y SvelteKit (última versión estable)
- **Estilos**: TailwindCSS
- **Componentes UI**: shadcn-svelte
- **Base de datos**: PostgreSQL (hosteado en Supabase)
- **Autenticación**: Auth de Supabase (email/password + manejo de sesiones)
- **ORM/SQL**: Supabase JS / Supabase CLI para migraciones
- **API Geolocalización**: Nominatim/OpenStreetMap

## 🎯 Funcionalidades Requeridas

### 1. Funcionalidades generales

- Para mantener la integridad de la data, los proceso de borrado, no se deben hacer a nivel de base de datos, cuando se quiere borrar un dato, solo se activa o desactiva el uso para efectos de auditorias o evitar ruptura en la integridad de los datos.
- Los datos desactivados deben presentarse en color gris atenuado.
- Todo input de texto debe ser presentado y registrado en mayúsculas.
- El esquema de menú diseñalo con un sidebar que se oculte a menu de hamburguesa cuando este en movíl, que se au npanel que pueda ocultarse o abrirse, en el header, deja el usuario y la opción de salir. colocal el logo en imagen, texto o ambos em la esquina superior izquierda.

### 2. CRUD de Usuarios

- Listado de usuarios con paginación y búsqueda ordenados alfabeticamente
- Crear usuario
- Editar datos de usuario
- Eliminar usuario (soft delete - Activo o Desactivado)
- Ver detalle de un usuario
- Puede haber perfil sin usuario, pero no usuario sin perfil

### 3. Maestro de roles de usuarios con su respectivo CRUD

- Listado de roles con paginación y búsqueda
- Crear rol
- Editar rol
- Eliminar rol (soft delete - Activo o Desactivado)
- Ver detalle del rol
- A cada rol se le debe poder configurar permisos de lectura, escritura y borrado sobre datos en la base de datos
- A cada rol se le debe poder otorgar permisos sobre las diferentes opciones de menú, registros de formularios y acciones sobre formularios.
- **Catálogo de Permisos Granulares Registrados por Entidad y Módulo**:
  - **Acceso a Menú (`menu`)**: `menu.admin`, `menu.usuarios`, `menu.roles`, `menu.paises`, `menu.adquisiciones`, `menu.catalogos`, `menu.unidades`, `menu.zonas`, `menu.tiendas`, `menu.clientes`, `menu.productos`, `menu.tipos_tarifa`, `menu.tarifas`, `menu.conceptos_pago`, `menu.cargos_descuentos`, `menu.ventas`.
  - **Permisos sobre Datos (`data`)**:
    - Usuarios (`usuarios.ver`, `crear`, `editar`, `desactivar`, `asignar_rol`)
    - Roles (`roles.ver`, `crear`, `editar`, `desactivar`, `asignar_permisos`)
    - Países (`paises.ver`, `crear`, `editar`, `desactivar`)
    - Adquisiciones (`adquisiciones.ver`, `crear`, `editar`, `desactivar`)
    - Unidades de Medida y Grupos (`unidades.ver`, `crear`, `editar`, `desactivar`, `grupos_unidades.*`)
    - Zonas Logísticas (`zonas.ver`, `crear`, `editar`, `desactivar`)
    - Tiendas (`tiendas.ver`, `crear`, `editar`, `desactivar`)
    - Clientes (`clientes.ver`, `crear`, `editar`, `desactivar`)
    - Tipos de Producto y Productos (`tipos_producto.*`, `productos.ver`, `crear`, `editar`, `desactivar`)
    - Tipos de Tarifa y Tarifas (`tipos_tarifa.*`, `tarifas.ver`, `crear`, `editar`, `desactivar`)
    - Conceptos de Pago y Cargos/Descuentos (`conceptos_pago.*`, `cargos_descuentos.*`)
    - Operación de Ventas (`ventas.ver`, `crear`, `editar`, `cobrar`, `anular`)
  - **Formularios y Acciones (`form` / `accion`)**: `form.perfil`, `form.venta`, `accion.eliminar`, `accion.exportar_csv`.
- Los roles iniciales son: 'admin', 'gerente', 'operador', 'cliente'
- El rol por defecto es 'cliente'

### 4. Maestro de países con su respectivo CRUD

- Listado de países con paginación y búsqueda ordenados alfabeticamente
- Crear país
- Editar país
- Eliminar país (soft delete - Activo o Desactivado)
- Ver detalle del país
- Cada país se le debe poder indicar límite de peso máximo de carga permitido, dejando 0 para identificar que no hay límite
- Los países iniciales son: 'Estados Unidos', 'México', 'Guatemala', 'Colombia', 'El Salvador', 'Honduras', 'Venezuela', 'Cuba', 'Nicaragua', 'Ecuador', 'Panamá', 'Chile'
- Para cada país se debe buscar para completar, el código internacional de 3 letras y el código internacional de 2 letras
- Cada país se debe gestionar con diferentes unidades de medida de pesos, la mas usadas Kilogramos y Libras, incorpora una seleción de unidad de peso por país, esta selección debe venir de un maestro de unidades de media que deben contemplar unidades de peso, unidades de volumen y unidades de cantidad.

### 5. Maestro de tipos de adquisiciones

- Listado de tipo de adquisiciones con paginación y búsqueda ordenados alfabeticamente
- Crear tipo de adquisición
- Editar tipo de adquisición
- Eliminar tipo de adquisición (soft delete - Activo o Desactivado)
- Ver detalle del tipo de adquisición
- Los tipos de adquisición iniciales son: 'Web', 'Facebook', 'Instagram', 'Google', 'SMS', 'Whatsapp', 'Business', 'Revista', 'DropOff', 'Agencias', 'Otros'

### 6. Perfiles con Roles

- Cada usuario tiene un **rol** que debe ser seleccionado del Maestro de Roles
- Separación clara entre **tabla de auth** (Supabase Auth) y **tabla de perfiles** (datos de negocio: nombre, apellido, avatar, rol, etc.)
- La tabla de perfiles debe tener los siguientes campos ('email', 'nombre completo', 'razón social', 'dirección 1', 'dirección 2', 'país', 'código postal', 'ciudad', 'estado', 'municipio', 'número celular', 'teléfono', 'tipo de adquisición', 'referencia')
- El rol por defecto es 'cliente'
- Al crear el perfil, luego de las direcciones se debe solicitar el país y el código postal, con esa información se debe buscar en internet la información de estado, municipio y ciudad correspondiente, usando las API que estén disponibles de los diferentes países existentes, no hay un API definido, busca y usa los más adecuados según el país usado.
- Si la API no encuentra la ciudad/estado/municipio, se debe permitir la captura manual como fallback.
- Puede existir un perfil sin usuario, pero se debe poder asociar un usuario a un perfil en cualquier momento.
- Solo el administrador puede asignar roles.
- Si el perfil se crea sin asociar usuario, el perfil se debe crear con un email y ese email es el que luego se asocia al crear el auth user
- El rol de un perfil sin usuario siempre es 'cliente'
- Cada perfil debe tener una codificación conformada opcionalmente por un prefijo, seguido de una secuencia numérica de longitud de dígitos configurable por el administrador y cerrando opcionalmente con un sufijo.
- El administrador puede configurar si el código lleva prefijo y/o sufijo y la cantidad de dígitos numéricos (relleno de ceros a la izquierda). Las variantes admitidas son: `Prefijo-Numero-Sufijo`, `Prefijo-Numero`, `Numero-Sufijo` y `Numero`. El número consecutivo es estrictamente secuencial y asignado automáticamente a cada nuevo perfil.
- Si se cambia la configuración del código se debe hacer un barrido de los códigos y actualizarlos con la nueva configuración.
- Debe existir una configuración de código para cada rol existente que este asociado al perfil
- El administrador debe tenerla capacidad de poder editar el rol del perfil y el campo solo se debe mostrar al administrador.
- Si el rol se llegar a cambiar en un perfil, se debe realizar la asigancaión del nuevo código basado en el nuevo perfil.

### 7. Panel de Administración

- Ruta protegida `/admin` accesible solo para usuarios con rol `admin`
- Vista de gestión de usuarios (CRUD completo)
- Gestión de roles y permisos desde la interfaz.

### 8. Validaciones y Permisos

- Validación de formularios (email válido, contraseñas seguras, datos obligatorios, escape de entradas)
- Protección de rutas (public vs. autenticado vs. admin)
- Autorización a nivel de backend/API (no solo en el frontend)
- Manejo de errores amigable - mensajes emergente con tiempo de 3 segundos de muestra y boton de cierre

### 9. Control de Errores en Español y Páginas Personalizadas (404 / 500 / 403)

- **Traducción y Control de Errores de Supabase**: Captura y traducción al español de todos los mensajes de error devueltos por Supabase Auth y Base de Datos (ej. credenciales inválidas, límite de envío de emails superado, usuarios existentes, contraseñas cortas, violaciones de RLS/clave única) para que nunca se le presenten al usuario en inglés.
- **Páginas de Error de la Aplicación (+error.svelte)**: Páginas de error personalizadas e integradas al layout de la aplicación para responder adecuadamente ante errores 404 (Página no encontrada), 500 (Error interno del servidor) y 403 (Acceso denegado).

### 10. Maestro de unidades de medida

- Listado de unidades de medida con paginación y búsqueda ordenados tipo de unidad de medida
- Crear unidad de medida
- Editar unidad de medida
- Eliminar unidad de medida (soft delete - Activo o Desactivado)
- Ver detalle de la unidad de medida
- Los grupos de unidad de medida iniciales son: Peso, Volumen, Cantidad, Longitud y Superficie
- **Maestro de Grupos de Unidades de Medida**:
  - CRUD completo para gestionar Grupos de Unidades de Medida (Listar, Crear, Editar, Soft Delete, Ver Detalle).
  - Relación de clave foránea entre el Maestro de Unidades de Medida (`grupo_id`) y el Maestro de Grupos de Unidades de Medida (`grupos_unidad_medida`).
  - Eliminación de la restricción `unidades_medida_tipo_check` en base de datos para soportar grupos dinámicos y personalizables.

### 11. Sección Clientes

- Crear una nueva opción de menú llamada Clientes
- En esta sección se deben listar los perfiles que son clientes solamente.
- Se depe poder aplicar un CRUD de perfiles desde esta nueva sección.

### 12. Sección CRUD de Tiendas

- Crear una nueva opción de menú llamada Tiendas
- Debe contener los siguientes campos: 'Número de oficina', 'Nombre', 'Supervisor', 'Email', 'Teléfono', 'Celular', 'Calle', 'Otra direccion', 'Pais', 'Código Postal', 'Estado', 'Ciudad', 'Municipio', 'Zona'
- El 'Supervisor' debe ser una lista desplegable de los perfiles que no son 'Clientes'
- La zona debe ser una lista despegable de un maestro de zonas
- El numero de oficina se debe gestionar como el código del cliente, debe conformarce con prefijo-numero-sufijo, siguiendo las mismas condiciones del código del perfil, debe configurarse en la opcion de Tienda.

### 13. Maestro de zonas

- Listado de zonas con paginación y búsqueda ordenados alfabeticamente
- Crear zona
- Editar zona
- Eliminar zona (soft delete - Activo o Desactivado)
- Ver detalle de la zona
- Esta es una funcionalidad solo del rol administrador
- No es una opción del menú, debe ser parte de la configuración en tiendas (botón "Gestionar Zonas" en la vista de Tiendas)

### 14. Asociación Directa de Usuario Auth a Perfiles

- Permitir al administrador vincular o crear usuario Auth de Supabase directamente desde el detalle de cualquier perfil que aún no tenga usuario asignado.

### 15. Exportación de Datos a CSV

- Botón de exportación de registros filtrados a formato CSV/Excel en los listados de Clientes, Usuarios, Tiendas y Productos para facilitar la gestión operativa y logística.

### 16. Maestro de tipo de productos

- Listado de tipo de productos con paginación y búsqueda ordenados alfabeticamente
- Crear tipo de producto
- Editar tipo de producto
- Eliminar tipo de producto (soft delete - Activo o Desactivado)
- Ver detalle del tipo de producto
- Esta es una funcionalidad solo del rol administrador
- No es una opción del menú, debe ser parte de la configuración en productos (botón "Gestionar Tipo de Producto" en la vista de Productos)
- Tambien debe ir colocado en el panel de administración donde estan todos los otros maestros de datos.
- Al tipo de producto se le debe poder configurar atributos que definen sus caracteristicas y que seran usadas para ser preguntados en la creación de un producto, son diferentes para cada tipo de producto
- El tipo de producto debe contener un atributo de prefijo, que sera usado para codificar los productos.
- Los atributos se le debe asociar una unidad de medida
- **Tipo de Producto CAJA y Peso Volumétrico**:
  - Se incluye el Tipo de Producto `CAJA` (prefijo `CAJ`) configurado con los atributos: Largo, Ancho, Alto y Peso Volumétrico.
  - Cálculo automático en tiempo real del Peso Volumétrico según la unidad de medida de dimensiones seleccionada:
    - **Si la medida usa Centímetros (CM)**: Se calcula el Peso Volumétrico en **Kilogramos (KG)** como $\frac{\text{Largo (CM)} \times \text{Ancho (CM)} \times \text{Alto (CM)}}{5000}$.
    - **Si la medida usa Pulgadas (IN)**: Se calcula el Peso Volumétrico en **Libras (LB)** como $\frac{\text{Largo (IN)} \times \text{Ancho (IN)} \times \text{Alto (IN)}}{139}$.
  - **Detección Inteligente de Unidades Imperial/Métrico**: El sistema analiza dinámicamente los valores ingresados (ej: `10in`, `10 IN`, `10"`), la unidad de medida asignada al atributo o la unidad principal del producto para determinar el divisor (139 o 5000) y la unidad resultante (LB o KG).
  - - Debe estar accesible desde el panel del administrador.

### 17. Sección CRUD de Productos

- Crear una nueva opción de menú llamada Productos
- Debe contener los siguientes campos: 'Tipo de Producto', 'Código de producto', 'Descripción de Producto', 'Costo', 'inventario mínimo', 'Unidad de medida', 'Control de Inventario' (bandera boolean on/off), 'Requiere Seguro' (bandera boolean) y '% Valor Declarado para Seguro' (numeric).
- El tipo de producto se selecciona del maestro de tipos de producto
- Los atributos que conforman el tipo de producto deben ser parte del producto que se esta creando.
- El código del producto, esta definido por un prefijo de 3 letras que proviene del tipo de producto y un consecutivo de 6 numeros
- **Bandera de Control de Inventario (`controla_inventario`)**: Permite indicar si el producto requiere seguimiento de stock e inventario mínimo o si es un producto sin control directo de existencias. Presenta distintivas visuales `STOCK ACTIVO` / `SIN STOCK` en tablas, tarjetas y vista detallada.
- **Seguro de Producto (`requiere_seguro` y `porcentaje_seguro`)**: Permite especificar si el producto requiere o puede aplicar póliza de seguro de envío/carga. De ser afirmativo (`requiere_seguro = true`), habilita la captura del Porcentaje (%) del Valor Declarado (ej. 2.50%) requerido para el cálculo del costo del seguro. Muestra badges distintivas `🛡️ SEGURO X%` en tablas, tarjetas y vista detallada.
- **Capacidad de Carga Máxima (`carga_maxima`)**: Valor numérico en LB (`numeric(12, 2) not null default 0`). Permite especificar la capacidad de carga máxima admitida por el producto. Si el valor es `0`, el sistema adopta como tope el límite de peso establecido por el país destino (`pais.limite_peso`). Si su valor es mayor que el del país, sobreescribe dicho tope y se convierte en el límite máximo de peso permitido para la caja o bulto (ej. México tiene un tope de 150 LB, pero un producto 'Paleta' con carga máxima de 1000 LB tiene como límite 1000 LB). Muestra badges visuales `⚖️ TOPE X LB` en tablas, tarjetas y vista detallada.

- **Atributo Condicional "Cédula" para Venezuela**: Si el país del perfil o cliente es **Venezuela** (`codigo_iso2 = 'VE'`), se solicita obligatoriamente el atributo condicional **'Cédula'** (ej. `V-12345678` o `J-123456789`), el cual es exclusivo para este país.

### 18. Proxy Interno de Geolocalización Anti-AdBlock (`/api/geo`)

- Endpoint proxy `/api/geo` para consultar Nominatim (OSM) y Zippopotam desde el servidor SvelteKit, evitando bloqueos de CORS o bloqueos de dominios por AdBlockers / Brave Shields (`net::ERR_BLOCKED_BY_CLIENT`).

### 19. Resiliencia en Svelte 5 y Manejo de Reactividad

- **Hidratación Defensiva**: Uso de `$derived(data.xxx || [])` en todos los componentes de página para evitar errores `TypeError` durante la hidratación inicial del navegador.
- **Formularios e Inputs Bindable (`InputUppercase`)**: Uso de `value = $bindable()` sin fallbacks internos para permitir valores opcionales o `undefined` sin provocar el error `props_invalid_value` de Svelte 5.
- **Desmontaje Seguro de Modales**: Aplazamiento de cambios de estado en modales mediante `tick().then(...)` para evitar advertencias `[svelte] derived_inert` causadas por el restablecimiento de foco en `bits-ui`.

### 20. Configuración de Servidor de Desarrollo (Vite / Host)

- Ajuste `server.host: true` en `vite.config.ts` garantizando escucha en IPv4 (`127.0.0.1`) e IPv6 (`::1`) para evitar conflictos de resolución en `localhost:5173`.

### 21. Indicador de Carga Global y Cursor Giratorio (`cursor: wait`)

- **Retroalimentación Visual Inmediata**: Durante cualquier actividad o procesamiento en el servidor (navegaciones entre rutas, envíos de formularios con `use:enhance` o eventos POST), la aplicación activa de forma reactiva:
  - Cambio del cursor del ratón en toda la interfaz a **estado de espera giratorio** (`cursor: wait !important;`).
  - Animación de barra de progreso superior en el viewport.
  - Insignia flotante superior con icono spinner giratorio (`Procesando...`), evitando que el usuario perciba inactividad al hacer clic.

### 22. Maestro de tipo de tarifas [DESARROLLADO Y OPERATIVO]
- **Gestión Logística**: Permite definir las categorías de tarifas asignables a los productos (ej: `ESTÁNDAR`, `PROMOCIONAL`, `AL POR MAYOR`).
- **Atributos Requeridos**:
  - `Nombre`: Texto en mayúsculas obligatorio.
  - `Promoción`: Bandera booleana (`true`/`false`) activable por el usuario.
  - `Número de productos involucrados`: Entero `integer` (default `1`) usado para reglas de cálculo por volumen de productos.
- **Acceso y Permisos**: Exclusivo para el rol `admin`. Integrado en el Panel de Administración (`/admin/tipos-tarifa`).
- **CRUD Completo**: Migración SQL `20260830090000_maestro_tipos_tarifa.sql`, listado paginado, búsqueda, modales de creación/edición, soft delete y ver detalle con badges distintivas `✨ PROMOCIÓN` y `📦 N PROD.`.

### 23. Sección Tarifas [DESARROLLADO Y OPERATIVO]
- **Ubicación**: Ubicado en el menú de navegación principal **Ventas** (ruta `/ventas/tarifas`), accesible para roles `admin` y `gerente`.
- **Regla de Negocio y Combinación Única**:
  Cada tarifa se constituye de forma única e inequívoca mediante la relación:
  $$\mathbf{Tarifa} = \mathbf{Tipo\ de\ Tarifa} + \mathbf{Pa\acute{\imath}s\ de\ Destino} + \mathbf{Zona} + \mathbf{Producto}$$
  Restricción `uq_tarifa_combinacion` en base de datos para impedir tarifas duplicadas.
- **CRUD Completo y Exportación**: Migración SQL `20260830100000_tarifas_ventas.sql`, barra de filtros multicriterio (Tipo, País, Zona, Producto), listado responsivo (Tarjetas Móviles / Tabla Desktop), modales de gestión y exportación formal a CSV (`tarifas_ventas.csv`).

### 24. Sección Ventas (Operación de Venta, Pago Mixto, Historial y Resumen 80% / 20%) [ESPECIFICACIÓN Y RECOMENDACIONES TÉCNICAS]
- **Acceso en Menú**: El menú principal de **Ventas** ofrece 3 sub-enlaces organizados al mismo nivel:
  - 🛒 **Operación de Ventas** (`/ventas`)
  - 📋 **Historial de Ventas** (`/ventas/historial`)
  - 💲 **Tarifas de Ventas** (`/ventas/tarifas`)
- **Estructura Visual en 2 Paneles (Operación de Ventas)**:

  **(a) Sección Izquierda (80% del espacio en Desktop / Inferior en Móvil) — Operación de Venta**:
  1. **Filtrado Estricto y Búsqueda Multicriterio de Clientes**: Los desplegables de Selección de Remitente y Consignatario listan de manera **exclusiva perfiles que tengan el rol 'cliente'**, excluyendo administradores u otros roles. Incorporan una barra de búsqueda en tiempo real que permite filtrar simultáneamente por **Nombre Completo**, **Número de Celular/Teléfono** o **Número de Cliente / Código**, indicando en el selector los clientes filtrados (ver Sección 50).
  2. **Visualización Completa y Validación de Datos del Cliente**: Al seleccionar un Remitente o Consignatario, el sistema despliega automáticamente una **tarjeta informativa detallada** mostrando Nombre Completo, Código de Cliente, Correo, Teléfono/Celular, País de Origen/Destino, Dirección y Cédula/RIF (con resaltado si es de Venezuela) para que el operador valide visualmente los datos.
  3. **Creación y Edición Inline de Clientes (`+ Nuevo` / `✏️ Editar`)**:
     - **Formulario Modal Completo (Paridad 100% con Maestro de Clientes)**: El modal de registro y edición de clientes desde Ventas incluye la estructura idéntica de la ficha del cliente:
       - **Dirección Habitual Completa**: Campos `Dirección 1` y `Dirección 2`.
       - **Bloque de Geodatos con Búsqueda Automática de Código Postal**: Selección de `País` y `Código Postal` con botón interactivo de geolocalización (📍 `lookupGeoLocation`) que auto-completa en tiempo real `Ciudad`, `Estado` y `Municipio`.
       - **Datos de Identificación y Contacto**: `Nombre Completo`, `Razón Social`, `Cédula / RIF` (destacada si es de Venezuela), `Número Celular`, `Teléfono Fijo`, `Tipo de Adquisición` y `Referencia`.
     - **Reglas Estrictas del Negocio**: Asigna automáticamente el rol 'cliente', genera el **Código Secuencial de Cliente** (`rpc('generar_codigo_perfil')`), y ejecuta la **validación estricta de no duplicidad** para **Correo Electrónico**, **Número Telefónico** y **Número de Celular** antes de guardar.
     - Permite editar al instante los datos completos del cliente seleccionado (`✏️ Editar Cliente`) sin necesidad de salir del flujo de ventas.
  4. **Extracción Automática del País Destino**: El **País Destino NO es una opción de selección manual en el formulario**; se obtiene e infiere automáticamente del País de origen asignado al perfil del Cliente Destino seleccionado.
  5. **Inversión del Orden de Selección (Tipo de Tarifa Primero y Filtrado de Productos)**:
     - En el formulario de ventas, se selecciona **primero el Tipo de Tarifa** (`tipo_tarifa_id`).
     - El selector de **Producto** presenta **exclusivamente la lista de productos que tienen esa tarifa activa** (`tarifas` asociadas al `tipo_tarifa_id` y coincidentes con el País Destino / Zona Logística).
  6. **Zona Logística Fija del Operador Autenticado**:
     - La **Zona Logística (`zona_id`) es siempre e invariablemente igual a la zona asignada al usuario que está utilizando la aplicación** (`user.zona_id`). Se auto-asigna de forma fija e inmutable tanto en la interfaz como en la validación del servidor.
   7. **Tarifas por Peso Libre, Peso Reportado y Múltiples Cajas**:
      - Para tipos de tarifa de tipo **Peso Libre** (tarifas por libra/peso), el sistema solicita el **Peso Reportado (LB)** y las **Dimensiones de la Caja** (`Alto`, `Ancho`, `Largo` en pulgadas / IN).
      - **Cálculo del Peso Volumétrico**: Se computa automáticamente en tiempo real mediante la fórmula logística de aviación:
        $$\text{Peso Volumétrico (LB)} = \frac{\text{Alto (in)} \times \text{Ancho (in)} \times \text{Largo (in)}}{166}$$
      - **Determinación del Peso Mayor Facturable**: Para la cotización y todos los documentos futuros (tickets, recibos, manifiestos e historial), se utiliza estrictamente el **peso mayor** entre el Peso Reportado y el Peso Volumétrico:
        $$\text{Peso Facturable} = \max(\text{Peso Reportado}, \text{Peso Volumétrico})$$
      - **Cálculo del Precio Base**: Para tarifas por Peso Libre, el precio base de la venta resulta de multiplicar la tarifa unitaria por libra por el Peso Facturable Mayor ($\text{Monto Base} = \text{Precio Tarifa/LB} \times \text{Peso Facturable}$).
      - **Soporte de Múltiples Cajas / Bultos**: Permite activar el modo de múltiples cajas indicando la cantidad total (ej. 3) y configurando independientemente para cada caja (`001/003`, `002/003`, etc.) su tipo de tarifa, producto y peso, consolidando los costos y permitiendo la declaración de artículos segmentada por caja (ver Sección 49).
   8. **Validación de Límite de Peso Dinámico**: Valida que el Peso Facturable Mayor no exceda el límite máximo permitido. Cada producto puede especificar su `carga_maxima` (en LB); si su valor es 0, se usa como tope el límite del País Destino (`pais.limite_peso`). Si `carga_maxima` es mayor que el del país, sobreescribe dicho tope convirtiéndose en el límite máximo de peso permitido para esa caja o paquete (ej. si México tiene tope de 150 LB, un producto 'Paleta' con carga máxima de 1000 LB tiene como límite 1000 LB). En envíos con Múltiples Cajas, la validación se evalúa individualmente para cada caja contra la carga máxima de su producto asignado o el tope del país.
   9. **Seguro de Carga y Valor Declarado**: Solicita si requiere seguro y el **Valor Declarado**. Calcula el costo del seguro en jerarquía de cascada (`%` del Producto $\rightarrow$ `%` de la Tarifa $\rightarrow$ Capture Manual del `%`).
   10. **Inclusión de Cargos Adicionales (+) y Descuentos (-)**:
       - Permite al operador incorporar múltiples cargos y descuentos provenientes del maestro `cargos_descuentos` o de tipo personalizado.

  **(b) Sección Derecha (20% del espacio en Desktop / Superior en Móvil) — Resumen Dinámico y Cobro**:
  - **Ubicación Fija en el Lado Derecho**: En pantallas grandes (Desktop), el resumen de cotización se ubica de forma permanente a la derecha ocupando el **20% del espacio** de la pantalla (`lg:col-span-3`). En dispositivos móviles, se posiciona en la parte superior.
  - **Resumen Flotante en Tiempo Real ($derived)**: Costo base, Cargos en verde (+), Descuentos en rojo (-), Subtotal, Monto de Seguro y **TOTAL A PAGAR**.
  - **Código de Venta Secuencial por País Destino (`codigo_venta`)**: Asignado **únicamente** cuando la venta es **procesada/confirmada** (`estatus_venta === 'realizada'`). Corresponde al Prefijo ISO-3 del País Destino + Consecutivo independiente de 7 dígitos por país (ej. `VEN-0000001`, `USA-0000001`). Mientras la venta permanezca como `'borrador'`, no consume número de secuencia y se le asigna una etiqueta de borrador temporal (`BOR-XXXXXX`).
  - **Estatus de la Venta**: `'borrador'` (información parcial o en reserva, sin código secuencial definitivo) y `'realizada'` (venta procesada con código secuencial asignado).
  - **Estatus de Pago para Ventas 'realizadas'**: `'pendiente'`, `'parcial'` y `'pagada'`.
  - **Procesamiento de Pago Mixto y Referencia Bancaria**: Cobro con múltiples conceptos de pago. Si no es efectivo (`requiere_referencia = true`), solicita obligatoriamente el número de **Referencia de la Operación (4 a 9 dígitos numéricos)**.

   **(c) Módulo Independiente: Historial de Ventas (`/ventas/historial`)**:
  - Ubicado en el submenú de Ventas al mismo nivel que Tarifas Ventas. Presenta el listado completo, paginado y filtrable de todas las operaciones registradas con búsqueda por código, filtros por estatus de venta y de pago, e inspección de detalle.

### 25. Maestro CRUD de Conceptos de Pago [ADMINISTRACIÓN]
- **Ubicación y Permisos**: Exclusivo para el rol `admin`, accesible desde el Panel de Administración (`/admin/conceptos-pago`).
- **Atributos del Concepto de Pago**:
  - `Nombre`: Denominación del método/concepto (ej. *EFECTIVO*, *TRANSFERENCIA*, *PAGO MÓVIL*, *PUNTO DE VENTA*, *ZELLE*, *TARJETA DE CRÉDITO*).
  - `Requiere Referencia`: Bandera booleana (`true`/`false`) que determina si al pagar con este concepto se exige código de transacción (4 a 9 dígitos numéricos).
  - `Porcentaje de Comisión (% comisión)`: Atributo numérico porcentual (`numeric(5, 2)`, por defecto `0.00%`). Define la tasa de recargo por uso del método de pago (común en *Tarjeta de Crédito*, ej. 5.00%).
  - `Activo`: Estado (`boolean`).
- **Cálculo Dinámico de Comisión en Proceso de Pago de Ventas (`/ventas` y `/ventas/historial`)**:
  - Durante el cobro de una venta o el registro de un abono, al seleccionar un concepto de pago:
    - **Si `% Comisión` es 0**: No se realiza cálculo adicional alguno, cobrándose únicamente el monto base acordado.
    - **Si `% Comisión` es mayor a 0**: El sistema calcula en tiempo real el monto de comisión sobre el valor abonado:
      $$\text{Comisión} = \text{Monto Abonado} \times \left(\frac{\% \text{Comisión}}{100}\right)$$
      $$\text{Total a Cobrar} = \text{Monto Abonado} + \text{Comisión}$$
    - **Desglose Visual**: La interfaz muestra una tarjeta informativa con el monto que amortiza la venta, la comisión adicional y el total final a cobrar al cliente.
    - **Persistencia Granular en Base de Datos**: En la tabla `public.venta_pagos` se registran de forma independiente `porcentaje_comision`, `monto_comision` y `monto_cobrado`, preservando la integridad del saldo contable de la venta (`ventas.monto_pagado`).
- **CRUD Completo**: Tabla `public.conceptos_pago`, listado con badges de `% comisión`, búsqueda, modales de creación/edición y soft delete.

### 26. Maestro CRUD de Cargos Adicionales y Descuentos [ADMINISTRACIÓN]
- **Ubicación y Permisos**: Exclusivo para el rol `admin`, accesible desde el Panel de Administración (`/admin/cargos-descuentos`).
- **Atributos**:
  - `Nombre`: Denominación del cargo o descuento (ej: *EMBALAJE ESPECIAL*, *MANIPULACIÓN EN ADUANA*, *DESCUENTO CLIENTE FRECUENTE*).
  - `Tipo`: Clasificación en `'cargo'` (+) o `'descuento'` (-).
  - `Monto Defecto`: Valor numérico base.
  - `Es Porcentaje`: Indica si se calcula como un `%` o valor fijo.
  - `Activo`: Estado (`boolean`).
- **CRUD Completo**: Tabla `public.cargos_descuentos`, listado, búsqueda, modales de creación/edición y soft delete.

### 27. Sección Configuración General, Personalización Visual y Branding (`/admin/configuracion`) [ESPECIFICACIÓN Y RECOMENDACIONES TÉCNICAS]
- **Acceso y Administración**: Exclusivo para administradores a través del panel `/admin/configuracion`.
- **Estructura por Pestañas del Módulo**:
  1. **🎨 Apariencia y Colores de la UI**:
     - **Paleta de Colores Dinámica**: Modificación de la variable CSS `--primary` y su contraste en tiempo real. Incluye **Presets Precargados** (*Negro Elegante*, *Azul Corporativo*, *Verde Esmeralda*, *Púrpura Logístico*, *Naranja Express*, *Rojo Carmesí*).
     - **Estilo del Menú Lateral (Sidebar Theme)**: Configurable entre *Claro Estándar*, *Modo Oscuro Elegante* o *Color Primario de la Marca*.
     - **Radio de Bordes**: Configuración de nivel de redondeo de la interfaz (`0rem` Recto, `0.3rem` Suave, `0.625rem` Estándar, `0.85rem` Redondeado Pro).
     - **Live Preview**: Panel lateral interactivo de vista previa en tiempo real.
  2. **🖼️ Logos e Imagen de Marca**:
     - **Carga de Archivos de Marca**: Almacenamiento en el bucket público `branding` de Supabase Storage para **Logo Principal** (Navbar/Sidebar/Login), **Isotipo / Favicon** e **Imagen para Modo Oscuro**.
  3. **🏢 Identidad Corporativa y Datos de Empresa**:
     - Configuración de Nombre de Empresa/Marca, Eslogan, Identificación Fiscal (RIF/RFC), Teléfono, Correo Soporte y Dirección Matriz para encabezados de cotización y reportes.
  4. **⚙️ Formatos Operativos y Documentos**:
     - Moneda Base Principal (USD, VES, EUR), Símbolo Monetario, Pie de Página de Tickets y Términos & Condiciones por defecto.
- **Inyección Dinámica de Tema**: Carga global en `src/routes/+layout.server.ts` e inyección de `:root` CSS variables y favicon dinámico en `src/routes/+layout.svelte`.

### 28. Maestro de Artículos y Detalle por Venta (`/admin/articulos`) [ESPECIFICACIÓN Y REGLAS OPERATIVAS]
- **Acceso y Administración**: Administrable por Administradores y Gerentes a través de `/admin/articulos`.
- **Estructura del Maestro de Artículos (`articulos`)**:
  - **Atributo Principal del Catálogo**: `nombre` (descripción del artículo maestro) y `activo` (booleano para borrado lógico *soft delete*). El catálogo maestro almacena exclusivamente los nombres de los artículos.
  - **Borrado Lógico (*Soft Delete*)**: Al desactivar un artículo en la interfaz, se actualiza `activo = false`, conservando la integridad referencial de ventas previas.
- **Operación en Ventas (`/ventas`)**:
  - **Captura Dinámica de Cantidad e Importe**: La `cantidad` y el `valor total ($)` de cada artículo se solicitan e ingresan únicamente dentro de la operación de venta al seleccionar del maestro o crear un artículo.
  - **Mínimo 1 Artículo Obligatorio**: En cada venta se exige declarar **al menos un (1) artículo**, sin límite máximo.
  - **Selección e Inserción Flexible**: Permite seleccionar artículos predefinidos del Maestro `/admin/articulos` o crear artículos personalizados directamente dentro de la venta.
  - **Sincronización con el Valor Declarado ($)**: La suma del `valor_total` de los artículos de la venta sincroniza dinámicamente el campo **Valor Declarado**, manteniendo el operador el derecho de editar manualmente el Valor Declarado si lo requiere.
  - **Cálculo del Seguro de Envío**: Recalcula en tiempo real la prima de seguro ($\text{Monto Seguro} = \frac{\text{Valor Declarado} \times \% \text{ Seguro}}{100}$) cuando el seguro esté activo.
- **Registro en Base de Datos (`venta_articulos`)**:
  - Cada venta guarda la lista detallada de sus artículos en la tabla relacional `public.venta_articulos` (`venta_id`, `articulo_id`, `nombre`, `cantidad`, `valor_total`).
- **Inspección en Historial (`/ventas/historial`)**:
  - El modal de detalle completo de la venta despliega la tabla con la lista de todos los artículos registrados en el envío (Nombre, Cantidad y Valor Total).

### 29. Historial de Ventas con Pestañas y Edición de Borradores (`/ventas/historial`) [ESPECIFICACIÓN OPERATIVA]
- **Navegación por 2 Pestañas**:
  - **Pestaña 1: Ventas en Borrador** (`estatus_venta === 'borrador'`): Presenta exclusivamente las ordenes de venta en estado borrador (sin código oficial por país). Muestra badge con el número total de borradores pendientes.
  - **Pestaña 2: Ventas Procesadas** (`estatus_venta === 'realizada'`): Presenta las ordenes de venta procesadas que cuentan con un código oficial asignado (ej. `VEN-0000001`). Muestra badge con el total de ventas procesadas. Permite al rol administrador modificar la fecha de venta registrada (`created_at`) en cualquier momento (ver Sección 48).
- **Edición de Ordenes de Venta en Borrador**:
  - Toda venta en estado **Borrador** incluye el botón **Editar** (en la tabla y en el modal de detalle), el cual redirige a la pantalla de ventas `/ventas?edit={id}`.
  - La interfaz de venta precarga automáticamente todos los campos del borrador (remitente, consignatario, producto, tipo de tarifa, pesos, dimensiones, artículos, cargos/descuentos y pagos).
  - Al guardar la venta editada, el servidor actualiza la orden existente en `public.ventas` y refresca sus sub-registros (`venta_articulos`, `venta_cargos_descuentos`, `venta_pagos`).
- **Procesamiento de Borradores**:
  - Al presionar **Procesar Venta** en una orden borrador, se consume el consecutivo oficial del país destino (`VEN-0000001`), actualizando su estatus a `realizada` y moviéndola a la pestaña de Ventas Procesadas.

### 30. Reglas y Restricciones Operativas para el Registro de Pagos y Abonos [ESPECIFICACIÓN FUNCIONAL]
- **(1) Precarga Automática del Saldo Pendiente por Pagar**:
  - Al abrir el modal de pago o abono (tanto en la venta `/ventas` como en el historial `/ventas/historial`), el campo **Monto a Abonar ($)** se precarga automáticamente con el **Saldo Pendiente por Pagar** ($\text{Saldo Pendiente} = \text{Monto Total} - \text{Total Abonado}$).
- **(2) Restricción Estricta de Sobrepago (Límite Máximo)**:
  - No se permite abonar un monto superior al valor pendiente de la venta ($\text{Monto Abono} \le \text{Saldo Pendiente}$).
  - La interfaz de usuario valida y bloquea el intento con el mensaje *"El monto del abono ($X) no puede ser mayor al saldo por pagar ($Y)"*, respaldado con validación estricta en el servidor SvelteKit (`fail(400)`).
- **(3) Soporte Integral de Pagos Parciales**:
  - Se permite realizar pagos y abonos parciales por cualquier valor mayor a cero y menor o igual al saldo pendiente.
  - La venta refleja el avance con el estatus `parcial`, mostrando en todo momento el monto abonado acumulado y el saldo restante adeudado.
  - Al completar la totalidad del saldo adeudado, el estatus de pago de la venta se actualiza automáticamente a `pagada`.

### 31. Maestro de Proveedores y Tipo de Entrega en Ventas (Domicilio / Oficina Ocurre) [ESPECIFICACIÓN OPERATIVA]
- **(1) Maestro de Proveedores (`/admin/proveedores`)**:
  - Almacena las empresas transportistas con los atributos: `nombre`, `tiene_api` (booleano), `direccion` (dirección física de la oficina en maestro) y `activo` (soft delete / borrado lógico).
  - Disponible en la subnavegación del panel de administración (`/admin/proveedores`) y en el menú lateral.
- **(2) Configuración de Tipo de Entrega en Ventas (`/ventas`)**:
  - En la sección **Remitente y Consignatario (Paso 1)**, el operador selecciona la **Empresa Proveedora / Transporte** y el **Tipo de Entrega en Destino**:
    - **DOMICILIO** (seleccionado por defecto).
    - **RETIRO EN OFICINA / OCURRE**.
- **(3) Resolución Dinámica de la Dirección de Entrega Destino**:
  - **Oficina / Ocurre con API (`tiene_api === true`)**: Busca y muestra la dirección de la agencia correspondiente a la ciudad del cliente destino (`cliente_destino.ciudad`).
  - **Oficina / Ocurre sin API (`tiene_api === false`)**: Asigna la dirección de la oficina almacenada en el maestro de proveedores (`proveedor.direccion`).
  - **Domicilio**: Asigna la dirección de residencia registrada del cliente consignatario (`cliente_destino.direccion_1`).

### 32. Guías de Despacho con QR, Declaraciones de Aduana y Diseñador de Plantillas [ESPECIFICACIÓN FUNCIONAL]
- **(1) Guía de Despacho Estándar con Código QR (`/ventas/guia/[id]`)**:
  - Generación de guía de embarque imprimible que incorpora un **Código QR dinámico en formato vectorial SVG (offline sin dependencias)**.
  - Incluye los datos completos de Remitente, Consignatario, Pesos (Reportado, Volumétrico, Facturable), Empresa Proveedora de Transporte, Tipo de Entrega y Dirección Final.
- **(2) Declaración Jurada y Manifiesto de Aduana (`/ventas/aduana/[id]`)**:
  - Documento oficial de aduana con el desglose del **Exportador/Importador**, **Tabla de Artículos Declarados**, **Resumen Financiero**, y el **Desglose de Componentes de Pago Abonados (Cobro Mixto)** indicando montos, referencias y saldo restante.
  - Cierra con las **Recomendaciones Estándares de Envíos e Inspección Aduanera** (Declaración jurada de no narcóticos/explosivos, sometimiento a aforos fiscales y plazos de seguro de 48 horas).
- **(3) Diseñador de Plantillas de Documentos para Administrador (`/admin/plantillas-documentos`)**:
  - Módulo en el panel de administración (`/admin/plantillas-documentos`) que permite crear, editar y estructurar plantillas de Guías y Declaraciones de Aduana mediante tokens de reemplazo dinámicos (`{{codigo_venta}}`, `{{tabla_articulos}}`, `{{qr_code}}`, `{{tabla_pagos}}`, `{{recomendaciones}}`).

### 33. Integración API del Proveedor Zoom (Oficinas por Ciudad, Generación de Guías y Almacenamiento de URL) [ESPECIFICACIÓN TÉCNICA Y FUNCIONAL]
- **(1) Consulta Dinámica de Agencias Zoom por Ciudad (`fetchZoomOficinasPorCiudad`)**:
  - Al seleccionar un proveedor con API habilitada (`proveedor.tiene_api === true`, ej. **Zoom Logística**) y tipo de entrega **RETIRO EN OFICINA / OCURRE**, la interfaz consulta automáticamente el catálogo/directorio de agencias de Zoom disponibles en la ciudad del destinatario (`cliente_destino.ciudad`).
  - El operador puede seleccionar la agencia específica de destino (ej. *Agencia Zoom Centro, C.C. Trinitarias, La Urbina, etc.*), actualizando automáticamente la `direccion_entrega`.
- **(2) Creación y Registro de Guías mediante API Zoom (`generarGuiaDespachoZoomAPI`)**:
  - Al procesar la orden de venta (en `/ventas` o desde el historial `/ventas/historial`), el sistema transmite los datos de la operación (remitente, consignatario, ciudad, peso, valor declarado y dirección final) al servicio web de la API de Zoom.
- **(3) Almacenamiento de Guía del Proveedor y URL del Documento**:
  - La respuesta de la API del proveedor se almacena en la tabla `public.ventas`:
    - `guia_proveedor`: Número de Guía asignado por la API de Zoom (ej. `ZM-8839201`).
    - `url_documento_proveedor`: Enlace directo al documento/etiqueta PDF generado por la API de Zoom (ej. `https://developers.zoom.us/docs/api/shipments/ZM-8839201/label.pdf`).
  - Disponible para consulta y descarga en el historial de ventas (`/ventas/historial`) con el botón 🌐 **Guía API PDF**.
- **(4) Conmutación de Entorno Pruebas (Sandbox) vs Producción (Variables de Entorno)**:
  - El cambio entre ambiente de pruebas (Sandbox) y producción oficial se gestiona exclusivamente por variables de entorno en `.env` sin modificar el código fuente (`src/lib/services/zoom-api.ts`):
    - `VITE_ZOOM_ENV=production` (o `sandbox` para pruebas).
    - `VITE_ZOOM_API_URL=https://api.zoom.red/v1` (URL base oficial del servidor de producción de Zoom).
    - `VITE_ZOOM_API_KEY=tu_api_key_oficial_de_produccion_zoom` (Llave de autenticación entregada por Zoom).

### 34. Cobertura de Países por Proveedor, Filtrado por Destino y Número de Guía Manual [ESPECIFICACIÓN FUNCIONAL Y OPERATIVA]
- **(1) Asignación de Países Atendidos por Proveedor (`/admin/proveedores`)**:
  - En la tabla y formulario del maestro de proveedores (`/admin/proveedores`), el administrador selecciona la lista de países a los cuales presta servicio cada transportista (`public.proveedores_paises`).
  - Muestra badges de cobertura de países en la tabla de administración (ej. `[VE]`, `[CO]`, `[ES]`).
- **(2) Filtrado Dinámico de Proveedores por País Destino en Ventas (`/ventas`)**:
  - Al seleccionar o cambiar el cliente destinatario / país destino en la pantalla de ventas (`/ventas`), el selector de **Empresa Proveedora / Transporte** se filtra automáticamente para mostrar únicamente los proveedores que atienden el país de destino.
- **(3) Ingreso de Número de Guía Manual (Proveedores Sin API)**:
  - Si el proveedor de transporte seleccionado NO cuenta con integración API (`tiene_api === false`), la interfaz solicita obligatoriamente el **Número de Guía del Proveedor (Manual)**.
  - Validación estricta: Máximo 22 caracteres numéricos (restringido a dígitos `0-9`). Se almacena en la columna `guia_proveedor` de `public.ventas`.

### 35. Secciones Colapsables (Acordeón) con Semáforo Indicador de Estado en Ventas [MEJORA VISUAL Y UX]
- **(1) Secciones Colapsables de Ventas (`/ventas`)**:
  - Todas las tarjetas principales del formulario de ventas en `/ventas` (Paso 1: Remitente/Consignatario/Transporte, Paso 2: Tarifa/Producto/Pesos, Paso 3: Declaración de Artículos y Paso 4: Cargos y Descuentos) incorporan funcionalidad de **Acordeón Colapsable/Expandible**.
  - Permite reducir el desplazamiento vertical (scroll) y focalizar la atención del operador en la sección activa.
  - La tarjeta lateral derecha de **Resumen de la Cotización** permanece **siempre fija y visible** (sin colapsar) para consulta constante de montos y pesos.
- **(2) Semáforo Indicador de Estado por Sección (Rojo, Amarillo y Verde)**:
  - Cada encabezado de sección colapsable cuenta a la izquierda de su título con un indicador tipo **Semáforo**:
    - 🟢 **Verde (`COMPLETO`)**: La sección cuenta con el 100% de la información requerida ingresada correctamente.
    - 🟡 **Amarillo (`INCOMPLETO`)**: La sección tiene información parcial o faltan datos opcionales/secundarios por completar.
    - 🔴 **Rojo (`REQUERIDO`)**: La sección no contiene la información obligatoria requerida para procesar la operación.

### 36. Validación Estricta de Tarifa Existente (Costo Base Requerido > $0) [ESPECIFICACIÓN DE REGLAS DE NEGOCIO]
- **(1) Obligatoriedad del Costo Base de Tarifa**:
  - El costo base de una venta proviene del precio registrado en la combinación activa de `public.tarifas` para (Tipo de Tarifa + Producto + País Destino + Zona Logística).
  - El costo base es **siempre requerido y obligatorio**. La aplicación rechaza cualquier intento de procesar o guardar ventas cuyo costo base sea $0.00 por falta de tarifa coincidente.
- **(2) Bloqueo y Alertas en Frontend (`/ventas`)**:
  - Si el operador selecciona una combinación para la cual NO existe tarifa activa configurada (`isTarifaInexistente === true`):
    - Se despliega un aviso de alerta en rojo destacado en Paso 2 y en la barra lateral de **Resumen de la Cotización**: *"¡Atención! No existe una tarifa configurada para la combinación seleccionada. El costo base es requerido y no puede ser $0. Por favor revise las condiciones o configure la tarifa en Administración."*
    - El semáforo del Paso 2 cambia inmediatamente a 🔴 **Rojo (`REQUERIDO / TARIFA NO EXISTE`)**.
    - Los botones **Confirmar Venta Realizada** y **Guardar Borrador** se deshabilitan para evitar procesar envíos con monto base en cero.
- **(3) Validación de Seguridad Server-Side (`src/routes/ventas/+page.server.ts` e `historial/+page.server.ts`)**:
  - La acción `createVenta` y la acción `procesarBorrador` verifican la existencia de `tarifaFound` y que `monto_base > 0`.
  - Si la tarifa no existe o el precio es $0, el servidor rechaza la transacción y retorna un error `fail(400)` solicitando al operador verificar la configuración de tarifas.

### 37. Asignación de Usuarios a Clientes y Modo Borrador para Rol Cliente [ESPECIFICACIÓN DE ACCESO Y ROL CLIENTE]
- **(1) Asignación de Credenciales de Acceso a Clientes (`/admin/usuarios`)**:
  - Un Administrador puede crear o asignar una cuenta de usuario con contraseña a un cliente desde la interfaz de Administración de Usuarios (`/admin/usuarios`).
  - Utiliza `Supabase Auth Admin API` para generar o actualizar el usuario de autenticación (`auth.users`) y sincronizar su `user_id` con el perfil del cliente (`public.profiles`).
  - Muestra la insignia 🟢 **Acceso Activo** en el listado de usuarios para identificar rápidamente a los clientes que poseen acceso al sistema.
- **(2) Interfaz y Restricciones del Rol 'Cliente' (`/ventas`)**:
  - Al iniciar sesión con el rol `'cliente'`:
    - El menú lateral oculta rutas administrativas (`/admin/*`) y muestra **"Cotizar Envío (Borrador)"** y **"Mis Envíos"**.
    - El cliente es fijado automáticamente como **Cliente Origen (Remitente)**.
    - El cliente puede ingresar: **Consignatario (Cliente Destino)**, **Artículos del Envío**, **Valor Declarado** y **Seguro**.
    - La opción **"Confirmar Venta Realizada"** permanece oculta. El cliente sólo puede generar operaciones en estado **Borrador**.
    - La acción en el servidor `createVenta` fuerza el estado `estatus_venta = 'borrador'` e impide alterar el remitente.
- **(3) Historial de Envíos del Cliente (`/ventas/historial`)**:
  - En el historial, los usuarios de rol `'cliente'` visualizan **únicamente sus propios borradores y envíos** (`cliente_origen_id = user.id`).
  - Se restringen acciones operativas (anular venta, procesar borrador a realizada) para garantizar la seguridad del flujo logístico.

### 38. Página de Inicio de Envíos, Bloqueo de Maestros y Formulario Simplificado para Rol Cliente [ESPECIFICACIÓN DE VISTA CLIENTE]
- **(1) Página de Inicio del Cliente (`/` -> `/ventas/historial`)**:
  - Al iniciar sesión un usuario con únicamente el rol `'cliente'`, la ruta principal (`/`) lo redirige automáticamente a su lista de envíos y solicitudes en borrador (`/ventas/historial`), convirtiendo esta pantalla en su página de inicio principal.
- **(2) Restricción Total de Acceso a Maestros**:
  - Los usuarios con rol `'cliente'` tienen **bloqueado el acceso a cualquier catálogo o maestro** (`/admin/*`, `/clientes`, `/tiendas`, `/productos`, `/ventas/tarifas`).
  - Si intentan ingresar por URL directa, los `load` de servidor de cada una de estas rutas los redirigen de forma segura a `/ventas/historial`.
- **(3) Formulario de Cotizar Envío Simplificado (`/ventas`)**:
  - **Sección 1 (Remitente y Consignatario)**:
    - Muestra únicamente: **Remitente** (fijado a su perfil), **Consignatario (Quién recibe)** y **Tipo de Entrega** (Domicilio u Oficina).
    - Se oculta por completo la selección manual de Empresa de Transporte / Proveedor.
  - **Sección 2 (Seguro de Envío)**:
    - Se oculta la selección de Tarifas, Productos, Zonas y Pesos/Dimensiones (que se auto-asignan con valores base en segundo plano).
    - Muestra **únicamente el bloque de Seguro de Envío** (`¿Desea solicitar seguro para su envío?` y el `Valor Declarado`).
  - **Sección 3 (Declaración de Artículos)**:
    - Permite agregar y detallar los artículos a enviar (Nombre, Cantidad y Valor Total acumulado).
  - **Sección 4 (Cargos Operativos)**: Oculta para el usuario cliente.

### 39. Formato Restringido de Consignatario y Opción "Destinatario en Tienda" para Rol Cliente [ESPECIFICACIÓN DE PRIVACIDAD Y TIENDA]
- **(1) Privacidad y Formato del Consignatario (`/ventas`)**:
  - En la lista desplegable de **Cliente Destino (Consignatario)** y en su tarjeta de información, los usuarios con rol `'cliente'` visualizan únicamente **Nombre Completo, Ciudad, País y Zona/Código Postal** (ej. `JUAN PÉREZ - CARACAS, VENEZUELA (CP: 1010)`).
  - Se ocultan datos sensibles como el correo electrónico, teléfono, cédula de identidad/RIF y direcciones domiciliarias de otros clientes.
- **(2) Opción "Destinatario en Tienda"**:
  - Se dispone de una casilla de verificación exclusiva para el rol cliente: `🏢 Colocar destinatario en tienda (Retiro/Entrega en Tienda)`.
  - Si el cliente no encuentra al destinatario en el listado, puede marcar esta casilla para indicar que la entrega o retiro se realizará directamente en la tienda u oficina receptora.
  - Al marcarla, se oculta el selector obligatorio de consignatario y la acción en el servidor `createVenta` asigna la operación de forma segura.

### 40. Restricción Total de Selección de Proveedor de Transporte para Rol Cliente [ESPECIFICACIÓN DE OCULTACIÓN DE PROVEEDOR]
- **(1) Ocultación de Selección de Proveedor en Formulario (`/ventas`)**:
  - Para usuarios con rol `'cliente'`, la opción de seleccionar la **Empresa Proveedora / Transporte**, las insignias de API/Maestro y el ingreso manual de Guías de Proveedor se ocultan por completo en la interfaz.
  - El cliente únicamente selecciona el **Tipo de Entrega** (`Domicilio` o `Retiro en Oficina / Ocurre`).
- **(2) Ocultación en el Resumen de la Cotización**:
  - En el panel lateral del resumen de la cotización, el bloque informativo `Proveedor: ...` permanece oculto para el rol cliente para evitar errores o confusiones.

### 41. Ocultación del Panel de Resumen de Cotización para el Rol Cliente [ESPECIFICACIÓN DE INTERFAZ DE CLIENTE]
- **(1) Ocultación Completa de la Columna de Cotización (`/ventas`)**:
  - Para usuarios con rol `'cliente'`, la columna derecha flotante **"Resumen Cotización"** (que incluye tarifas base, subtotal, desglose de seguro, montos finales y botón de cobros) se oculta por completo de la pantalla.
- **(2) Expansión del Formulario de Operación**:
  - Al estar oculto el resumen de cotización, la columna principal del formulario de envío se expande automáticamente al 100% del ancho (`lg:col-span-12`), ofreciendo una experiencia enfocada y limpia para el registro de solicitudes en borrador.

### 42. Simplificación de Seguro y Exención de Validaciones de Tarifa para Rol Cliente [ESPECIFICACIÓN DE DRAFT CLIENTE]
- **(1) Ingreso Exclusivo de Valor Declarado**:
  - En la Sección de Seguro de Envío (`/ventas`), los usuarios con rol `'cliente'` indican si desean seguro y especifican **únicamente el Valor Declarado ($)** de los productos a enviar.
  - El campo de `% de Seguro` se remueve de su vista y se procesa automáticamente en segundo plano según los atributos predeterminados del producto o la configuración del sistema.
- **(2) Exención de Validaciones Operativas de Tarifa para Borradores de Cliente**:
  - Debido a que el cliente únicamente genera la solicitud inicial en estado **Borrador** y no realiza el cierre tarifario ni la liquidación monetaria de la venta, la acción del servidor `createVenta` omite las restricciones de tarifas inexistentes o montos base requeridos (`monto_base <= 0`) para el rol cliente.
  - Los operadores y personal administrativo se encargan de auditar, asignar la tarifa correspondiente y procesar la operación a estado `Realizada`.

### 43. Borrador sin Producto Asignado, Validación en Cierre y Restricción de Acciones para Rol Cliente [ESPECIFICACIÓN DE BORRADORES Y ACCIONES]
- **(1) Registro de Borrador sin Producto Pre-seleccionado (`/ventas`)**:
  - Las solicitudes en borrador generadas por el rol `'cliente'` se registran sin un producto prefijado (`producto_id = NULL`), respetando que el cliente no realiza la categorización ni selección del producto maestro de la empresa.
  - Se añade la migración SQL `20260902170000_ventas_producto_id_nullable.sql` (`ALTER TABLE public.ventas ALTER COLUMN producto_id DROP NOT NULL;`) y se implementa una recuperación automática en el servidor que asigna el producto base predeterminado si el esquema de la base de datos aún posee restricción `NOT NULL`, garantizando que la operación en borrador se guarde sin errores.
  - En las vistas de lista e historial, la columna de producto despliega de manera consistente `SIN PRODUCTO ASIGNADO` para borradores de clientes hasta que un operador audite y procese la operación.
- **(2) Mantenimiento Estricto de Validaciones al Confirmar Venta Realizada**:
  - Aunque los borradores de cliente permiten la ausencia de producto y tarifa durante su captura inicial, **al momento de confirmar o procesar una venta como `Realizada` (`estatus_venta = 'realizada'`)** se exige de forma estricta e inexorable:
    1. `producto_id` seleccionado y válido.
    2. `tipo_tarifa_id` seleccionado y válido.
    3. Tarifa activa vinculada y cálculo de costo base válido (`monto_base > $0.00`).
  - Esto garantiza la integridad operativa y contable del sistema impidiendo que cualquier venta se cierre o facture sin tarifa o producto asignado.
- **(3) Restricción de Acciones Permitidas en la Lista (`/ventas/historial`)**:
  - En la tabla de mis envíos/historial, los usuarios con rol `'cliente'` tienen habilitadas únicamente dos (2) acciones permitidas:
    1. **Imprimir Declaración de Aduana**: Permite generar el documento oficial de aduana para exportaciones/embarques internacionales.
    2. **Editar Operación en Borrador**: Permite modificar los datos declarados del borrador antes de su procesamiento oficial.
  - Se ocultan todas las demás opciones operativas (imprimir guía de despacho con QR, ver detalle completo, procesar a realizada, anular venta o registrar cobros/abonos).

### 44. Dashboard de Resultados Comerciales para Roles Admin y Gerente [ESPECIFICACIÓN DE DASHBOARD COMERCIAL]
- **(1) Página de Inicio Inteligente según Rol (`/`)**:
  - Para usuarios con rol `'admin'` y `'gerente'`, la página de inicio presenta un **Dashboard de Resultados Comerciales** con métricas en tiempo real de facturación, recaudación y distribución geográfica.
  - Para operadores y otros usuarios internos, se preserva el acceso a la vista institucional y accesos directos a módulos.
  - Para usuarios únicamente con rol `'cliente'`, el sistema redirige automáticamente a su historial de envíos (`/ventas/historial`).
- **(2) Filtro por Rango de Fechas**:
  - Selector de fechas `Desde` y `Hasta` con valores por defecto fijados al **mes en curso** (primer y último día del mes actual).
  - Botón de acceso rápido `Mes Actual` para restablecer el rango con un solo clic.
- **(3) Tarjetas de Indicadores Clave (KPIs)**:
  - **Tarjeta 1 (Total Ingresos Facturados)**: Muestra el total facturado en el rango (sin importar si está pagado o no). En la misma tarjeta identifica y contrasta en detalle el **Monto Pagado** (con porcentaje cobrado) y el **Monto No Pagado / Pendiente** (con porcentaje por cobrar).
  - **Tarjeta 2 (Pagado en Efectivo)**: Monto total recaudado en efectivo / taquilla y porcentaje sobre el total cobrado.
  - **Tarjeta 3 (Pagado en Zelle)**: Monto total recaudado vía transferencias electrónicas Zelle y su porcentaje sobre el total cobrado.
  - **Tarjeta 4 (Otros Medios de Pago)**: Monto total recaudado por medios distintos a Efectivo y Zelle (tarjetas, transferencias bancarias, otros) y su porcentaje correspondiente.
- **(4) Gráficos Analíticos y Visualizaciones**:
  - **Gráfico de Barras (Ingreso por Mes)**: Evolución histórica de ventas y facturación de los últimos 6 meses con tooltips interactivos y totales del período semestral.
  - **Gráfico de Barras / Apilado (Composición del Ingreso)**: Desglose porcentual y monetario de la facturación entre: (1) Cajas / Tarifa Base, (2) Cargos y Servicios Adicionales, y (3) Primas de Seguro de Envío.
  - **Gráfico de Columnas (Ventas por País Destino)**: Volumen de facturación y número de despachos por cada país receptor con barras de proporción visual.
  - **Gráfico de Área / Distribución (Productos Tipo Caja)**: Desempeño y volumen de facturación desglosado por tipos de caja (estándar, a medida, etc.) con curva de área en SVG y detalle por producto.
### 45. Experiencia Limpia y Moderna de Autenticación de Envíos Internacionales [ESPECIFICACIÓN DE LOGIN Y AUTENTICACIÓN]
- **(1) Aislamiento de Layout en Rutas de Autenticación (`/login`, `/register`)**:
  - En el layout principal (`src/routes/+layout.svelte`), las rutas de autenticación detectadas (`/login`, `/register`, `/auth/*`) se renderizan en una vista completamente limpia y dedicada, **ocultando el menú lateral (Sidebar) y la cabecera superior (Header)**.
- **(2) Interfaz Moderna con Identidad de Marca y Envíos Internacionales**:
  - La pantalla de inicio de sesión (`/login`) implementa una distribución moderna de dos columnas en pantallas grandes:
    - **Panel Visual Logístico (Izquierda)**: Muestra una composición con el color primario de la marca, patrón de rutas globales, puntos de confianza (rutas aéreas y marítimas, seguro, entregas a domicilio/tienda y trazabilidad), eslogan corporativo y el logo configurado.
### 46. Nuevos Formatos de Documentos: Picking List & Invoice y Guía de Paquetería con Código de Barras [ESPECIFICACIÓN DE DOCUMENTOS OPERATIVOS]
- **(1) Generador Autocontenido de Código de Barras 1D (`src/lib/services/barcode.ts`)**:
  - Implementación en TypeScript puro que codifica texto alfanumérico (`INV-XXXXXX`) en estándar **Code 128B** vectorizado en formato SVG y DataURL. No depende de paquetes externos ni de scripts en el navegador.
- **(2) Formato Picking List & Invoice Comercial de Paquetería (`/ventas/picking/[id]`)**:
  - Vista optimizada para impresión en papel carta (`window.print()`).
  - **Encabezado y membrete**: Logotipo de la empresa, dirección fiscal, teléfonos, correo y eslogan corporativo.
  - **Identificador**: Código de Factura / Invoice y Código de Barras 1D.
  - **Direcciones Clave**: `BILL TO` (Remitente completo con teléfono, ciudad y código postal) y `SHIP TO` (Consignatario y dirección de entrega en destino).
  - **Fila de Control Operativo**: `PACKER` (Operador/Vendedor), `AGENT` (Proveedor/Agencia), `SHIPPING DATE`, `SHIPPING VIA` (Terrestre/Aéreo / Retiro en oficina / Domicilio), `QTY`, y `CONDITIONS` (Medio de pago: Efectivo/Tarjeta/Zelle).
  - **Tabla de Tarifas y Cargos**: Descripción de caja/producto con categoría, paquetería, peso (LB), desglose de seguro, recolección, herramientas, cargos adicionales, descuentos y total facturado.
  - **Póliza y Términos Legales**: Cláusulas de revisión en 3 días, trámites aduanales, cobertura por extravío en cajas estándar (hasta $500) y responsabilidad de embalaje.
  - **Sección de Firmas**: Firma del Agente y Firma del Cliente.
- **(3) Formato Guía de Paquetería / Shipping Label con Código de Barras (`/ventas/guia-paqueteria/[id]`)**:
  - Formato alternativo de etiqueta de despacho con bloques grandes de `BILL TO` y `SHIP TO`.
  - Ficha técnica lateral: Tipo de entrega/Observación, tamaño de caja, peso facturable, fecha y empresa de paquetería.
  - Gran código de barras 1D (`Code 128`) central para escaneo en ruta.
- **(4) Selector de Documentos en el Historial de Ventas (`/ventas/historial`)**:
  - Para administradores y operadores, se habilitó un modal interactivo al pulsar el icono de impresora que permite elegir directamente entre formatos estándar y plantillas personalizadas.
  - Acceso directo individualizado mediante iconos dedicados en la tabla y en el modal de detalle de la venta.

### 47. Módulo WYSIWYG de Diseño de Plantillas de Documentos y Control de Roles
- **(1) Diseñador Visual WYSIWYG (`/admin/plantillas-documentos`)**:
  - Editor interactivo de plantillas con barra de herramientas de formato (negrita, cursiva, subrayado, títulos H1/H2/H3, alineación de texto, listas, enlaces, tablas y divisor).
  - Selector de Tamaño de Papel (`letter`, `a4`, `a5`, `legal`, `thermal_80mm`, `thermal_58mm`) y Orientación (`portrait`, `landscape`).
  - Selector de Tipo de Documento ampliado (`guia`, `picking`, `factura`, `declaracion_aduana`, `etiqueta`, `personalizado`).
  - Modal de Vista Previa en tiempo real con simulación del documento y datos de prueba.
- **(2) Catálogo de Variables / Placeholders de Ventas (Click-to-Insert)**:
  - Panel visual de variables organizado en 6 categorías, permitiendo a los administradores hacer clic en cualquier variable para insertarla directamente en la posición del cursor:
    - **Remitente**: `{{remitente_nombre}}`, `{{remitente_cedula}}`, `{{remitente_telefono}}`, `{{remitente_email}}`, `{{remitente_direccion}}`, `{{remitente_ciudad}}`, `{{remitente_codigo_postal}}`.
    - **Consignatario / Destino**: `{{consignatario_nombre}}`, `{{consignatario_cedula}}`, `{{consignatario_telefono}}`, `{{consignatario_email}}`, `{{consignatario_direccion}}`, `{{consignatario_ciudad}}`, `{{consignatario_estado}}`, `{{consignatario_codigo_postal}}`, `{{pais_destino}}`.
    - **Logística y Operación**: `{{codigo_venta}}`, `{{fecha_emision}}`, `{{hora_emision}}`, `{{empresa_transporte}}`, `{{guia_proveedor}}`, `{{tipo_entrega}}`, `{{direccion_entrega}}`, `{{packer_operador}}`, `{{condiciones_pago}}`.
    - **Pesos y Producto**: `{{producto_codigo}}`, `{{producto_descripcion}}`, `{{producto_tipo}}`, `{{peso_facturable}}`, `{{peso_reportado}}`, `{{peso_volumetrico}}`.
    - **Finanzas y Desglose**: `{{monto_base}}`, `{{monto_seguro}}`, `{{porcentaje_seguro}}`, `{{valor_declarado}}`, `{{monto_recoleccion}}`, `{{monto_cargos}}`, `{{monto_descuentos}}`, `{{monto_total}}`, `{{monto_pagado}}`, `{{saldo_pendiente}}`, `{{estatus_pago}}`.
    - **Elementos Gráficos, Tablas y Membretes**: `{{nombre_empresa}}`, `{{eslogan_empresa}}`, `{{direccion_empresa}}`, `{{telefono_empresa}}`, `{{email_empresa}}`, `{{logo_empresa}}`, `{{codigo_qr}}`, `{{codigo_barras}}`, `{{tabla_articulos}}`, `{{tabla_pagos}}`, `{{firmas_conformidad}}`.
- **(3) Control de Acceso y Permisos por Rol**:
  - Configuración granular mediante checkboxes en el formulario de la plantilla para seleccionar qué roles (`admin`, `gerente`, `operador`, `cliente`) tienen autorización para generar o imprimir cada documento.
  - Almacenamiento en base de datos mediante la columna `roles_permitidos` (`text[]`).
  - Validación en servidor (`+page.server.ts`) que rechaza solicitudes no autorizadas con código HTTP 403 Forbidden.
- **(4) Renderizador Dinámico Centralizado (`/ventas/documento/[plantilla_id]/[venta_id]`)**:
  - Endpoint y vista dedicada que carga la orden de venta con todas sus relaciones, resuelve los tokens dinámicos mediante `renderDocumentTemplate(...)`, inyecta el código QR vectorial y el código de barras 1D (`Code 128B`).
  - Aplica reglas de hoja de estilo `@media print` para asegurar una impresión limpia sin elementos de interfaz no deseados.
- **(5) Integración con el Selector de Impresión de Ventas (`/ventas/historial`)**:
  - Modal de impresión actualizado para consultar y presentar de forma destacada las plantillas activas personalizadas autorizadas para el rol del usuario conectado, manteniendo accesibles los formatos estándar.

### 48. Edición de Fecha de Registro de Venta Exclusiva para Administradores [ESPECIFICACIÓN OPERATIVA]
- **(1) Campo Visible y Edición en el Proceso de Venta (`/ventas`)**:
  - Se incorporó la **Fecha de Venta (Registro)** de manera visible y destacada en el flujo de ventas, ubicándola tanto en el panel principal superior de la orden como en el panel lateral derecho de **Resumen de Cotización**.
  - **Control y Restricción por Rol**:
    - **Rol Administrador (`admin`)**: Único rol autorizado para editar y seleccionar la fecha y hora exacta de emisión de la venta mediante un campo interactivo `<input type="datetime-local">`, tanto para ventas nuevas como para la edición de borradores existentes.
    - **Otros Roles (`operador`, `gerente`, `cliente`)**: El campo se presenta en modo visible pero bloqueado/desactivado (`disabled` / solo lectura) con insignia de seguridad (`🔒 Solo Lectura`) y mensaje explicativo indicando que la fecha se asigna de forma automática por el sistema.
  - **Validación Estricta del Lado del Servidor (`src/routes/ventas/+page.server.ts`)**:
    - La acción `createVenta` extrae `fecha_venta` y valida rigurosamente en backend que el usuario autenticado cuente con el rol `admin`.
    - Si un usuario no administrador intenta enviar una fecha personalizada mediante manipulación de peticiones, el servidor descarta el valor de manera silenciosa y segura, conservando la fecha asignada por el sistema o la original de la orden.
    - Si el administrador asigna una fecha válida, se almacena en la columna `created_at` de la tabla `public.ventas`.
- **(2) Modificación de Fecha de Venta en Ventas ya Procesadas (`/ventas/historial`)**:
  - **Requerimiento Operativo**: Para ventas que ya han sido procesadas (`estatus_venta === 'realizada'`, identificadas con su código oficial consecutivo por país, ej. `VEN-0000001`), el sistema requiere que la fecha de venta registrada (`created_at`) pueda ser modificada con posterioridad de forma exclusiva por el **Administrador (`admin`)**.
  - **Interfaz de Usuario y Control de Acceso (`/ventas/historial`)**:
    - En la pestaña **Ventas Procesadas** del Historial de Ventas, tanto en la fila de cada orden en la tabla (mediante botón o icono de acción rápida `📅 Cambiar Fecha`) como dentro del **Modal de Detalle Completo de la Venta**, se habilita un control interactivo de edición visible y utilizable **únicamente para usuarios con rol `admin`**.
    - Para los roles no administradores (`operador`, `gerente`, `cliente`), la fecha de la venta procesada permanece estrictamente en modo de solo lectura (`🔒 Solo Lectura`), sin botones ni formularios de edición disponibles en la interfaz.
    - Al accionar el botón de cambio de fecha, se despliega un diálogo o modal interactivo (*"Modificar Fecha de Venta"*) precargado con la fecha y hora actual de la venta (`created_at`). El administrador puede seleccionar la nueva fecha/hora con un control `<input type="datetime-local">` y guardar o cancelar los cambios.
  - **Validación y Persistencia en el Servidor (`src/routes/ventas/historial/+page.server.ts`)**:
    - Se habilita una Server Action dedicada (`actualizarFechaVenta`) que recibe el identificador de la venta (`venta_id`) y la nueva fecha seleccionada (`fecha_venta`).
    - **Control de Seguridad**: Valida estrictamente en backend los roles de la sesión activa (`getRolesForUser`). Si el usuario autenticado no posee el rol `admin`, la acción deniega la operación con código HTTP 403 Forbidden (`fail(403, { message: 'Solo los administradores tienen autorización para modificar la fecha de ventas procesadas' })`).
    - **Validación de Integridad de Datos**: Comprueba que la venta exista y que el valor de fecha recibido sea válido (`!isNaN(parsedDate.getTime())`).
    - **Actualización Segura**: Actualiza la columna `created_at` en `public.ventas` con la fecha seleccionada y refresca `updated_at`. Todos los demás atributos de la venta (código correlativo, artículos, cargos, descuentos, comisiones, montos y pagos aplicados) se preservan intactos, manteniendo la integridad referencial y financiera.
  - **Efecto Inmediato y Consistencia Documental**:
    - La interfaz reactiva refleja el cambio de forma instantánea en la tabla del historial y en el modal de detalle sin requerir recargar la página.
    - Toda reimpresión o consulta posterior de documentos asociados a la venta procesada (Guía de Despacho estándar `/ventas/guia/[id]`, Declaración de Aduana `/ventas/aduana/[id]`, Shipping Label con código de barras `/ventas/guia-paqueteria/[id]` o plantillas dinámicas WYSIWYG `/ventas/documento/[plantilla_id]/[venta_id]`) utilizará de forma automática la nueva fecha de registro (`created_at` / `{{fecha_emision}}` / `{{hora_emision}}`).

### 49. Despacho de Múltiples Cajas por Venta con Declaración de Artículos por Caja [ESPECIFICACIÓN OPERATIVA]
- **(1) Selector de Múltiples Cajas en Sección 2 (`/ventas`)**:
  - En la sección **2. Tipo de Tarifa, Producto y Especificaciones de Carga**, se incorpora un selector/conmutador interactivo: `¿Despachar Múltiples Cajas / Bultos en este Envío?`.
  - Al activarse, solicita de forma destacada el **Número total de cajas del envío** (control numérico con valor mínimo de 2 cajas y ajuste reactivo).
- **(2) Numeración Estricta de Cajas (`001/003`)**:
  - Cada caja se etiqueta y numera correlativamente en formato de tres dígitos con relleno de ceros a la izquierda sobre el total de cajas: `001/003`, `002/003`, `003/003`, etc.
- **(3) Especificaciones Independientes por Cada Caja**:
  - Cada caja individual cuenta con su propia configuración obligatoria:
    - **Tipo de Tarifa** (`tipo_tarifa_id`).
    - **Producto** (`producto_id`), filtrado por las tarifas activas disponibles para el tipo de tarifa seleccionado, país destino y zona logística.
    - **Peso y Dimensiones**: Peso reportado (LB) y dimensiones opcionales (alto, ancho, largo en pulgadas) con cálculo de peso volumétrico ($\frac{A \times A \times L}{166}$) y peso facturable individual.
  - El sistema resuelve la tarifa activa correspondiente a cada caja y computa su costo base individual.
  - **Cálculo Consolidado**: El costo base global de la venta resulta de la suma de los costos base de todas las cajas ($\sum \text{monto\_base}$). Asimismo, el peso facturable total de la venta corresponde a la suma de los pesos facturables de todas las cajas, impactando en tiempo real el resumen de cotización y los totales finales.
- **(4) Declaración de Artículos por Caja (Sección 3)**:
  - Al estar activado el modo de múltiples cajas, la declaración de artículos del envío se gestiona de forma segmentada por caja:
    - El formulario de inclusión de artículos (tanto desde el catálogo maestro como personalizados) incluye un selector para asignar el artículo a una caja específica (`001/003`, `002/003`, etc.).
    - La tabla de artículos desplegados incorpora una columna distintiva de **Caja** con su badge identificador y permite filtrar la vista por caja o ver el consolidado global.
    - El semáforo de estado valida que cada una de las cajas cuente con artículos declarados.
- **(5) Persistencia y Modelo de Datos**:
  - Migración SQL `20260925000000_multiples_cajas_ventas.sql` que agrega `es_multiple_cajas` (booleano), `total_cajas` (entero) y `cajas_detalle` (jsonb) en `public.ventas`, y `caja_numero` (varchar) en `public.venta_articulos`.

### 50. Búsqueda y Filtrado Multicriterio de Clientes (Remitente y Consignatario) [ESPECIFICACIÓN OPERATIVA]
- **(1) Campos de Búsqueda Interactiva en Sección 1 (`/ventas`)**:
  - Tanto para el **Cliente Remitente (Origen)** como para el **Cliente Consignatario (Destino)**, se implementó un campo de búsqueda interactivo en tiempo real ubicado directamente sobre el selector desplegable.
- **(2) Criterios de Filtrado Simultáneos**:
  - La búsqueda permite escribir y filtrar instantáneamente por cualquiera de los siguientes tres atributos del cliente:
    1. **Nombre Completo** del cliente (`nombre_completo`).
    2. **Número de Celular o Teléfono** (`numero_celular` / `telefono`).
    3. **Número de Cliente** / Código asignado (`codigo`, ej. `CLI-0000001`).
- **(3) Retroalimentación en el Selector Desplegable**:
  - El desplegable indica visualmente en su opción inicial el total de clientes coincidentes (ej. `-- 3 CLIENTES ENCONTRADOS --`).
  - Las opciones desplegadas presentan de forma clara y unificada el Nombre en mayúsculas, el Código de Cliente y el Número de Celular o Teléfono para rápida identificación del operador.
  - Incorpora botón de limpieza rápida (`✕`) para reiniciar la búsqueda al instante.

### 51. Control de Inventario de Productos y Descuento Automático en Ventas [ESPECIFICACIÓN OPERATIVA]
- **(1) Modelo de Datos y Kárdex de Movimientos**:
  - Migración SQL `20261009000000_control_inventario_stock_y_movimientos.sql` que incorpora la columna `stock` (`numeric(12, 2) not null default 0`) en la tabla `public.productos`.
  - Creación de la tabla `public.inventario_movimientos` con los campos: `id`, `producto_id`, `tipo_movimiento` ('entrada', 'salida', 'ajuste'), `cantidad`, `stock_anterior`, `stock_nuevo`, `referencia`, `motivo`, `operador_id` y `created_at`.
- **(2) Descuento Automático de Stock en Operación de Ventas**:
  - En la creación de ventas (`/ventas` -> acción `createVenta`), al confirmarse una venta como `realizada`, el sistema descuenta automáticamente la cantidad de unidades vendidas del stock del producto (para productos con `controla_inventario = true`), tanto en ventas simples (1 producto) como en despachos con múltiples cajas (`cajas_detalle`).
  - En el historial de ventas (`/ventas/historial` -> acción `procesarBorrador`), al procesar un borrador a venta `realizada`, se descuenta el stock y se registra la salida en el kárdex con la referencia del código oficial de la venta.
  - En la anulación de ventas (`/ventas/historial` -> acción `anularVenta`), si la venta estaba en estatus `realizada`, el sistema restituye automáticamente el stock y genera el movimiento de entrada en el kárdex.
- **(3) Módulo Especializado de Control de Inventario (`/inventario`)**:
  - Acceso directo en el menú lateral principal (Sidebar) con icono de cajas (`Boxes`).
  - **Tarjetas KPI**: Total Productos, Unidades Totales en Stock, Productos con Stock Bajo/Crítico (`stock <= inventario_minimo`) y Productos Agotados (`stock <= 0`).
  - **Pestaña Existencias**: Listado en tiempo real con buscador dinámico, filtros por estado de stock, badges cromáticos de disponibilidad y acciones inmediatas.
  - **Pestaña Kárdex**: Historial auditable de movimientos cronológicos (entradas, salidas y ajustes) con fecha, cantidad, stock previo/nuevo, referencia y operador responsable.
  - **Modal "+ Adicionar Entrada"**: Formulario interactivo para registrar ingresos de stock por compras o recepciones de lotes con proyección de stock y documento de referencia.
  - **Modal "Ajustar Stock"**: Formulario para corrección directa de stock por conteo físico o mermas con cálculo reactivo de diferencias.
- **(4) Permisos Granulares Registrados**:
  - `inventario.ver`: Visualización del módulo y kárdex.
  - `inventario.adicionar`: Registro de entradas de inventario.
  - `inventario.ajustar`: Modificación directa por conteo físico.

### 52. Capacidad de Carga Máxima por Producto y Sobreescritura Dinámica de Límites de Peso [ESPECIFICACIÓN OPERATIVA]
- **(1) Campo de Carga Máxima en Productos**:
  - Migración SQL `20261009010000_producto_carga_maxima.sql` que incorpora la columna `carga_maxima` (`numeric(12, 2) not null default 0`) en la tabla `public.productos`.
  - En la vista y formularios de Productos (`/productos`), permite capturar la capacidad de carga máxima en Libras (LB) al crear y editar productos. Muestra insignias informativas `⚖️ TOPE X LB` en las tablas, tarjetas móviles y vistas de detalle.
- **(2) Regla de Sobreescritura Dinámica de Límites**:
  - Si `producto.carga_maxima === 0` (o no está definida), el sistema utiliza como tope el límite general del País Destino (`pais.limite_peso`).
  - Si `producto.carga_maxima > 0` y es **mayor** que el límite del País Destino (`carga_maxima > pais.limite_peso`), la capacidad de carga del producto sobreescribe y se convierte en el tope máximo permitido para el despacho o paquete.
  - **Ejemplo**: Si México tiene un tope de 150 LB, pero el producto "Paleta" tiene una capacidad de carga máxima configurada de 1000 LB, el límite máximo permitido para ese envío/caja es de 1000 LB y no de 150 LB.
- **(3) Validación en Ventas Simples y Múltiples Cajas**:
  - En ventas estándar (1 caja), se calcula el límite efectivo entre el producto seleccionado y el país destino, mostrando la insignia `Límite Producto: X LB` o `Límite País: X LB` y bloqueando la confirmación si se excede.
  - En ventas con Múltiples Cajas (`es_multiple_cajas = true`), cada caja evalúa de manera individual su peso facturable mayor contra el límite de su propio producto asignado o el tope del país. Si alguna caja excede su límite permitido, se resalta con alerta contextual tanto en la tarjeta de la caja individual como en el resumen consolidado, impidiendo el procesamiento con sobrepeso.
### 53. Cargos y Descuentos con Modalidad de Monto Fijo o Porcentaje del Valor Base [ESPECIFICACIÓN OPERATIVA]
- **(1) Soporte de Modalidad en el Catálogo Maestro (`/admin/cargos-descuentos`)**:
  - Cada concepto de cargo o descuento puede definirse bajo dos modalidades:
    - **Monto Fijo (`$`)**: Valor absoluto directo en dólares (`es_porcentaje = false`).
    - **Porcentaje (`%`)**: Valor porcentual que se calcula sobre el costo base (`monto_base`) de la venta (`es_porcentaje = true`).
  - La interfaz de administración incluye selector de modalidad tanto al crear como al editar conceptos, adaptando las etiquetas y validaciones, y mostrando distintivos visuales (`% DEL BASE` vs `$ FIJO`) en el listado.
- **(2) Cálculo Reactivo Dinámico en la Operación de Venta (`/ventas`)**:
  - Al seleccionar un concepto porcentual del catálogo o agregar uno personalizado, el monto en dólares se recalcula dinámicamente en tiempo real:
    $$\text{monto} = \text{round}\left(\frac{\text{monto\_base} \times \text{porcentaje}}{100}, 2\right)$$
  - Si el usuario modifica el peso de la carga, dimensiones de las cajas, tarifa de servicio o cantidad de cajas, el costo base (`monto_base`) cambia y todos los cargos/descuentos porcentuales actualizan automáticamente su valor y su impacto en el subtotal y total a cobrar.
  - La interfaz de la venta permite registrar conceptos personalizados directos con selección de tipo (Cargo / Descuento) y modalidad (Fijo / Porcentaje).
- **(3) Persistencia e Historial**:
  - Migración SQL `20261009020000_venta_cargos_descuentos_porcentaje.sql` que añade `es_porcentaje` y `porcentaje` a la tabla `public.venta_cargos_descuentos`.
  - En el guardado (`+page.server.ts`), se asegura la integridad de los cálculos y se implementa respaldo resiliente (fallback) en caso de que la base remota no haya ejecutado aún la migración.
  - En el modal de detalle del historial de ventas (`/ventas/historial`), se visualiza el desglose claro de qué conceptos fueron aplicados como porcentaje y su valor final.

### 54. Servicio de Geolocalización y Búsqueda por Código Postal [ESPECIFICACIÓN OPERATIVA]
- **(1) Endpoint Proxy Interno (`/api/geo`)**:
  - Resuelve las búsquedas geográficas desde el servidor Node.js evitando bloqueos de extensiones cliente (AdBlockers).
  - Normalización automática de códigos postales: elimina espacios y guiones, y realiza auto-padding a 5 dígitos para países con longitud fija como México y Estados Unidos (ej. `1000` -> `01000`).
  - Estrategia multi-proveedor:
    1. Zippopotam (`https://api.zippopotam.us/{iso2}/{zip}`).
    2. Nominatim OpenStreetMap filtrando por código estándar `countrycodes={iso2}`.
    3. Fallback con Nominatim por nombre de país.
- **(2) Diagnóstico Inteligente y Detección Cruzada de Códigos Postales**:
  - En caso de que un código no exista en el país seleccionado (ej. `96101` consultado en México):
    - Si el código existe en otro país como Estados Unidos (donde `96101` es Alturas, California), el sistema devuelve una notificación contextual explicativa indicando a qué país y localidad corresponde.
    - Si corresponde a secuencias no asignadas de un estado (como la serie `961xx` en Veracruz donde `96100` y `96102` son válidos pero `96101` no existe en SEPOMEX), sugiere los códigos válidos de la región.

### 55. Modalidad de Cálculo de Tarifas: Tarifa Única vs Cobro por Peso Reportado [ESPECIFICACIÓN OPERATIVA]
- **(1) Soporte de Modalidad en el Maestro de Tarifas (`/ventas/tarifas`)**:
  - Cada tarifa configurada (combinación de Tipo de Tarifa + País + Zona Logística + Producto) define su modalidad de cálculo:
    - **Tarifa Única (Caja Completa)**: Valor fijo e invariable cobrado por la unidad/caja, sin considerar el peso (`tipo_calculo = 'unica'`, `es_por_peso = false`).
    - **Por Peso Reportado ($ / LB)**: Tarifa unitaria cobrada por cada libra de peso reportado de la carga (`tipo_calculo = 'peso'`, `es_por_peso = true`).
  - **Migración SQL**: `20261009030000_tarifa_tipo_calculo.sql` que añade las columnas `tipo_calculo` (`VARCHAR(20) DEFAULT 'unica'`) y `es_por_peso` (`BOOLEAN DEFAULT FALSE`) a la tabla `public.tarifas`.
  - Los modales de Crear y Editar Tarifas incluyen el selector interactivo de "Modalidad de Cálculo", adaptando dinámicamente las etiquetas (`Precio por Peso ($ por Libra)` vs `Precio Final de Venta ($ Fijo por Caja)`), con notas explicativas.
  - La tabla desktop y las tarjetas móviles identifican de manera inmediata el tipo de cobro con badges cromáticos distintivos (`POR PESO ($/LB)` vs `TARIFA ÚNICA`).
  - Incorpora selector de filtro por modalidad en la barra de búsqueda y filtros para segmentar tarifas únicas o por peso, además de exportar la modalidad en los archivos CSV.
- **(2) Cálculo Reactivo Dinámico en la Operación de Venta (`/ventas`)**:
  - En la venta de un solo paquete:
    - Si la tarifa es **por peso** (`tarifa.tipo_calculo === 'peso'` o `tarifa.es_por_peso`):
      $$\text{monto\_base} = \text{round}(\text{tarifa.precio} \times \text{peso\_reportado}, 2)$$
    - Si la tarifa es **única**:
      $$\text{monto\_base} = \text{tarifa.precio}$$
  - En envíos de Múltiples Cajas (`es_multiple_cajas = true`):
    - Cada caja evalúa de manera individual su tarifa configurada.
    - Si la tarifa de la caja es por peso, su costo base es $\text{tarifa.precio} \times \text{caja.peso\_reportado}$.
    - Si la tarifa es única, aplica el precio fijo de la tarifa.
    - El resumen de la tarjeta de cada caja y el panel lateral de facturación detallan la fórmula y multiplicación aplicada en tiempo real.
  - En el guardado del servidor (`ventas/+page.server.ts`), la acción `createVenta` calcula el `monto_base` respetando estrictamente la modalidad de cálculo por peso reportado.

## 📊 Modelo de Datos (proponer migraciones SQL)

Proporciona el esquema de tabla `profiles`, sugerencia de trigger para auto-crear el perfil al registrarse un usuario de Supabase Auth, y políticas de seguridad a nivel de fila (RLS - Row Level Security).

## 🔐 Seguridad

- **RLS (Row Level Security)** habilitado en Supabase: políticas para que un usuario solo vea/edite lo que le corresponde
- Los roles `admin` tienen acceso completo
- Passwords gestionados únicamente por Supabase Auth
- Nunca exponer datos sensibles al cliente
- Se debe cumplir con los estándares europeos y americanos en el contexto de la seguridad de los datos
- Usar RLS de Supabase solo para aislamiento base (admin todo, usuario su propio perfil) y validar los permisos por rol/entidad/menú en la capa de aplicación (frontend + servidor SvelteKit)
- **REGLA OBLIGATORIA DE SINCRONIZACIÓN DE PERMISOS**: Cada vez que se incorpore una nueva entidad, catálogo maestro o módulo funcional al sistema, es **obligatorio y mandatorio** catalogar e incorporar sus permisos granulares (`data`, `menu`, `form`, `accion`) en la tabla `public.permisos`, registrarlos en la constante `PERMISSIONS` de `src/lib/server/permissions.ts`, actualizar las asignaciones iniciales en las migraciones/seed de base de datos y mantener este documento `PROMPT.md` 100% veraz y al día.

## 📁 Estructura de Proyecto SvelteKit (propuesta)

Sigue las convenciones de SvelteKit:

- `+layout.server.ts` / `+page.server.ts` para carga de datos del lado servidor
- Actions (form actions) para mutaciones seguras
- Ruta protegida con `load` guards que redirigen según autenticación y rol
- Componer UI con shadcn-svelte (DataTable, Dialog, Form, etc.)

## ✅ Entregables que espero de ti

1. Configuración inicial del proyecto (sveltekit + tailwind + shadcn-svelte + supabase)
2. Scripts/migraciones SQL para base de datos y RLS
3. Módulo de autenticación y manejo de sesión
4. Sistema de roles y permisos (composable/guard reutilizable)
5. Páginas CRUD de usuarios
6. Panel de administración
7. Componentes UI reutilizables
8. Documentación breve de cómo correr el proyecto

## Control de versiones

- Crea un repositorio git local y sincronizalo con un repositorio git privado en Github.
- El comit inicial es la base inicial de los modulos y sus dependencias
- Abrir una rama nueva de la principal donde se realizaran los desarrollos y luego se pasará a una rama de calidad para que sea probado por el usuario final.

## 🚫 Fuera de alcance

- No usar autenticación por terceros (OAuth) por ahora — solo email/password
- No implementar pagos

Vas a generar el código completo correctamente comentado en español y documentado en detalle, organizado por pasos, verificando que compile sin errores. Si hay decisiones ambiguas, pregunta antes de continuar.
