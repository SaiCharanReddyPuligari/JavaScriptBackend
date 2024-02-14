import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";
import { User } from "../models/user.models.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIResponse } from "../utils/APIResponse.js";
import jwt from "jsonwebtoken";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        const accessToken = user.generateAcessToken();
        const refreshToken = user.generateRefreshToken();

        user.refreshToken = refreshToken;
        user.save({ validateBeforeSave: false }); //save to database
        //we add validateBeforeSave to untrigger the mongoose password check
        // console.log(user);

        return { accessToken, refreshToken };
    } catch (error) {
        throw new APIError(
            500,
            "something went wrong while generating refresh and access tokens"
        );
    }
};

const registerUser = asyncHandler(async (req, res) => {
    //get user from frontend
    const { fullName, email, username, password } = req.body;
    console.log({ email: email });

    //validating multiple values at a time
    if (
        [fullName, email, username, password].some(
            (value) => value?.trim() === ""
        )
    ) {
        throw new APIError(400, "All fields is required");
    } //try checking @ in email with string.includes('@)

    //check if the user already exists: username, email
    const existedUser = await User.findOne({
        $or: [{ username }, { email }],
    });
    if (existedUser) {
        throw new APIError(
            409,
            "User already exists with this email or username"
        );
    }

    //check for images, and avatar
    const avatarLocalPath = req.files?.avatar[0]?.path; //req.files gives an array with one object with path parameter, so we use avatar[0].path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;

    //for optional images
    let coverImageLocalPath;
    if (
        req.files &&
        Array.isArray(req.files.coverImage) &&
        req.files.coverImage.length > 0
    ) {
        //check request, check for coverImage array, check for array lenght
        coverImageLocalPath = req.files.coverImage[0].path;
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
        avatar: {
            public_id: avatar.public_id,
            url: avatar.secure_url,
        },
        coverImage: {
            public_id: coverImage?.public_id || "",
            url: coverImage?.secure_url || "",
        },
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
        throw new APIError(
            500,
            "Something went wrong while registring the user"
        );
    }

    //return response
    return res
        .status(201)
        .json(
            new APIResponse(200, createdUser, "User registered Successfully")
        );
});

const loginUser = asyncHandler(async (req, res) => {
    //req.body => data
    //check and validate username or email
    //check if the user exists
    //unhash the password
    //generate access and refresh token
    //send cookies

    const { email, username, password } = req.body;
    console.log({ email: email });

    // if(!username && !email){ //alternate
    // throw new APIError(400, "username or email is required")

    // }
    if (!(username || email)) {
        //you can choose one or both
        throw new APIError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ email }, { username }], //find multiple values at once
    });

    if (!user) {
        throw new APIError(404, "User does not exist");
    }

    const isPasswordValidawait = user.isPasswordCorret(password); //custom method with user

    if (!isPasswordValidawait) {
        throw new APIError(401, "Password is incorrect");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    );

    const options = {
        //This restricts anyone except server to modify the cookies
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new APIResponse(
                200,
                {
                    loggedInUser,
                    accessToken,
                    refreshToken,
                },
                "user logged in successfully"
            )
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id, //removing the refresh token fro database
        {
            $unset: {
                refreshToken: 1,
            },
            // $set:{
            //   refreshToken: null //this also works but a better practice is to logout
            // }
        },
        {
            new: true,
        }
    );

    const options = {
        //This restricts anyone except server to modify the cookies
        httpOnly: true,
        secure: true,
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new APIResponse(200, {}, "User logged out"));
});

//once refreshtoken is created, we need to refresh it and give it on every request to keep the session open
const refreshAccessToken = asyncHandler(async (req, res) => {
    const incomingRefreshToken =
        req.cookies?.refreshToken || req.body?.refreshToken;

    if (!incomingRefreshToken) {
        throw new APIError(401, "Unauthorized request");
    }

    //  console.log(incomingRefreshToken);

    const user = await User.findOne({
        refreshToken: incomingRefreshToken,
    });
    //console.log(user);
    if (!user) {
        throw new APIError(401, "Invalid refresh token");
    }

    //  if(incomingRefreshToken !== user?.refreshToken){
    //   throw new APIError(401, "Refresh Token is expired or used")
    //  }//12345, yashu123, vamshi123

    //now, we are here, the refresh tokens are matched, to generate new access tokens

    const options = {
        httpOnly: true,
        secure: true,
    };

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
        user._id
    );

    //console.log(accessToken, refreshToken);

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new APIResponse(
                200,
                {
                    accessToken,
                    refreshToken,
                },
                "Access Token Refreshed"
            )
        );
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    //yashu123, sai123 sai12345

    // if(newPassword!==confirmPassword){
    //   throw new APIError(400, "newpassword and confirmpassword are not same")
    // }

    const user = await User.findById(req.user?._id); //since we use verifyJWT token middleware, we have a copy of use in req.user

    const isOldPasswordCorret = await user.isPasswordCorret(oldPassword);
    console.log(isOldPasswordCorret);

    if (!isOldPasswordCorret) {
        throw new APIError(400, "Invalid old password");
    }
    user.password = newPassword; //assigning
    await user.save({ validateBeforeSave: false }); //no need of validating all fields
    console.log(user);

    return res
        .status(200)
        .json(new APIResponse(200, {}, "Password updated successfully"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(
            new APIResponse(200, req.user, "current user fetched successfully")
        );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    const { fullName, email } = req.body;
    if (!fullName || !email) {
        throw new APIError(400, "All fileds are required");
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email,
            },
        },
        { new: true } //this helps in user storing the updated information after changing the details
    ).select("-password -refreshToken");

    return res
        .status(200)
        .json(
            new APIResponse(200, user, "Account details updated successfully")
        );
});

//try to write different controllers for updating files
const updateUserAvatar = asyncHandler(async (req, res) => {
    const avatarLocalPath = req.file?.path;

    if (!avatarLocalPath) {
        throw new APIError(400, "avatar file is missing");
    }

    //deleting the avatar on Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    console.log(avatar);

    const user = await User.findById(req.user._id).select("avatar");
    // console.log(user);

    const avatarToDelete = user.avatar.public_id;
    console.log(avatarToDelete);

    if (!avatar.url) {
        throw new APIError(400, "Error while uploading avatar on cloudinary");
    }

    const updateUserAvatar = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: {
                    public_id: avatar.public_id,
                    url: avatar.url,
                },
            },
        },
        { new: true } //this helps in user storing the updated information after changing the details
    ).select("-password -refreshToken");

    if (avatarToDelete && updateUserAvatar.avatar.public_id) {
        await deleteOnCloudinary(avatarToDelete);
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updateUserAvatar,
                "Avatar updated successfully"
            )
        );
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new APIError(400, "coverImage file is missing");
    }

    const user = await User.findById(req.user?._id).select("coverImage");
    const coverImageToDelete = user.coverImage.public_id;

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!coverImage.url) {
        throw new APIError(400, "Error while uploading avatar on cloudinary");
    }

    const updateUserCoverImage = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: {
                    public_id: coverImage.public_id,
                    url: coverImage.url,
                },
            },
        },
        { new: true } //this helps in user storing the updated information after changing the details
    ).select("-password -refreshToken");

    if (coverImageToDelete && updateUserCoverImage.coverImage.public_id) {
        await deleteOnCloudinary(coverImageToDelete);
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                updateUserCoverImage,
                "CoverImage updated successfully"
            )
        );
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    //to access the profile we make a getrequest to the profile path, so we use req.params

    const { username } = req.params;

    if (!username?.trim()) {
        throw new APIError(400, "User not found");
    }
    //the general process is to make a User.find and then apply the aggregation principles
    //mongo offers $match to do the seacrh and apply the methods concurrently
    //User.aggregate([{}, {}])/flower brackets indicate the pipelines, and can be any
    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase(), //found the profle we are looking for
            },
        },
        {
            $lookup: {
              from: "subscriptions", // The collection to join with
              localField: "_id", // Field from the current collection (User) to match
              foreignField: "channel", // Field from the 'subscriptions' collection to match
              as: "subscribers" // Alias for the joined data
            },
        },
        {
            $lookup: {
                from: "subscriptions", //plural name stored in database
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo",
            },
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers", //returns the size of the resultant subscribers array
                },
                subscribedTo: {
                    $size: "$subscribedTo",
                },
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                        //with if to assign check and with $in we check if the current user is present in the subscibers, we display {subscribed} buttton in the front end or else {subscribe}
                        then: true, //the front-end can use the then and else to check it
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                fullName: 1, //we can project only the required values to frontend
                username: 1,
                subscribersCount: 1,
                subscribedTo: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1,
            },
        },
    ]);
    //channel is an array of objects (here it is of one user only)

    if (!channel?.length) {
        throw new APIError(404, "channel does not exist");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                channel[0],
                "User channel fetched successfully"
            )
        );
});

const getWatchHistory = asyncHandler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                //_id: req.user._id  //this returns a string not the id, but for normal methods, mongoose internally converts
                //and here we cannot use it
                _id: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory", //nested pipeline
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner", //this fecthes the data of the owner of the video
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1,
                                    },
                                },
                            ],
                        },
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner", //we use this pipeline to override the owner contents of the above owner and give the first object
                            },
                        },
                    },
                ],
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                user[0].watchHistory,
                "User WatchHistory is fetched"
            )
        );
});

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
};
