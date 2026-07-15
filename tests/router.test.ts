import { describe, expect, it } from "vitest";
import router from "../src/router";

describe("Router", () => {
  it("should be defined", () => {
    expect(router).toBeDefined();
  });

  it("should have middleware stack", () => {
    expect(router.stack.length).toBeGreaterThan(0);
  });
});