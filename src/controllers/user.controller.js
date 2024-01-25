import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";
import { User } from "../models/User.models.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get user from frontend
  const { fullName, email, username, password } = req.body;
  //   console.log({ email: email });

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

    const {email, username, password}= req.body

    if(!(username || email)){ //you can choose one or both
      throw new APIError(400, "username or email is required")
    }

   User.findOne({
    $or: [{email}, {username}] //find multiple values at once
   })
})

export { 
  registerUser,
  loginUser,
 };
