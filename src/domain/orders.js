// An order made without signal has a number guessed on this device; the server gives the
// final one when it arrives (it can change if another device took that number meanwhile).
export const isProvisional = order => order?._seq == null;

export const orderNumberText = order => `#${order?.orderNumber ?? '?'}${isProvisional(order) ? ' (provisional)' : ''}`;
