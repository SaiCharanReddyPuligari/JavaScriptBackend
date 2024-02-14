import mongoose, { isValidObjectId } from "mongoose";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";
import { Like } from "../models/like.models.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: toggle like on video

    if (!isValidObjectId(videoId)) {
        throw new APIError(404, "Invalid Video");
    }

    const isLikedBy = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (isLikedBy) {
        await Like.findByIdAndDelete(isLikedBy?._id);

        return res
            .status(200)
            .json(new APIResponse(200, "Unliked the video successfully"));
    }

    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });

    return res
        .status(200)
        .json(new APIResponse(200, "liked the video successfully"));
});

const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    //TODO: toggle like on comment
    if (!isValidObjectId(commentId)) {
        throw new APIError(404, "Invalid comment");
    }

    const isLikedBy = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (isLikedBy) {
        await Like.findByIdAndDelete(isLikedBy?._id);

        return res
            .status(200)
            .json(new APIResponse(200, "Unliked the Comment successfully"));
    }

    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    });

    return res
        .status(200)
        .json(new APIResponse(200, "liked the Comment successfully"));
});

const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    //TODO: toggle like on tweet
    if (!isValidObjectId(tweetId)) {
        throw new APIError(404, "Invalid tweet");
    }

    const isLikedBy = await Like.findOne({
        comment: tweetId,
        likedBy: req.user?._id,
    });

    if (isLikedBy) {
        await Like.findByIdAndDelete(isLikedBy?._id);

        return res
            .status(200)
            .json(new APIResponse(200, "Unliked the tweet successfully"));
    }

    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    return res
        .status(200)
        .json(new APIResponse(200, "liked the tweet successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    //TODO: get all liked videos

    const likedVidoes = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideos",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "videoOwner",
                        },
                    },
                    {
                        $unwind: "$videoOwner",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideos",
        },
        {
            $project: {
                _id: 0,
                likedVidoes: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    discription: 1,
                    duration: 1,
                    views: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                likedVidoes,
                "liked videos fetched successfully"
            )
        );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
