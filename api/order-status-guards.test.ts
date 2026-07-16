import { describe, expect, it } from "vitest";
import { canUpdateOrderStatus, isDeletableOrderStatus, isTerminalOrderStatus } from "./order-status-guards";

describe("order status guards", () => {
  it("treats completed and cancelled as terminal states", () => {
    expect(isTerminalOrderStatus("completed")).toBe(true);
    expect(isTerminalOrderStatus("cancelled")).toBe(true);
    expect(isTerminalOrderStatus("delivered")).toBe(false);
    expect(isTerminalOrderStatus("ready")).toBe(false);
  });

  it("blocks any status change once an order is completed or cancelled", () => {
    expect(canUpdateOrderStatus("completed", "accepted")).toBe(false);
    expect(canUpdateOrderStatus("cancelled", "ready")).toBe(false);
    expect(canUpdateOrderStatus("delivered", "completed")).toBe(true);
    expect(canUpdateOrderStatus("ready", "cancelled")).toBe(true);
  });

  it("only allows deletion for completed and cancelled orders", () => {
    expect(isDeletableOrderStatus("completed")).toBe(true);
    expect(isDeletableOrderStatus("cancelled")).toBe(true);
    expect(isDeletableOrderStatus("delivered")).toBe(false);
    expect(isDeletableOrderStatus("ready")).toBe(false);
  });
});
