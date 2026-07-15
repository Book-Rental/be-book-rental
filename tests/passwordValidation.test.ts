import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import bcrypt from "bcrypt";

// Import your source utility file
import { comparePasswords } from "../src/utils/passwordValidation"; // Adjust path to match your layout structure

describe("Password Validation Utility", () => {
  const plainPassword = "password123";
  const hashedPassword = "$2b$10$mockedhashedpasswordstring";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should return true when the plain text password matches the hashed string value", async () => {
    // Spy on the native bcrypt module method and force it to resolve to true
    const compareSpy = vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(true as never);

    const result = await comparePasswords(plainPassword, hashedPassword);

    expect(compareSpy).toHaveBeenCalledWith(plainPassword, hashedPassword);
    expect(result).toBe(true);
  });

  it("should return false when the passwords do not match", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare").mockResolvedValueOnce(false as never);

    const result = await comparePasswords(plainPassword, hashedPassword);

    expect(compareSpy).toHaveBeenCalledWith(plainPassword, hashedPassword);
    expect(result).toBe(false);
  });

  it("should log an error message and return the error object if bcrypt.compare throws an exception", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const mockError = new Error("Salt computation format mismatch error");
    
    // Force bcrypt.compare to reject with a runtime error
    vi.spyOn(bcrypt, "compare").mockRejectedValueOnce(mockError as never);

    const result = await comparePasswords(plainPassword, hashedPassword);

    // Verify it reached the catch block logs and returned the error
    expect(consoleErrorSpy).toHaveBeenCalledWith("Error comparing passwords:", mockError);
    expect(result).toBe(mockError);

    consoleErrorSpy.mockRestore();
  });
});
