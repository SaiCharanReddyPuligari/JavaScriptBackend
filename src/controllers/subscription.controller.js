import mongoose, { isValidObjectId } from "mongoose";
import { User } from "../models/user.model.js";
import { Subscription } from "../models/subscription.model.js";
import { APIResponse, ApiResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";

const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    // TODO: toggle subscription
    if (!isValidObjectId(channelId)) {
        throw new APIError(404, "Channel not found");
    }

    const userSubscribed = await Subscription.findOne({
        subscriber: req.user?._id,
        channel: channelId,
    });

    if (userSubscribed) {
        await Subscription.findByIdAndDelete(userSubscribed?._id);

        return res
            .status(200)
            .ApiResponse(
                200,
                { userSubscribed: false },
                "User Unsubscribed Unsuccessfully"
            );
    }

    await Subscription.create({
        subscriber: req.user?._id,
        channel: channelId,
    });

    return res
    .status(200)
    .json(
        new APIResponse(
            200,
            { subscribed: true },
            "subscribed successfully"
        )
    );
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    if (!isValidObjectId(channelId)) {
        throw new APIError(400, "Invalid channelId");
    }

    channelId = new mongoose.Types.ObjectId(channelId);

    const subscribers= await Subscription.aggregate([
        {
             $match: {
                channel: channelId,
             }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscribers",
                
            }
        }
    ])
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
