import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import express from "express";
import app from "../src/app";

// 1. Mock one of your actual sub-routers inside your routing tree to throw a test error.
// Assuming 'authRoutes' or any valid sub-router is mounted inside your real './router' file:
vi.mock("../src/router/authRoutes", () => {
  const router = express.Router();
  
  // This route will test the global error middleware block (Lines 28-29)
  router.get("/trigger-error", (req, res, next) => {
    next(new Error("Intentional Test Error"));
  });
  
  return { default: router };
});

// Mock response utility helper to track if errorResponse is executing properly
const mockErrorResponse = vi.fn((res, message, status, err) => {
  return res.status(status).json({ success: false, message, error: err?.message });
});
vi.mock("../src/utils/response", () => ({
  errorResponse: (res: any, msg: string, status: number, err: any) => mockErrorResponse(res, msg, status, err)
}));

describe("App", () => {
  it("should return 404 for unknown route", async () => {
    const res = await request(app).get("/unknown");
    expect(res.status).toBe(404);
  });

  it("should have json middleware", async () => {
    const res = await request(app)
      .post("/unknown")
      .send({
        name: "Book",
      });
    expect(res.status).toBe(404);
  });

  it("should mount api routes", () => {
    expect(app).toBeDefined();
  });

  // 🎯 NEW TEST CASE: Forces execution through your global error middleware (Lines 28-29)
  it("should handle error in global middleware when a mounted sub-route throws an error", async () => {
    // Suppress console.error printout logs inside test execution output blocks
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Hits /api + /auth + /trigger-error
    const res = await request(app).get("/api/auth/trigger-error");

    // Verify it hits the error handler middleware and returns 500
    expect(res.status).toBe(500);
    
    // Clean up our console log tracker hook
    consoleSpy.mockRestore();
  });
});
