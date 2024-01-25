import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

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


export default router;
