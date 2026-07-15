import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const listen = vi.fn((port, cb) => {
  if (cb) cb();
});

vi.mock("http", () => ({
  default: {
    createServer: () => ({
      listen,
    }),
  },
}));

const connectDatabase = vi.fn();

vi.mock("../src/config/db", () => ({
  default: connectDatabase,
}));

vi.mock("../src/app", () => ({
  default: {},
}));

// Create a direct mock instance variable for the mongoose close method
const mockMongooseClose = vi.fn();

vi.mock("mongoose", () => ({
  default: {
    connection: {
      close: () => mockMongooseClose(),
    },
  },
  connection: {
    close: () => mockMongooseClose(),
  },
}));

describe("Server", () => {
  let originalEnv: string | undefined;
  let originalExit: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    originalEnv = process.env.NODE_ENV;
    originalExit = process.exit;
    process.exit = vi.fn() as any; 
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    process.exit = originalExit;
  });

  it("should start server on startServer invocation", async () => {
    connectDatabase.mockResolvedValue(undefined);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const serverModule = await import("../src/server");
    await serverModule.startServer();

    expect(connectDatabase).toHaveBeenCalled();
    expect(listen).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("Server running on port"));
    consoleSpy.mockRestore();
  });

  it("should catch database connection error and terminate with exit code 1", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mockError = new Error("Database Connection Failed");
    connectDatabase.mockRejectedValueOnce(mockError);

    const serverModule = await import("../src/server");
    await serverModule.startServer();

    expect(consoleSpy).toHaveBeenCalledWith("err", mockError);
    expect(process.exit).toHaveBeenCalledWith(1);
    consoleSpy.mockRestore();
  });

  it("should execute startServer immediately if process environmental NODE_ENV is not test", async () => {
    process.env.NODE_ENV = "production"; 
    connectDatabase.mockResolvedValue(undefined);

    await import("../src/server");

    expect(connectDatabase).toHaveBeenCalled();
    expect(listen).toHaveBeenCalled();
  });

  it("should handle process SIGINT signal event and close the active Mongoose cluster connection", async () => {
    const processOnSpy = vi.spyOn(process, "on");
    mockMongooseClose.mockResolvedValueOnce(true);
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    await import("../src/server");

    // Extract the SIGINT callback registered to process.on
    const sigintCall = processOnSpy.mock.calls.find(call => call[0] === "SIGINT");
    expect(sigintCall).toBeDefined();
    
    const sigintCallback = sigintCall![1] as Function;
    await sigintCallback(); 

    expect(mockMongooseClose).toHaveBeenCalled();
    expect(consoleSpy).toHaveBeenCalledWith("MongoDB connection closed");
    expect(process.exit).toHaveBeenCalledWith(0);

    consoleSpy.mockRestore();
    processOnSpy.mockRestore();
  });

  it("should handle error inside the process SIGINT callback when mongoose.connection.close rejects", async () => {
    const processOnSpy = vi.spyOn(process, "on");
    const mockCloseError = new Error("Mongoose Close Socket Error");
    
    // Safely assign rejection directly to our global variable tracker hook
    mockMongooseClose.mockRejectedValueOnce(mockCloseError);
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../src/server");

    const sigintCall = processOnSpy.mock.calls.find(call => call[0] === "SIGINT");
    const sigintCallback = sigintCall![1] as Function;
    await sigintCallback();

    expect(consoleErrorSpy).toHaveBeenCalledWith("Error closing MongoDB connection:", mockCloseError);
    expect(process.exit).toHaveBeenCalledWith(1);

    consoleErrorSpy.mockRestore();
    processOnSpy.mockRestore();
  });
});
