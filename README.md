# 🍔 Antojitos con Miriam - App Web de Pedidos, Clientes y Caja Diaria

¡Bienvenida, Miriam! Esta aplicación web fue creada pensando 100% en el ritmo y las necesidades reales de tu carretilla **Antojitos con Miriam** (atendiendo viernes y sábado con hamburguesas, pollo broaster, salchipapas, aguaditos, alitas acevichadas y más).

---

## 🚀 ¿Cómo abrir la aplicación?

1. Abre en el celular la dirección de la app en Cloudflare (la misma que usas hoy) e ingresa con Cloudflare Access.
2. Elige tu nombre y escribe tu **PIN de 4 números**.
3. **Instálala**: en Chrome toca los 3 puntitos → **Agregar a la pantalla principal**. Queda como una app con el logo.
4. **Sin señal**: si ya ingresaste una vez con señal, la app abre igual y guarda los pedidos en el celular. Se envían solos al volver la señal. Un pedido tomado sin señal muestra **"N.º provisional"**: su número final lo da el servidor al conectarse.
5. **Versión nueva**: cuando se publica una actualización aparece arriba el aviso **"Hay una versión nueva"**. Toca **Actualizar**; los cambios sin enviar no se pierden.

---

## 🎨 Logotipo Oficial y Temas (Claro / Oscuro)

- **Logotipo Oficial**: Integrado en alta resolución tanto en la pantalla de inicio (Login), la barra superior y el ticket de venta digital.
- **Modo Claro (Día ☀️)**: Fondo iluminado con tonos crema y barra dorada brillante, pensado para cuando revisas cuentas o compras bajo la luz del día.
- **Modo Oscuro (Noche 🌙)**: Fondo carbón profundo (`#141417`) con acentos dorados que coinciden exactamente con tu afiche publicitario, perfecto para no cansar la vista en la noche de carretilla y ahorrar batería de tu celular.
- **Cambio con 1 clic**: Toca el botón de **Sol / Luna** en la esquina superior para transformar la apariencia de inmediato.

---

## 👥 Usuarios, PIN y permisos

1. Ingresa como administradora.
2. Abre **Admin → Usuarios**.
3. **Crear usuario**: nombre, rol (*Administradora* o *Ayudante*), PIN de 4 números e ícono.
4. **Cambiar PIN**: edita al usuario y escribe el nuevo PIN. Los PIN se guardan cifrados en el servidor: nadie puede verlos, ni la administradora. Si alguien lo olvida, ponle uno nuevo.

Después de 5 PIN incorrectos, ese usuario queda bloqueado 5 minutos.

**Permisos de cada ayudante:** al crear o editar a una ayudante, la administradora marca qué puede hacer. Lo que no tiene marcado no le aparece en la pantalla, y el servidor tampoco lo acepta aunque lo intente. El cambio vale al instante y queda en el historial.

| Permiso | Al crear una ayudante |
|---|---|
| Cobrar pedidos y recibir abonos | ✅ marcado |
| Entregar pedidos fiados | ✅ marcado |
| Ver la caja y los reportes | ✅ marcado |
| Cerrar la caja del día | ✅ marcado |
| Anotar y borrar gastos | ✅ marcado |
| Cambiar la carta, las cremas y lo agotado | ✅ marcado |
| Reabrir o corregir un cierre de caja | ❌ sin marcar |

Toda ayudante puede siempre tomar, preparar y cancelar pedidos (los cancelados siguen visibles) y registrar caseros. Solo la administradora puede **eliminar** pedidos y manejar usuarios, categorías, ajustes, QR, logo, respaldos e historial.

"Ver la caja" oculta la pestaña Caja y los reportes; los pedidos de cada día se siguen viendo en Pedidos.

Una base de datos nueva empieza sin usuarios: la primera persona crea la administradora. Siempre debe quedar al menos una administradora.

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
- **🔒 Cerrar caja**: al final del día cuenta el efectivo y escríbelo en **Cerrar caja**. La app muestra el efectivo esperado (fondo inicial + cobros en efectivo − gastos) y si **cuadra**, **sobra** o **falta**. El cierre queda guardado con quién lo hizo y a qué hora. Si después alguien cambia un pedido o un gasto de ese día, el cierre avisa que los totales cambiaron. Solo la administradora puede reabrir una caja cerrada.
- **Cuentas abiertas**: En **Tomar Pedido**, escribe el nombre, agrega los productos y pulsa **Abrir cuenta para cobrar al retirarse**. En **Cuentas Abiertas** puedes agregar más consumos a la misma cuenta, ver el total acumulado y cobrar todo junto. Una cuenta abierta no figura como cobrada ni como deuda mientras el cliente sigue consumiendo; permanece visible aunque cambie la fecha. Si el cliente se va sin pagar, **Dejar fiado** pasa la cuenta a **Deudas** con su nombre, aunque el pedido aún no esté listo.
- **Ticket por WhatsApp**: en **Ver Ticket**, **WhatsApp** envía el ticket como texto (directo al chat si el pedido tiene teléfono) e **Imagen** lo comparte como foto con el logo: se abre el menú Compartir del celular para elegir WhatsApp y el contacto. En una computadora la imagen se descarga para adjuntarla.
- **Deudas y abonos**: En **Pedidos Activos**, marca el pedido como listo y elige **Entregar fiado**. Allí puedes escribir el nombre y teléfono del deudor aunque el pedido se haya creado como «Cliente al paso». En **Deudas** verás el saldo y podrás registrar pagos parciales o completos. El abono se cuenta en **Caja** el día en que recibes el dinero; el pedido fiado no figura como cobrado antes de eso. El PDF del cierre incluye los abonos y el saldo pendiente al final de la fecha elegida.

### 6. 🕵️ Historial de cambios (Admin → Historial)
- Muestra, día por día, **quién** tomó, cobró, fió, canceló o eliminó cada pedido, quién registró o borró un gasto, cambió un precio, cerró la caja, ingresó con su PIN o restauró un respaldo.
- El servidor lo anota con el usuario que tenía la sesión abierta, así que no se puede falsear desde un celular. Se guarda 6 meses.
- Sirve para aclarar una diferencia de caja: filtra **Pedidos y caja** y revisa ese día.

### 7. 🤝 Deudas por cliente
- Cada persona que debe tiene **una tarjeta con su saldo total** y debajo el detalle de cada pedido fiado (platos, cremas, nota, quién lo tomó y los abonos).
- **Un abono para todo**: escribe lo que te paga y la app lo reparte pagando primero la deuda más antigua; antes de registrar te muestra cómo lo aplicará.
- **Recordar por WhatsApp**: abre un mensaje listo con el saldo, los platos y tu número de Yape. Si guardaste su teléfono, va directo a su chat.
- **Buscador** por nombre o teléfono (no importan mayúsculas ni tildes).

### 8. 📈 Reportes por semana y mes (Caja → Semana / Mes)
- Cobros (comparados con el periodo anterior), gastos, ganancia, pedidos y ticket promedio.
- Cobros por día y mejor día, platos más vendidos, cómo pagaron, qué días de la semana venden más, cuánto se fió y cuánto se recuperó.
- Con las flechas vas a semanas o meses anteriores; **Enviar reporte por WhatsApp** comparte el resumen.

### 9. ⚡ Atajos al tomar pedidos
- **Repetir su último pedido**: al elegir un casero aparece su último pedido; un toque lo agrega con las mismas cremas y el precio de hoy. Lo agotado no se agrega y se avisa.
- **Marcar agotado / Volver a activar**: debajo de cada plato, sin entrar a Carta.


---

## 💾 Respaldos (Admin → Respaldo)

- **Automáticos**: cada madrugada (3:00 a. m.) el servidor guarda una copia completa (pedidos, carta, caseros, gastos, cierres, usuarios con sus PIN cifrados, QR y logo). Se conservan 90 días.
- **Crear respaldo ahora**: haz uno antes de cualquier cambio grande.
- **Descargar respaldo**: baja un archivo `.json`. Guarda copias fuera del celular (correo, Drive).
- **Restaurar**: desde un archivo o directamente desde un respaldo automático de la lista. **Reemplaza todos los datos actuales.** Se envía por partes, así funciona aunque haya años de pedidos. No cierres la app mientras termina; si se corta, vuelve a restaurar el mismo respaldo.
- Si el último respaldo automático tiene más de 2 días, la pantalla muestra un aviso en rojo.

---

## 🗄️ Para el técnico: arquitectura y despliegue

**Producción: Cloudflare.** Un Worker (`cloudflare/worker.js`) sirve la app (`dist/`) y la API `/api/*`. Los datos están en **D1** y los respaldos en **Workers KV**. Cloudflare Access protege todo (`TEAM_DOMAIN` y `POLICY_AUD` en `wrangler.jsonc`); como alternativa, el secreto `ACCESS_PASSWORD` activa la contraseña HTTP.

| Pieza | Dónde |
|---|---|
| Rutas de la API | `cloudflare/api.js` |
| PIN, sesiones (cookie HttpOnly, 30 días) y bloqueo | `cloudflare/auth.js` |
| Pedidos: uno por fila, número del día asignado por el servidor | `cloudflare/ordersApi.js` |
| Caseros, carta, cremas, categorías, gastos, ajustes, usuarios y cierres: un registro por fila | `cloudflare/dataApi.js` |
| Historial de cambios | `cloudflare/audit.js` |
| Respaldos en KV y cron nocturno | `cloudflare/backup.js`, `scheduled` en `worker.js` |
| Migraciones de D1 | `cloudflare/migrations/` |
| Sincronización en el celular (cola de cambios, sin señal, conflictos) | `src/sync/useSyncedCollection.js` |
| Funcionamiento sin señal (service worker) | `sw/service-worker.js` |

Cada cambio se guarda registro por registro con control de versión: si dos celulares editan el mismo pedido, el segundo recibe la versión nueva y se le pide repetir su cambio, sin pisar el del otro. Cada celular guarda los últimos 60 días de pedidos (más deudas, cuentas abiertas y pedidos en curso); los días anteriores se piden al servidor al consultarlos.

**Desplegar una versión nueva:**

```bash
npm test                                  # pruebas del servidor y de la lógica
npm run test:e2e                          # pruebas de pantallas en Chrome (opcional, ~1 min)
npx wrangler d1 export antojitos-miriam --remote --output respaldo.sql   # copia previa
npm run cloud:migrate                     # aplica migraciones nuevas, si las hay
npm run cloud:deploy                      # compila y publica
```

**Revisar errores:** en el panel de Cloudflare, Workers → `antojitos-miriam` → **Logs** (Workers Logs está activado en `wrangler.jsonc`). Ahí aparecen los errores de la API y el resultado del respaldo nocturno. Un fallo del respaldo también queda en Admin → Historial.

**Ver los respaldos guardados:** `npx wrangler kv key list --namespace-id cd3ec967f0c54edd8e455f0b0c958bf4 --remote`.

**Desarrollo local:** `npm run dev` levanta la app con la misma API sobre SQLite local (`database/antojitos.sqlite`, Node.js 22 o posterior) y guarda los respaldos en `database/backups/`. `npm start` sirve la versión compilada con Node; requiere `ANTOJITOS_ACCESS_PASSWORD` (16 caracteres o más). El SQLite local y D1 no se sincronizan entre sí.

**Pruebas de pantallas:** `npm run test:e2e` compila la app, crea una base local vacía, levanta el Worker con `wrangler dev` y usa Chrome en tamaño celular: crea la administradora, cobra, fía y salda una deuda, cierra la caja, revisa el reporte, prueba a una ayudante y sus permisos, el modo sin señal, el historial, repetir pedido y agotado. Usa el Chrome instalado; si está en otra ruta, define `CHROME_PATH`.
