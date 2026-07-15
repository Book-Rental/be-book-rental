import { describe, it, expect } from "vitest";
import { computeCartTotals } from "../src/utils/cartTotals"; // Adjust path to match your source file location

describe("Compute Cart Totals Utility", () => {

  it("should handle null or empty cart parameters gracefully and return base default calculations", () => {
    const result = computeCartTotals(null);

    // Fix: Tax is 0 because (0 + 0) * 0.05 = 0
    expect(result).toEqual({
      subtotal: 0,
      securityDepositTotal: 0,
      deliveryFee: 49,
      tax: 0, 
      total: 49, // 0 + 0 + 49 + 0 = 49
      items: []
    });
  });

  it("should continue loops safely when bookId/book context is undefined or missing", () => {
    const mockCart = {
      items: [
        { bookId: null, quantity: 2, pricingMode: "sale" }
      ]
    } as any;

    const result = computeCartTotals(mockCart);
    expect(result.items).toHaveLength(0);
    expect(result.subtotal).toBe(0);
  });

  it("should calculate totals for items using sale pricing mode with defaults", () => {
    const mockCart = {
      items: [
        {
          bookId: { _id: "book-1", purchasePrice: 500, securityDeposit: 100 },
          quantity: 2,
          pricingMode: "sale"
        },
        {
          bookId: { _id: "book-2" }, // Missing purchasePrice defaults to 0, missing quantity defaults to 1
          pricingMode: "sale"
        }
      ]
    } as any;

    const result = computeCartTotals(mockCart);

    expect(result.items).toHaveLength(2);
    expect(result.items[0].lineSubtotal).toBe(1000); // 500 * 2
    expect(result.items[0].securityDepositLine).toBe(0); // Sale mode does not add security deposits
    expect(result.items[1].lineSubtotal).toBe(0); // 0 * 1

    expect(result.subtotal).toBe(1000);
    expect(result.securityDepositTotal).toBe(0);
    expect(result.tax).toBe(50); // (1000 + 0) * 0.05
    expect(result.total).toBe(1099); // 1000 + 0 + 49 + 50
  });

  it("should verify all pricing paths in the rental switch block (day, week, month, and default handles)", () => {
    const mockCart = {
      items: [
        {
          bookId: { _id: "b-day", rentalPricePerDay: 50, securityDeposit: 200 },
          quantity: 1,
          pricingMode: "rent",
          rentalPeriod: "day"
        },
        {
          bookId: { _id: "b-week", rentalPricePerWeek: 200, securityDeposit: 300 },
          quantity: 1,
          pricingMode: "rent",
          rentalPeriod: "week"
        },
        {
          bookId: { _id: "b-month", rentalPricePerMonth: 600, securityDeposit: 500 },
          quantity: 2,
          pricingMode: "rent",
          rentalPeriod: "month"
        },
        {
          bookId: { _id: "b-invalid" },
          quantity: 1,
          pricingMode: "rent",
          rentalPeriod: "invalid-period" // Hits switch statement default block
        }
      ]
    } as any;

    const result = computeCartTotals(mockCart);

    expect(result.items).toHaveLength(4);
    
    // Day assertions
    expect(result.items[0].unitPrice).toBe(50);
    expect(result.items[0].securityDepositLine).toBe(200);

    // Week assertions
    expect(result.items[1].unitPrice).toBe(200);
    expect(result.items[1].securityDepositLine).toBe(300);

    // Month assertions
    expect(result.items[2].unitPrice).toBe(600);
    expect(result.items[2].lineSubtotal).toBe(1200); // 600 * 2
    expect(result.items[2].securityDepositLine).toBe(1000); // 500 * 2

    // Default block assertions
    expect(result.items[3].unitPrice).toBe(0);
    expect(result.items[3].securityDepositLine).toBe(0);

    // Overall aggregate logic calculations
    const expectedSubtotal = 50 + 200 + 1200 + 0; // 1450
    const expectedSecurityDeposit = 200 + 300 + 1000 + 0; // 1500
    const expectedTax = (expectedSubtotal + expectedSecurityDeposit) * 0.05; // (1450 + 1500) * 0.05 = 147.5

    expect(result.subtotal).toBe(expectedSubtotal);
    expect(result.securityDepositTotal).toBe(expectedSecurityDeposit);
    expect(result.tax).toBe(expectedTax);
    expect(result.total).toBe(expectedSubtotal + expectedSecurityDeposit + 49 + expectedTax);
  });
});
