import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filepath) => {
  try {
    if (!filepath) return null;

    // Upload file in cloudinary
    const response = await cloudinary.uploader.upload(filepath, {
      responseType: "auto",
    });

    // File has been successfully uploaded
    console.log("File has be uploaded on cloudinary.", response.url);
    return response;
  } catch (error) {
    // If there is an error, two things can happen.
    // 1. There was an error cause due to local file system. Maybe wrong filepath or malicious file.
    // 2. Failed due to network error while uploading to cloudinary.

    // Case 1: Remove the file from local filesystem.
    fs.unlinkSync(filepath);
    return null;
  }
};

export { uploadOnCloudinary };
