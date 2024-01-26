import { Router } from "express";
import { loginUser, logoutUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//http://localhost:8000/users/register
// router.post("/register", upload.fields([]), registerUser);
router.route("/register").post(
    upload.fields([
        {
           name: "avatar",
           maxCount : 1
        },
        {
            name: "coverImage",
            maxCount : 1  
        }
    ]), 
    registerUser);

// router.route("/login").post(loginUser)
router.post("/login", loginUser)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)

export default router;
