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
1. **Desde la pantalla de Login**: Toca el botón **"Usuarios & PIN"** o **"+ Crear Usuario"**.
2. **Desde la barra superior**: Toca el ícono **"Usuarios"**.
3. **Funciones**:
   - **➕ Crear Nuevo Usuario**: Escribe su nombre (ej. *"Lucía Hija"*, *"Pedro Mozo"*), elige su rol (*Dueña / Admin* o *Ayudante*), asígnale un **PIN de 4 dígitos** y escoge un ícono.
   - **👁️ Ver u Ocultar PIN**: Toca el ojo para ver qué clave tiene cada ayudante.
   - **✏️ Editar o Cambiar Clave**: Modifica el PIN en cualquier momento.
   - **🗑️ Eliminar Usuario**: Elimina usuarios antiguos con total seguridad.

**PINs iniciales de fábrica:**
- 👩‍🍳 **Miriam (Dueña / Administradora)**: PIN `1234`
- 🧑‍🍳 **Ayudante / Mozo**: PIN `0000`

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
  - 🟡 **En Preparación**: Lo que está friéndose o sirviéndose con cronómetro (*"Hace 4 min"*).
  - 🟢 **Listos para Servir**: Platos terminados esperando que el cliente recoja.
  - ✅ **Entregados y Cobrados**.
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
- **Ganancia Neta Real**: Te muestra automáticamente `Ventas - Gastos = Ganancia Neta Real`.
- **📲 Enviar Cierre por WhatsApp**: Con 1 clic genera un reporte listo y bonito con emojis para enviártelo a tu WhatsApp personal.

---

## 🔒 Seguro y Sin Pérdida de Datos
- Todos tus pedidos, caseros registrados, usuarios, ingresos y compras se guardan automáticamente en la memoria local (`localStorage`). Aunque cierres el navegador, se te apague el celular o se vaya el internet, **tu dinero y tus cuentas nunca se pierden**.
