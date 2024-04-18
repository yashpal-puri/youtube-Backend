import { Router } from "express";
import {
         loginUser,
         logoutUser, 
         registerUser, 
         refreshAccessToken, 
         changeCurrentPassword, 
         getCurrentUser, 
         updateAccountDetails, 
         updateUserAvatar,
         updateUserCoverImage,
         getChannelDetails
        }
        from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router= Router()

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
    registerUser)

router.route("/login").post(loginUser);

//secured routes
router.route("/logout").post(verifyJWT,logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT,changeCurrentPassword);
router.route("/get-current-user").post(verifyJWT,getCurrentUser);
router.route("/update-account").post(verifyJWT,updateAccountDetails);
router.route("/update-avatar").post(verifyJWT,upload.single('avatar'),updateUserAvatar);
router.route("/update-cover").post(verifyJWT,upload.single('coverImage'),updateUserCoverImage);
router.route("/get-channel-details").post(verifyJWT,getChannelDetails);

export default router;