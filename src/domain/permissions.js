// What a helper may do. The admin can do everything; each helper has these switches,
// and a switch she never touched keeps its default (what helpers could always do).
export const PERMISSIONS = [
  { key: 'cobrar', label: 'Cobrar pedidos y recibir abonos', default: true },
  { key: 'fiar', label: 'Entregar pedidos fiados', default: true },
  { key: 'verCaja', label: 'Ver la caja y los reportes', default: true },
  { key: 'cerrarCaja', label: 'Cerrar la caja del día', default: true },
  { key: 'gastos', label: 'Anotar y borrar gastos', default: true },
  { key: 'carta', label: 'Cambiar la carta, las cremas y lo agotado', default: true },
  { key: 'cambiarCierre', label: 'Reabrir o corregir un cierre de caja', default: false }
];

const KEYS = new Set(PERMISSIONS.map(permission => permission.key));

export const can = (user, key) => {
  if (!user) return false;
  if (user.role === 'admin') return true;
  const permission = PERMISSIONS.find(item => item.key === key);
  if (!permission) return false;
  return typeof user.permissions?.[key] === 'boolean' ? user.permissions[key] : permission.default;
};

export const validPermissions = permissions => permissions === undefined || (
  permissions && typeof permissions === 'object' && !Array.isArray(permissions) &&
  Object.entries(permissions).every(([key, value]) => KEYS.has(key) && typeof value === 'boolean')
);

const paymentCount = order => (order?.debtPayments || []).length;

// The permission an order change needs, or null: taking money or giving credit.
export function orderPermissionNeeded(before, after) {
  if (after.debt && !before?.debt) return 'fiar';
  if ((after.payment && !before?.payment) || paymentCount(after) > paymentCount(before)) return 'cobrar';
  return null;
}
