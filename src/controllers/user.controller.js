import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    // After generating the refresh token, we need to update it in the db.
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token."
    );
  }
};

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

const loginUser = asyncHandler(async (req, res) => {
  // Steps for logging in a user.
  // 1. Get user data for request body,
  // 2. Check if username and email is not empty.
  // 3. Find the user in db. If not user throw error. If the user exists, check the password.
  // 4. If password is incorrect throw error else generate access and refresh tokens.
  // 5. Send the tokens in secure cookies.
  const { email, username, password } = req.body;

  if (!(username || email) && !password) {
    throw new ApiError(400, "Username or password is required.");
  }

  const existingUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (!existingUser) {
    throw new ApiError(404, "User does not exist.");
  }

  // We are not using the User from schema since the isPasswordCorrect is a helper function defined by us and is only available in the user object and not in the Schema. Schema has methods but those are methods provided by mongodb.
  const isPasswordValid = await existingUser.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Email, username or password is incorrect.");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    existingUser._id
  );
  console.log(accessToken, refreshToken);

  const loggedInUser = await User.findById(existingUser._id).select(
    "-password -refreshToken"
  );

  console.log("Logged in user:", loggedInUser);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully."
      )
    );
});

const logOutUser = asyncHandler(async (req, res) => {
  const userId = req?.user?._id;
  console.log("Hello", userId);
  const loggedInUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true, // This new field provides us the updated value of the user from db after removing the refreshToken
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  // After logging out the user from the db we also need to remove the cookies which we send in the response.
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully."));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const currentRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  if (!currentRefreshToken) {
    throw new ApiError(401, "Refresh token is required.");
  }

  try {
    const decodedUser = jwt.verify(
      currentRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedUser._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token.");
    }

    if (currentRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token has expired or invalid.");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshToken(user?._id);
    const options = {
      httpOnly: true,
      secure: true,
    };
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully."
        )
      );
  } catch (err) {
    throw new ApiError(500, "Failed to retrieve access token.");
  }
});

const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req?.user?.id;
  const user = await User.findById(userId);
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({
    validateBeforeSave: false,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully."));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully."));
});

export {
  registerUser,
  loginUser,
  logOutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
};
