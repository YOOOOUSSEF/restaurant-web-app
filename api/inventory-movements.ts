export interface InventoryMovementLabelContext {
  inventoryItemName?: string | null;
  inventoryItemNameAr?: string | null;
  inventoryItemCode?: string | null;
}

export function resolveInventoryMovementItemName(
  context: InventoryMovementLabelContext | null | undefined,
  lang: "en" | "ar" = "en"
): string {
  if (!context) return "-";

  const name = lang === "ar"
    ? (context.inventoryItemNameAr || context.inventoryItemName || context.inventoryItemCode || "-")
    : (context.inventoryItemName || context.inventoryItemNameAr || context.inventoryItemCode || "-");

  return name || "-";
}

export function calculateMovementStockDelta(params: {
  previousQuantity: number | string;
  previousMovementType: string;
  nextQuantity: number | string;
  nextMovementType: string;
}): number {
  const previousAmount = params.previousMovementType === "in"
    ? Number(params.previousQuantity || 0)
    : -Number(params.previousQuantity || 0);
  const nextAmount = params.nextMovementType === "in"
    ? Number(params.nextQuantity || 0)
    : -Number(params.nextQuantity || 0);

  return nextAmount - previousAmount;
}
