import { describe, expect, it } from "vitest";
import { calculateMovementStockDelta, resolveInventoryMovementItemName } from "./inventory-movements";

describe("inventory movement labels", () => {
  it("prefers the English item name while falling back to Arabic or code", () => {
    expect(resolveInventoryMovementItemName({ inventoryItemName: "Beef", inventoryItemNameAr: "لحم", inventoryItemCode: "INV001" }, "en")).toBe("Beef");
    expect(resolveInventoryMovementItemName({ inventoryItemNameAr: "جبنة", inventoryItemCode: "INV005" }, "ar")).toBe("جبنة");
    expect(resolveInventoryMovementItemName({ inventoryItemCode: "INV010" }, "en")).toBe("INV010");
  });

  it("calculates the inventory stock delta for movement edits", () => {
    expect(calculateMovementStockDelta({ previousQuantity: "2", previousMovementType: "in", nextQuantity: "3", nextMovementType: "in" })).toBe(1);
    expect(calculateMovementStockDelta({ previousQuantity: "2", previousMovementType: "out", nextQuantity: "4", nextMovementType: "in" })).toBe(6);
    expect(calculateMovementStockDelta({ previousQuantity: "2", previousMovementType: "in", nextQuantity: "1", nextMovementType: "out" })).toBe(-3);
  });
});
