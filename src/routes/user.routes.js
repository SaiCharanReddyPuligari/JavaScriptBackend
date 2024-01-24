import { Router } from "express";
import { registerUser } from "../controllers/user.controller.js";

const router= Router();

//http://localhost:8000/users/register
// router.route("/register").post(registerUser);
router.post('/register', registerUser);


export default router;