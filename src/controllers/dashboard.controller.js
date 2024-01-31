import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {APIResponse, ApiResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { APIError } from "../utils/APIErrors.js"

const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    const userID = req.user._id;

    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $group:{
                id: null,
                count: {
                    $sum: 1,
                }
            }
        }
    ])

    const videos= await Video.aggregate([
        {
            $match: {
                owner : new mongoose.Types.ObjectId(req.user._id),
            }
        }, 
        {
           $lookup:{
            from: "likes",
            localfield: "_id",
            foreignfield: "video",
            as: "likes"
           }
        },
        {
            $project: {
                totalLikes: {
                    $size: "$likes"
                },
                totalViews: "$views",
                totalVideos: 1
            }
        }, 
        {
            $group: {
                totalLikes: {
                    $sum: "$totalLikes"
                },
                totalViews: {
                    $sum: "$totalViews"
                }, 
                totalVideos: {
                    $sum: 1
                }
            }
        }

    ])
    
    
})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel

    const channelVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localfield: "_id",
                foreignfield: "video",
                as: "likes"
            }
        }, 
        {
            $addFields: {
                totalLikes: {
                    $sum
                }
            }
        }
    ])

    if(!channelVideos) {
        throw new APIError(400, "you have not uploaded any videos")
    }

    return res
           .status(200)
           .json( channelVideos,
            new APIResponse(200, "This channel's videos fetched successfully"))
})

export {
    getChannelStats, 
    getChannelVideos
    }