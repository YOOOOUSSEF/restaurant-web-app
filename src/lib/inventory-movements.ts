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
