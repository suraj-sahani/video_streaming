import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  // Steps to register a user.
  // 1. Parse the data sent from the user.
  // 2. Validate the data - not empty
  // 3. Check if user already exists - check by username and email
  // 4. Check if avatar
  // 5. Check for coverImage
  // 6. Upload the images to cloudinary
  // 7. Check if avatar is uploaded to cloudinary
  // 8. create a user object - create entry in db
  // 9. After creating the user, we get the entire object as response. So, we have to remove refreshToken and password.
  // 10. Check for user creation.
  // 11. If success return or error.

  const { fullName, username, email, password } = req.body;

  if (
    [fullName, email, password, username].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    throw new ApiError(409, "User with email or username already exists");
  }

  let coverImageLocalPath;
  // Since we are using multer as a middleware, we get the access of the files in request
  const avatarLocalPath = req.files?.avatar[0]?.path; // path of avatar in the fileSystem
  if (
    req.files &&
    Array.isArray(req.files?.coverImage) &&
    req.files?.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path; // path of coverImage in fileSystem
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required.");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Failed to upload avatar.");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Failed to create user.");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully."));
});

export { registerUser };
