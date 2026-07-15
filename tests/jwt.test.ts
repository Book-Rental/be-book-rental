import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import jwt from "jsonwebtoken";

// Import your source utility file
import { generateToken, verifyToken } from "../src/utils/jwt"; // Adjust path to match your layout structure

describe("JWT Utility Functions", () => {
  const mockUser = { _id: "user-123", email: "test@example.com" };
  const mockToken = "mocked.jwt.token";

  beforeEach(() => {
    vi.clearAllMocks();
    // Stub environment variables required by the code
    vi.stubEnv("JWT_SECRET", "supersecretkey");
    vi.stubEnv("JWT_EXPIRES_IN", "1d");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  describe("generateToken", () => {
    it("should successfully sign and return a JWT token with accurate parameters", async () => {
      const signSpy = vi.spyOn(jwt, "sign").mockImplementation((...args: any[]) => {
        // args may be (payload, secret, options) or (payload, secret, options, callback)
        const callback = args[3];
        if (typeof callback === "function") return callback(null, mockToken);
        return mockToken as any;
      });

      const token = await generateToken(mockUser);

      expect(signSpy).toHaveBeenCalledWith(
        { id: mockUser._id, email: mockUser.email },
        "supersecretkey",
        { algorithm: "HS256", expiresIn: "1d" }
      );
      expect(token).toBe(mockToken);
    });
  });

  describe("verifyToken", () => {
    it("should decode and return token details without active validation when ENABLEJWT is false", async () => {
      vi.stubEnv("ENABLEJWT", "false");
      const expectedPayload = { id: "user-123", email: "test@example.com", iat: 12345 };

      const decodeSpy = vi.spyOn(jwt, "decode").mockReturnValueOnce(expectedPayload);
      const verifySpy = vi.spyOn(jwt, "verify");

      const result = await verifyToken(mockToken);

      expect(decodeSpy).toHaveBeenCalledWith(mockToken);
      expect(verifySpy).not.toHaveBeenCalled();
      expect(result).toEqual(expectedPayload);
    });

    it("should execute active validation checks and verify signatures when ENABLEJWT is true", async () => {
      vi.stubEnv("ENABLEJWT", "true");
      const expectedPayload = { id: "user-123", email: "test@example.com", iat: 12345 };

      const decodeSpy = vi.spyOn(jwt, "decode").mockReturnValueOnce(expectedPayload);
      const verifySpy = vi.spyOn(jwt, "verify").mockImplementation((...args: any[]) => {
        const callback = args[2];
        if (typeof callback === "function") return callback(null, expectedPayload);
        return expectedPayload as any;
      });

      const result = await verifyToken(mockToken);

      expect(decodeSpy).toHaveBeenCalledWith(mockToken);
      expect(verifySpy).toHaveBeenCalledWith(mockToken, "supersecretkey");
      expect(result).toEqual(expectedPayload);
    });

    it("should bubble up verification exceptions if jwt.verify rejects or throws an error", async () => {
      vi.stubEnv("ENABLEJWT", "true");
      const mockError = new Error("TokenExpiredError");

      vi.spyOn(jwt, "decode").mockReturnValueOnce({});
      vi.spyOn(jwt, "verify").mockImplementation(() => {
        throw mockError;
      });

      await expect(verifyToken(mockToken)).rejects.toThrow("TokenExpiredError");
    });
  });
});
