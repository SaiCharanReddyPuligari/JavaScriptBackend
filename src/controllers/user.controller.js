import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";
import { User } from "../models/User.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens= async (userId)=>{
  try {
      const user = await User.findById(userId);
    
      const accessToken= user.generateAcessToken()
      const refreshToken= user.generateRefreshToken()

      user.refreshToken = refreshToken;
      user.save({validateBeforeSave: false});  //save to database
      //we add validateBeforeSave to untrigger the mongoose password check
      // console.log(user);

      return {accessToken, refreshToken}
  } catch (error) {
    throw new APIError(500, "something went wrong while generating refresh and access tokens")
  }
}
const registerUser = asyncHandler(async (req, res) => {
  //get user from frontend
  const { fullName, email, username, password } = req.body;
    console.log({ email: email });

  //validating multiple values at a time
  if (
    [fullName, email, username, password].some((value) => value?.trim() === "")
  ) {
    throw new APIError(400, "All fields is required");
  } //try checking @ in email with string.includes('@)

  //check if the user already exists: username, email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });
  if (existedUser) {
    throw new APIError(409, "User already exists with this email or username");
  }

  //check for images, and avatar
  const avatarLocalPath = req.files?.avatar[0]?.path;   //req.files gives an array with one object with path parameter, so we use avatar[0].path
  //const coverImageLocalPath = req.files?.coverImage[0]?.path;

   //for optional images
   let coverImageLocalPath;
   if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) { //check request, check for coverImage array, check for array lenght
       coverImageLocalPath = req.files.coverImage[0].path
   }

  if (!avatarLocalPath) {
    throw new APIError(400, "Avatar file is required");
  }

  //upload them to cloudinary, avatar
  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new APIError(400, "Avatar file is required");
  }
  // if (!coverImage) {
  //   throw new APIError(400, "CoverImage file is required");
  // }  //use only for mandatory files

  //create user object
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  });

  //remove password token and refresh field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  //check for user creation
  if (!createdUser) {
    throw new APIError(500, "Something went wrong while registring the user");
  }

  //return response
  return res
    .status(201)
    .json(new APIResponse(200, createdUser, "User registered Successfully"));
});

const loginUser= asyncHandler(async (req, res)=>{
    //req.body => data
    //check and validate username or email
    //check if the user exists
    //unhash the password
    //generate access and refresh token
    //send cookies

    const { email, username, password }  = req.body;
    console.log({email: email});

    // if(!username && !email){ //alternate
    // throw new APIError(400, "username or email is required")

    // }
    if(!(username || email)){ //you can choose one or both
      throw new APIError(400, "username or email is required")
    }

   const user = await User.findOne({
    $or: [{email}, {username}] //find multiple values at once
   })

   if(!user){
    throw new APIError(404, "User does not exist")
   }

   const isPasswordValidawait = user.isPasswordCorret(password) //custom method with user

   if(!isPasswordValidawait){
    throw new APIError(401, "Password is incorrect")
   }

   const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)

   const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

   const options ={  //This restricts anyone except server to modify the cookies
    httpOnly: true,
    secure: true,
   }

   return res
             .status(200)
             .cookie("accessToken", accessToken, options)
             .cookie("refreshToken", refreshToken, options)
             .json(
              new APIResponse(
                200,
                {
                  user: loggedInUser, accessToken, refreshToken
                },
                "user logged in successfully"
              )
             )
})

const logoutUser= asyncHandler(async (req, res)=>{
      await User.findByIdAndUpdate(
        req.user._id,   //removing the refresh token fro database
        {
          $set:{
            refreshToken: undefined,
          }
        },
        {
          new: true,
        }
      )

      const options ={  //This restricts anyone except server to modify the cookies
        httpOnly: true,
        secure: true,
       }

       return res
              .status(200)
              .clearCookie("accessToken", options)
              .clearCookie("refreshToken", options)
              .json(new APIResponse(200, {}, "User logged out"))
})

//once refreshtoken is created, we need to refresh it and give it on every request to keep the session open
const refreshAccessToken = asyncHandler (async (req, res)=>{
      const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if(!incomingRefreshToken){
        throw new APIError(401, "Unauthorized request")
      }
try {
      //verifying the refresh token
      const decodedToken= jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
  
     const user= User.findById(decodedToken._id);
     if(!user){
      throw new APIError(401, "Invalid refresh token")
     }
     
     if(incomingRefreshToken !== user?.refreshToken){
      throw new APIError(401, "Refresh Token is expired or used")
     }
  
     //now, we are here, the refresh tokens are matched, to generate new access tokens
  
     const options={
      httpOnly: true,
      secure: true
     }
     
     const {accessToken, newrefreshToken}= await generateAccessAndRefreshTokens(user._id);
  
     return res
            .status(200)
            .cookie("accessToken", accessToken, options)
            .cookie("refreshToken", newrefreshToken, options)
            .json(
              new APIResponse(
                200,
                {
                  accessToken, refreshToken: newrefreshToken
                },
                "Access Token Refreshed"
              )
            )
} catch (error) {
  throw new APIError(401, error?.message || "Invalid refresh token")
}

})

export { 
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
 };
