# 🍔 Antojitos con Miriam - App Web de Pedidos, Clientes y Caja Diaria

¡Bienvenida, Miriam! Esta aplicación web fue creada pensando 100% en el ritmo y las necesidades reales de tu carretilla **Antojitos con Miriam** (atendiendo viernes y sábado con hamburguesas, pollo broaster, salchipapas, aguaditos, alitas acevichadas y más).

---

## 🚀 ¿Cómo abrir la aplicación?

1. **En tu computadora o laptop:**
   - Abre tu navegador (Chrome, Edge) e ingresa a: **`http://localhost:3000`**

2. **En tu celular (mientras estás en la carretilla o en casa conectado al mismo WiFi):**
   - Abre el navegador de tu celular e ingresa a: **`http://192.168.18.26:3000`**
   - *(En el celular puedes darle a los 3 puntitos de Chrome -> "Agregar a la pantalla principal" y se instalará como una App con tu logo oficial).*

3. **Para iniciarla en el futuro desde la terminal:**
   ```bash
   npm run dev
   ```

---

## 🎨 Logotipo Oficial y Temas (Claro / Oscuro)

- **Logotipo Oficial**: Integrado en alta resolución tanto en la pantalla de inicio (Login), la barra superior y el ticket de venta digital.
- **Modo Claro (Día ☀️)**: Fondo iluminado con tonos crema y barra dorada brillante, pensado para cuando revisas cuentas o compras bajo la luz del día.
- **Modo Oscuro (Noche 🌙)**: Fondo carbón profundo (`#141417`) con acentos dorados que coinciden exactamente con tu afiche publicitario, perfecto para no cansar la vista en la noche de carretilla y ahorrar batería de tu celular.
- **Cambio con 1 clic**: Toca el botón de **Sol / Luna** en la esquina superior para transformar la apariencia de inmediato.

---

## 👥 Crear Nuevos Usuarios y Gestionar PINs

Ahora tienes el control total para crear nuevos accesos para quienes te ayuden a atender:
1. Ingresa como administradora.
2. Abre **Configuración → Usuarios** o el ícono **Usuarios** de la barra superior.
3. **Funciones**:
   - **➕ Crear Nuevo Usuario**: Escribe su nombre (ej. *"Lucía Hija"*, *"Pedro Mozo"*), elige su rol (*Dueña / Admin* o *Ayudante*), asígnale un **PIN de 4 dígitos** y escoge un ícono.
   - **👁️ Ver u Ocultar PIN**: Toca el ojo para ver qué clave tiene cada ayudante.
   - **✏️ Editar o Cambiar Clave**: Modifica el PIN en cualquier momento.
   - **🗑️ Eliminar Usuario**: Elimina usuarios antiguos con total seguridad.

Al abrir una base de datos nueva, crea la administradora y elige su PIN de 4 dígitos. No hay PINs de fábrica.

---

## ✨ Funciones Diseñadas para tu Negocio

### 1. ⚡ Tomar Pedidos al Paso (Rápido e Intuitivo)
- **Tu Carta Real**: Botones grandes con los platos de tu afiche:
  - *Hamburguesa a la plancha (S/ 6.00)*
  - *Aguadito Criollo (S/ 3.00)*
  - *Alitas Acevichadas (S/ 10.00)*
  - *Salchipollo (S/ 6.00)*
  - *Salchipapa Clásica (S/ 5.00)*
  - *Patitas de Pollo (S/ 4.00)*
  - *Pollo Broaster Pierna (S/ 10.00) / Pecho (S/ 12.00)*
  - *Vaso de Chicha Morada (S/ 1.00)*
- **Agotados a la vista**: La pantalla muestra qué platos están agotados y evita agregarlos o enviar un pedido que todavía los contiene. Marca cada producto como disponible o agotado en **Carta**.
- **Para Llevar o Comer Aquí**: Un solo toque para distinguir si es para plato o para taper/bolsa.
- **Selector de Cremas Callejeras**: Con un toque eliges "Todas las cremas", "Sin cremas", o marcas mayonesa, ají pollero, tártara, etc.
- **Notas Rápidas**: Atajos como *"Papas bien fritas"*, *"Sin ensalada"*, *"Poco arroz"*.
- **Dos salidas**:
  - **Mandar a Freír/Preparar** (para tener la cuenta en cola).
  - **Cobrar Ahora** (si el cliente te paga de inmediato).

### 2. 👥 Registro y Directorio de Caseros (`Mis Caseros`)
- **Directorio de Clientes Frecuentes**: Registra a tus clientes con su nombre, apodo, teléfono/WhatsApp, plato preferido y cremas habituales.
- **Historial de Consumo**: Visualiza cuántos pedidos ha hecho cada casero y su gasto acumulado, con la insignia especial de **⭐ Casero Fiel**.
- **Aviso por WhatsApp**: Botón directo para enviar un mensaje a su WhatsApp avisándoles que la carretilla ya abrió.
- **Atajo para Pedir**: Con un toque en el casero, vas directo a la pantalla de pedido con su nombre y sus cremas favoritas ya seleccionadas.

### 3. 🔥 Tablero de Pedidos Activos (Cocina / Freidora)
- Separa claramente:
  - 🔵 **Recibidos**: Pedidos registrados que todavía no comenzaron a prepararse.
  - 🟡 **En Preparación**: Lo que está friéndose o sirviéndose con cronómetro (*"Hace 4 min"*).
  - 🟢 **Listos para Servir**: Platos terminados esperando que el cliente recoja.
  - ✅ **Entregados y Cobrados**.
- Cada pedido muestra la hora en que fue recibido y las horas de sus cambios de estado. Los pedidos anteriores conservan su estado; su historial empieza a registrarse con los cambios nuevos.
- Sonidos automáticos al cambiar de estado.

### 4. 💵 Cobro Rápido y Calculadora de Vuelto
- Soporta los métodos de pago más usados:
  - 💵 **Efectivo**: Botones de billetes rápidos (Exacto, S/ 10, S/ 20, S/ 50, S/ 100) y te **calcula el vuelto exacto en verde grande**.
  - 🟣 **Yape**: Confirmación rápida.
  - 🔵 **Plin**: Confirmación rápida.
  - 💳 **Tarjeta / POS**.

### 5. 📊 Control de Ingresos Diarios y Cierre de Caja
- **Métricas en tiempo real**: Total vendido, Efectivo en mano, Yape/Plin, Personas atendidas.
- **Gastos del día**: Anota hielo, bolsas/descartables, aceite, gas, etc.
- **Resultado del día**: Muestra `Cobros recibidos - Gastos registrados`. Los pedidos fiados se suman cuando se cobra cada abono.
- **📲 Enviar Cierre por WhatsApp**: Con 1 clic genera un reporte listo y bonito con emojis para enviártelo a tu WhatsApp personal.
- **📄 Descargar cierre PDF**: En **Caja**, elige la fecha y pulsa **Descargar cierre PDF**. Incluye resumen, cobros por método de pago, gastos, platos entregados, detalle de pagos y abonos, y una tabla de deudas pendientes con nombre, teléfono y saldo de cada cliente. El saldo corresponde al final de la fecha elegida. Se genera a partir de los datos ya guardados en la base; si hay cambios pendientes o un error de guardado, la aplicación pide esperar o resolverlo antes de descargar.
- **Cuentas abiertas**: En **Tomar Pedido**, escribe el nombre, agrega los productos y pulsa **Abrir cuenta para cobrar al retirarse**. En **Cuentas Abiertas** puedes agregar más consumos a la misma cuenta, ver el total acumulado y cobrar todo junto. Una cuenta abierta no figura como cobrada ni como deuda mientras el cliente sigue consumiendo; permanece visible aunque cambie la fecha.
- **Deudas y abonos**: En **Pedidos Activos**, marca el pedido como listo y elige **Entregar fiado**. Allí puedes escribir el nombre y teléfono del deudor aunque el pedido se haya creado como «Cliente al paso». En **Deudas** verás el saldo y podrás registrar pagos parciales o completos. El abono se cuenta en **Caja** el día en que recibes el dinero; el pedido fiado no figura como cobrado antes de eso. El PDF del cierre incluye los abonos y el saldo pendiente al final de la fecha elegida.

---

## 🗄️ Base de datos y despliegue

### Desarrollo local

`npm run dev` usa SQLite local en `database/antojitos.sqlite` (Node.js 22 o posterior). El esquema relacional está en `database/schema.sql`. Una instalación nueva empieza sin clientes, pedidos, gastos ni usuarios; la primera persona crea la administradora. Si este navegador ya tenía datos en `localStorage`, se importan en la primera apertura de una base vacía. Revisa que no sean datos de prueba antes de usarlos.

El servidor Node de producción se inicia con `npm run build` y `npm start`. Requiere `ANTOJITOS_ACCESS_PASSWORD` de al menos 16 caracteres y acepta `ANTOJITOS_ACCESS_USER` (por defecto `miriam`), `PORT`, `HOST` y `ANTOJITOS_DB_PATH`. Usa un disco persistente para el archivo SQLite y sirve el proceso detrás de HTTPS. La contraseña HTTP protege tanto la web como `/api/state`.

### Cloudflare gratuito (recomendado si ya usas Cloudflare)

Cloudflare Workers sirve la aplicación y Cloudflare D1 guarda su estado. Este modo usa `cloudflare/worker.js`, `cloudflare/migrations/0001_state.sql` y `wrangler.jsonc`. D1 guarda un documento con revisión atómica para impedir sobrescrituras entre dispositivos. El documento tiene un límite operativo de 1,8 MB; exporta respaldos periódicos y planifica pasar a almacenamiento por registros cuando el historial crezca. El SQLite local y D1 son alternativas de despliegue, no se sincronizan automáticamente.

1. En Cloudflare, crea una base D1 llamada `antojitos-miriam`: `npx wrangler d1 create antojitos-miriam`. Copia el `database_id` devuelto en `wrangler.jsonc`.
2. Ejecuta `npm run cloud:migrate` para crear la tabla remota.
3. Elige una protección de acceso:
   - **Sin tarjeta:** ejecuta `npx wrangler secret put ACCESS_PASSWORD` e introduce una contraseña única de al menos 16 caracteres. El usuario HTTP es `miriam`, salvo que configures `ACCESS_USER`. La contraseña protege la web y `/api/state` mediante HTTPS. Guárdala en un gestor de contraseñas y compártela únicamente con personas de plena confianza.
   - **Cloudflare Zero Trust Free:** Cloudflare solicita datos de pago para activar Zero Trust, aunque indica que el plan Free no se cobra. Protege **todo el Worker, producción y vistas previas**, con Cloudflare Access y permite solo correos de confianza. Configura `TEAM_DOMAIN` (por ejemplo `https://equipo.cloudflareaccess.com`) y `POLICY_AUD` (Audience tag) en el Worker. La API verifica el token de Access. Si configuras también `ACCESS_PASSWORD`, prevalece la contraseña HTTP.
4. Ejecuta `npm run cloud:deploy`. Comprueba que la web y `/api/state` solicitan acceso y que los cambios permanecen tras recargar.

El PIN dentro de la aplicación sirve para seleccionar la sesión y el rol en la interfaz. Las personas admitidas por la contraseña HTTP o por Cloudflare Access pueden acceder a la API completa, incluidos los PINs; concede ese acceso solo a personas de plena confianza. Para separar permisos de ayudantes de forma segura hace falta autenticación y autorización por usuario en el servidor.

Los cambios se guardan con revisión. Si otro dispositivo guardó primero, aparece un error y se necesita recargar antes de seguir. Usa **Configuración → Respaldo** para exportar un JSON de tus datos; conserva copias fuera del servidor. En SQLite también puedes copiar el archivo de base de datos con el servidor detenido. No se incluye en Git.
