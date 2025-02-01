import { Router } from "express";
import {
  loginUser,
  logOutUser,
  registerUser,
  refreshAccessToken,
  changePassword,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(
  upload.fields([
    {
      name: "avatar",
      maxCount: 1,
    },
    {
      name: "coverImage",
      maxCount: 1,
    },
  ]),
  registerUser
);

router.route("/login").post(loginUser);

// Secured Routes (JWT Verification)

router.route("/logout").post(verifyJWT, logOutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changePassword);
// To ad multiple middlewares, we just add one after the other
// router.route("/logout").post(mid1,mid2,logOutUser);

export default router;
