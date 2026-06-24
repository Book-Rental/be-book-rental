import cloudinary from "../config/cloudinary";


export const uploadToCloudinary = (fileBuffer: Buffer, folder: string, filename: string) => {
  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, public_id: filename,transformation: [
        { quality: "auto", fetch_format: "auto" } // <-- best compression combo
      ] },
      (error, result) => {
        if (error) return reject(error);
        resolve(result?.secure_url || "");
      }
    );
    stream.end(fileBuffer);
  });
};