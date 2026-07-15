import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

import { generateEmailVerificationToken, hashToken, buildPaginationQuery } from "../src/utils/appFunctions";
describe("Token and Pagination Utilities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateEmailVerificationToken", () => {
    it("should generate a 32-byte hex string verification token", () => {
      // 1. Spy directly onto the native module methods
      const randomBytesSpy = vi.spyOn(crypto, "randomBytes").mockReturnValueOnce({
        toString: vi.fn().mockReturnValueOnce("mocked-random-bytes-hex")
      } as any);

      const token = generateEmailVerificationToken();
      
      expect(randomBytesSpy).toHaveBeenCalledWith(32);
      expect(token).toBe("mocked-random-bytes-hex");
    });
  });

  describe("hashToken", () => {
    it("should create a SHA256 hex digest combining token and user email", () => {
      const mockDigest = vi.fn().mockReturnValueOnce("mocked-sha256-hash-hex");
      const mockUpdate = vi.fn().mockReturnValueOnce({ digest: mockDigest });
      
      // 2. Spy directly onto the native hash interface creator
      const createHashSpy = vi.spyOn(crypto, "createHash").mockReturnValueOnce({ 
        update: mockUpdate 
      } as any);

      const token = "my-secret-token";
      const email = "user@example.com";
      
      const hashedResult = hashToken(token, email);

      expect(createHashSpy).toHaveBeenCalledWith("sha256");
      expect(mockUpdate).toHaveBeenCalledWith(token + email);
      expect(hashedResult).toBe("mocked-sha256-hash-hex");
    });
  });

  describe("buildPaginationQuery", () => {
    it("should calculate valid skip, limit, and page when proper inputs are passed", () => {
      const queryParams = { page: "3", limit: "5" };
      const pagination = buildPaginationQuery(queryParams);

      expect(pagination).toEqual({
        page: 3,
        limit: 5,
        skip: 10,
      });
    });

    it("should fall back to default values when page and limit query params are missing", () => {
      const queryParams = {};
      const pagination = buildPaginationQuery(queryParams);

      expect(pagination).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
      });
    });

    it("should safely fall back to default values when inputs cannot be processed or parsed", () => {
      const pagination = buildPaginationQuery(null);

      expect(pagination).toEqual({
        page: 1,
        limit: 10,
        skip: 0,
      });
    });
  });
});
