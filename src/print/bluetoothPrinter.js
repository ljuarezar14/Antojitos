// Prints on a Bluetooth (BLE) thermal printer through Web Bluetooth, available in Chrome
// on Android and on computers (not on iPhone). The first time, the phone shows the list of
// nearby printers; Chrome then remembers the permission.

// Services used by the usual cheap 58/80 mm printers.
const PRINTER_SERVICES = [
  0x18f0, 0xff00, 0xffe0, 0xfee7,
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455'
];
const CHUNK = 100;

let connected = null;

export const bluetoothAvailable = () => typeof navigator !== 'undefined' && Boolean(navigator.bluetooth);

async function findWritable(server) {
  for (const service of await server.getPrimaryServices()) {
    for (const characteristic of await service.getCharacteristics()) {
      if (characteristic.properties.write || characteristic.properties.writeWithoutResponse) return characteristic;
    }
  }
  throw new Error('Esa impresora no acepta datos por Bluetooth. Prueba con otra o usa "Imprimir".');
}

async function connect(choose) {
  if (connected?.device.gatt.connected) return connected.characteristic;
  let device = connected?.device;
  if (!device && !choose && navigator.bluetooth.getDevices) {
    [device] = await navigator.bluetooth.getDevices();
  }
  if (!device) {
    device = await navigator.bluetooth.requestDevice({ acceptAllDevices: true, optionalServices: PRINTER_SERVICES });
  }
  const server = await device.gatt.connect();
  const characteristic = await findWritable(server);
  connected = { device, characteristic };
  return characteristic;
}

// choose: show the printer list even if one was used before.
export async function printBytes(bytes, { choose = false } = {}) {
  if (!bluetoothAvailable()) throw new Error('Este navegador no puede usar Bluetooth. Usa Chrome en Android.');
  try {
    const characteristic = await connect(choose);
    for (let start = 0; start < bytes.length; start += CHUNK) {
      const part = bytes.slice(start, start + CHUNK);
      if (characteristic.properties.writeWithoutResponse) await characteristic.writeValueWithoutResponse(part);
      else await characteristic.writeValue(part);
    }
  } catch (error) {
    connected = null;
    if (error.name === 'NotFoundError') throw new Error('No se eligió ninguna impresora.');
    throw error;
  }
}
