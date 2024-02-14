import mongoose from "mongoose";
import { Subscription } from "../models/subscription.models.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";
import { Video } from "../models/video.models.js";
import { Like } from "../models/like.models.js";

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userID = req.user._id;

    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $group: {
                id: null,
                subscribersCount: {
                    $sum: 1,
                },
            },
        },
    ]);

    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "likes",
                localfield: "_id",
                foreignfield: "video",
                as: "likes",
            },
        },
        {
            $project: {
                totalLikes: {
                    $size: "$likes",
                },
                totalViews: "$views",
                totalVideos: 1,
            },
        },
        {
            $group: {
                totalLikes: {
                    $sum: "$totalLikes",
                },
                totalViews: {
                    $sum: "$totalViews",
                },
                totalVideos: {
                    $sum: 1,
                },
            },
        },
    ]);

    const channelStats = {
        totalSubscribers: totalSubscribers[0]?.subscribersCount || 0,
        totalLikes: videos[0].totalLikes || 0,
        totalViews: videos[0].totalViews || 0,
        totalVideos: videos[0].totalVideos || 0,
    };

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                channelStats,
                "channel stats fetched successfully"
            )
        );
});

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const channelVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id),
            },
        },
        {
            $lookup: {
                from: "likes",
                localfield: "_id",
                foreignfield: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: { date: "$createdAt" },
                },
                likesCount: {
                    $size: "$likes",
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 1,
                "videFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1,
                },
                isPublished: 1,
                likesCount: 1,
            },
        },
    ]);

    if (!channelVideos) {
        throw new APIError(400, "you have not uploaded any videos");
    }

    return res
        .status(200)
        .json(
            channelVideos,
            new APIResponse(200, "This channel's videos fetched successfully")
        );
});

export { getChannelStats, getChannelVideos };
