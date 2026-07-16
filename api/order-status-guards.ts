const TERMINAL_STATUSES = new Set(["completed", "cancelled"]);
const DELETABLE_STATUSES = new Set(["completed", "cancelled"]);

export function isTerminalOrderStatus(status: string | null | undefined): boolean {
  return status != null && TERMINAL_STATUSES.has(status.toLowerCase());
}

export function canUpdateOrderStatus(currentStatus: string | null | undefined, nextStatus: string | null | undefined): boolean {
  const normalizedCurrent = currentStatus?.toLowerCase();
  const normalizedNext = nextStatus?.toLowerCase();

  if (!normalizedCurrent || !normalizedNext) {
    return false;
  }

  if (isTerminalOrderStatus(normalizedCurrent)) {
    return false;
  }

  return true;
}

export function isDeletableOrderStatus(status: string | null | undefined): boolean {
  return status != null && DELETABLE_STATUSES.has(status.toLowerCase());
}
