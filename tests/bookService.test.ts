import { beforeEach, describe, expect, it, vi } from "vitest";

// ----------------------
// Mock Book Model
// ----------------------
vi.mock("../src/models/Book", () => {
  const MockBook: any = {
    create: vi.fn(),
    findById: vi.fn(),
    findByIdAndUpdate: vi.fn(),
    findByIdAndDelete: vi.fn(),
  };

  return {
    default: MockBook,
  };
});

import Book from "../src/models/Book";

import {
  createBookService,
  getBookByIdService,
  updateBookByIdService,
  deleteBookByIdService,
} from "../src/services/bookService";

describe("Book Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createBookService()", () => {
    it("should create book successfully", async () => {
      const payload = {
        name: "Atomic Habits",
        author: "James Clear",
      };

      (Book.create as any).mockResolvedValue({
        _id: "book123",
        ...payload,
      });

      const result = await createBookService(payload);

      expect(Book.create).toHaveBeenCalledTimes(1);

      expect(Book.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Atomic Habits",
          author: "James Clear",
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          _id: "book123",
          name: "Atomic Habits",
          author: "James Clear",
        })
      );
    });

    it("should throw when create fails", async () => {
      (Book.create as any).mockRejectedValue(
        new Error("Create Error")
      );

      await expect(
        createBookService({
          name: "Book",
        })
      ).rejects.toThrow("Create Error");
    });
  });

  describe("getBookByIdService()", () => {
    it("should return book", async () => {
      (Book.findById as any).mockResolvedValue({
        _id: "book123",
        name: "Atomic Habits",
      });

      const result = await getBookByIdService("book123");

      expect(Book.findById).toHaveBeenCalledWith("book123");

      expect(result).toEqual({
        _id: "book123",
        name: "Atomic Habits",
      });
    });

    it("should return null when book not found", async () => {
      (Book.findById as any).mockResolvedValue(null);

      const result = await getBookByIdService("book123");

      expect(result).toBeNull();
    });

    it("should throw when findById fails", async () => {
      (Book.findById as any).mockRejectedValue(
        new Error("DB Error")
      );

      await expect(
        getBookByIdService("book123")
      ).rejects.toThrow("DB Error");
    });
  });

  describe("updateBookByIdService()", () => {
    it("should update book successfully", async () => {
      (Book.findByIdAndUpdate as any).mockResolvedValue({
        _id: "book123",
        name: "Updated Book",
      });

      const result = await updateBookByIdService("book123", {
        name: "Updated Book",
      });

      expect(Book.findByIdAndUpdate).toHaveBeenCalledWith(
        "book123",
        {
          name: "Updated Book",
        },
        {
          new: true,
        }
      );

      expect(result).toEqual({
        _id: "book123",
        name: "Updated Book",
      });
    });

    it("should return null when book not found", async () => {
      (Book.findByIdAndUpdate as any).mockResolvedValue(null);

      const result = await updateBookByIdService("book123", {});

      expect(result).toBeNull();
    });

    it("should throw when update fails", async () => {
      (Book.findByIdAndUpdate as any).mockRejectedValue(
        new Error("Update Error")
      );

      await expect(
        updateBookByIdService("book123", {})
      ).rejects.toThrow("Update Error");
    });
  });

  describe("deleteBookByIdService()", () => {
    it("should delete book", async () => {
      (Book.findByIdAndDelete as any).mockResolvedValue({
        _id: "book123",
      });

      const result = await deleteBookByIdService("book123");

      expect(Book.findByIdAndDelete).toHaveBeenCalledWith(
        "book123"
      );

      expect(result).toEqual({
        _id: "book123",
      });
    });

    it("should return null when book not found", async () => {
      (Book.findByIdAndDelete as any).mockResolvedValue(null);

      const result = await deleteBookByIdService("book123");

      expect(result).toBeNull();
    });

    it("should throw when delete fails", async () => {
      (Book.findByIdAndDelete as any).mockRejectedValue(
        new Error("Delete Error")
      );

      await expect(
        deleteBookByIdService("book123")
      ).rejects.toThrow("Delete Error");
    });
  });
});