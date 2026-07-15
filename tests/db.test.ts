import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("mongoose", () => {
  return {
    default: {
      connect: vi.fn(),
      connection: {
        close: vi.fn(),
        on: vi.fn((event: string, callback: Function) => {
          // Initialize dynamically inline to avoid any hoisting race conditions
          (globalThis as any).__mockRegisteredCallbacks ||= {};
          (globalThis as any).__mockRegisteredCallbacks[event] = callback;
        }),
      },
    },
  };
});

// Import modules safely after the mocked module evaluation step
import mongoose from "mongoose";
import connectDatabase from "../src/config/db";

describe("Database", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.MONGO_URL = "mongodb://localhost:27017/";
    process.env.DATABASE = "bookRent";
  });

  it("should close previous connection", async () => {
    vi.mocked(mongoose.connection.close).mockResolvedValue(undefined);
    vi.mocked(mongoose.connect).mockResolvedValue(mongoose as any);

    await connectDatabase();

    expect(mongoose.connection.close).toHaveBeenCalledOnce();
  });

  it("should connect mongodb", async () => {
    vi.mocked(mongoose.connection.close).mockResolvedValue(undefined);
    vi.mocked(mongoose.connect).mockResolvedValue(mongoose as any);

    await connectDatabase();

    expect(mongoose.connect).toHaveBeenCalledOnce();
  });

  it("should throw db error", async () => {
    vi.mocked(mongoose.connection.close).mockResolvedValue(undefined);
    vi.mocked(mongoose.connect).mockRejectedValue(new Error("DB Error"));

    await expect(connectDatabase()).rejects.toThrow("DB Error");
  });

  // 🎯 COVERS LINES 24, 28, and 32: Validates operational connection log callbacks
  it("should log appropriate messages on mongoose connection lifecycle events", () => {
    const consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const callbacks = (globalThis as any).__mockRegisteredCallbacks || {};

    // Validate that the callbacks are attached safely
    expect(callbacks["connected"]).toBeDefined();
    expect(callbacks["disconnected"]).toBeDefined();
    expect(callbacks["error"]).toBeDefined();

    // Trigger 'connected' (Line 24)
    callbacks["connected"]();
    expect(consoleLogSpy).toHaveBeenCalledWith("Mongoose connected to MongoDB");

    // Trigger 'disconnected' (Line 28)
    callbacks["disconnected"]();
    expect(consoleLogSpy).toHaveBeenCalledWith("Mongoose disconnected");

    // Trigger 'error' (Line 32)
    const mockError = new Error("Mock Network Interruption");
    callbacks["error"](mockError);
    expect(consoleLogSpy).toHaveBeenCalledWith("Error in MongoDB connection:", mockError);

    consoleLogSpy.mockRestore();
  });
});
