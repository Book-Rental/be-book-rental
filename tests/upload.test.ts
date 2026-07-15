import { describe, it, expect, vi, beforeEach } from "vitest";

// 1. Setup our state variable containers with standard prefixes
let mockUploadCallback: (error: any, result: any) => void;
const mockStreamEnd = vi.fn();

// 2. Comprehensive mock returning both named and default properties to guarantee compatibility
vi.mock("../src/config/cloudinary", () => {
  const uploaderObject = {
    upload_stream: vi.fn((options, callback) => {
      mockUploadCallback = callback; // Safely capture the execution callback link
      return {
        end: mockStreamEnd,
      };
    }),
  };

  return {
    default: {
      uploader: uploaderObject,
    },
    uploader: uploaderObject,
  };
});

// 3. Import your source file cleanly after your mock definitions are declared
import cloudinary from "../src/config/cloudinary";
import { uploadToCloudinary } from "../src/utils/UploadImage";
describe("Cloudinary Upload Utility", () => {
  const dummyBuffer = Buffer.from("mock-file-content");
  const folder = "books";
  const filename = "rental-book-cover";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully upload a file stream and resolve with the secure_url", async () => {
    const mockSuccessResponse = { secure_url: "https://cloudinary.com" };

    // Initialize the execution block
    const uploadPromise = uploadToCloudinary(dummyBuffer, folder, filename);

    // Safely fire our dynamically assigned callback function
    mockUploadCallback(null, mockSuccessResponse);

    const resultUrl = await uploadPromise;

    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      {
        folder,
        public_id: filename,
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
      expect.any(Function)
    );

    expect(mockStreamEnd).toHaveBeenCalledWith(dummyBuffer);
    expect(resultUrl).toBe("https://cloudinary.com");
  });

  it("should handle error gracefully and reject the promise if cloudinary stream throws an exception", async () => {
    const mockError = new Error("Cloudinary API Key Authorization Expired");

    const uploadPromise = uploadToCloudinary(dummyBuffer, folder, filename);

    mockUploadCallback(mockError, null);

    await expect(uploadPromise).rejects.toThrow("Cloudinary API Key Authorization Expired");
    expect(mockStreamEnd).toHaveBeenCalledWith(dummyBuffer);
  });

  it("should return an empty string if secure_url is missing on the resolution response object", async () => {
    const uploadPromise = uploadToCloudinary(dummyBuffer, folder, filename);

    mockUploadCallback(null, {});

    const resultUrl = await uploadPromise;
    expect(resultUrl).toBe("");
  });
});
