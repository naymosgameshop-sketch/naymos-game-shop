import { describe, expect, it } from "vitest";
import { addToCart, normalizeCartItems } from "@/lib/orders/cart";

const a = { productId: "a", gameId: "g", quantity: 1, playerData: { uid: "111" } };
const b = { productId: "b", gameId: "g", quantity: 3, playerData: { uid: "222" } };

describe("multi-item cart", () => {
  it("merges same product and player data", () => {
    expect(normalizeCartItems([a, { ...a, quantity: 2 }])).toEqual([{ ...a, quantity: 3 }]);
  });
  it("keeps different player data separate", () => {
    expect(normalizeCartItems([a, { ...a, quantity: 3, playerData: { uid: "222" } }])).toHaveLength(2);
  });
  it("keeps different products as separate items", () => {
    expect(addToCart([a], b)).toHaveLength(2);
  });
});
