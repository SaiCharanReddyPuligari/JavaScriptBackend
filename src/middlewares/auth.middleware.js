import { APIError } from "../utils/APIErrors.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken";
import { User } from "../models/User.models.js";

export const verifyJWT= asyncHandler (async (req, _, next)=>{ //since res is not in use, we can replace with _

try {
       const token=  req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")    
       //we either get the cookie or Authorization token, and we remove Bearer from auth token
    
       if(!token){
        throw new APIError(401, "Unauthorized Error")
       }
    
      //verifying the token
     const decodedToken= jwt.verify(token, process.env. ACCESS_TOKEN_SECRET)
    
      const user= await User.findById(decodedToken?._id)
                .select("-password -refreshToken")
    
       if(!user){
        throw new APIError(401, "Invalid Acess Token")
       }
       
       req.user = user;
       next();
} catch (error) {
    throw new APIError(401, error?.message || "Invalid access token")
}
})
