
import express from "express";
import { changeCurrentPassword, getCurrentUser, getUserChannelProfile, getUserWatchHistory, loginUser, logoutUser, refreshingAccessToken, registerUser, updateAccountDetails, updateUserAvatar, updateUserCoverImage } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import verifyJWT from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", upload.fields([
    {name: 'avatar', maxCount: 1},
    {name: 'coverImage', maxCount: 1}
]), registerUser)

router.route("/login").post(loginUser);
//router.post("/login", loginUser);

router.route("/refreshing-access-token").post(refreshingAccessToken);
// router.post("/refreshing-access-token", refreshingAccessToken);


// secured routes

router.post("/logout", verifyJWT, logoutUser);
//router.route("/logout").post(verifyJWT, logoutUser);


router.route("/change-password").post(verifyJWT, changeCurrentPassword);
// router.post("/change-password", verifyJWT, changeCurrentPassword);

router.route("/current-user").get(verifyJWT, getCurrentUser);
// router.get("/current-user", verifyJWT, getCurrentUser);

router.route("/update-account").patch(verifyJWT, updateAccountDetails);
// router.patch("/update-account", verifyJWT, updateAccountDetails);

router.route("/update-avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
// router.patch("/update-avatar", verifyJWT, upload.single("avatar"), updateUserAvatar);

router.route("/update-cover-image").patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);
// router.patch("/update-cover-image", verifyJWT, upload.single("coverImage"), updateUserCoverImage);

router.route("/channel/:username").get(verifyJWT, getUserChannelProfile);
// router.get("/channel/:username", verifyJWT, getUserChannelProfile);

router.route("/watch-history").get(verifyJWT, getUserWatchHistory);
// router.get("/watch-history", verifyJWT, getUserWatchHistory);



export default router;