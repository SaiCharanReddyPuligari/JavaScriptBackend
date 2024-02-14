import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.models.js";
import { User } from "../models/user.models.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import { APIError } from "../utils/APIErrors.js";
import { Like } from "../models/like.models.js";
import { Comment } from "../models/comment.models.js";

const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;
    //TODO: get all videos based on query, sort, pagination

    const pipeline = [];

    //for searching in MongoDb we need to create custome search indexes based on field mappings to make it fast and efficient
    //Here we are searching the videos, based on the title, and desciption path of the video model
    //my search index is search-by-text-description
    if (query) {
        pipeline.push({
            $search: {
                index: "search-by-text-description",
                text: {
                    query: "query",
                    path: ["title", "description"],
                },
            },
        });
    }

    if (userId) {
        if (!isValidObjectId(userId)) {
            throw new APIError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        });
    }

    pipeline.push({
        $match: {
            isPublished: true,
        },
    });

    //sortBy: it can be bases on views, likes, or createdAt
    //sortType: ascending or descnding
    if (sortBy && sortType) {
        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1,
            },
        });
    } else {
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                        },
                    },
                ],
            },
        },
        {
            $unwind: "$owerDetails",
        }
    );

    const videoAggregate = await Video.aggregate(pipeline);

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
    };

    const video = await Video.aggregatePaginate(videoAggregate, options);

    return res
        .status(200)
        .json(new APIResponse(200, video, "Videos fetched successfully"));
});

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    // TODO: get video, upload to cloudinary, create video
    if (!title || !description) {
        throw new APIError(400, "Please provide a title and description");
    }

    const videoFileLocalPath = req.file?.videoFile[0]?.path;
    const thumbnailLocalPath = req.file?.videoFile[0]?.path;

    if (!videoFileLocalPath || !thumbnailLocalPath) {
        throw new APIError(400, "Video file and Thumbnail are required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!videoFile || !thumbnail) {
        throw new APIError(
            400,
            "Video file and Thumbnail are required to upload on Cloudinary"
        );
    }

    const publishAVideo = await Video.create({
        title,
        description,
        duration: videoFile.duration,
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id,
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id,
        },
        isPublished: false,
        owner: req.user?._id,
    });

    const videoUploaded = await Video.findById(publishAVideo._id);

    if (!videoUploaded) {
        throw new APIError(400, "Video Uploading failed, please try again");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, publishAVideo, "Video Published successfully")
        );
});

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: get video by id
    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid video ID");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $lookup: {
                from: "comments",
                localField: "_id",
                foreignField: "video",
                as: "comments",
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "videoOwner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers",
                        },
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers",
                            },
                            isSubscriber: {
                                $cond: {
                                    $if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber",
                                        ],
                                    },
                                    then: true,
                                    else: false,
                                },
                            },
                        },
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscriber: 1,
                        },
                    },
                ],
            },
        },
        {
            $addFields: {
                likes: {
                    $size: "likes",
                },
                owner: {
                    $first: "videoOwner",
                },
                isLiked: {
                    $cond: {
                        $if: { $in: [req.user?._id, "$likes.likedBy"] },
                        then: true,
                        else: false,
                    },
                },
            },
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                duration: 1,
                createdAt: 1,
                comments: 1,
                owner: 1,
                likes: 1,
                isLiked: 1,
            },
        },
    ]);

    if (!video) {
        throw new APIError(500, "Unable to fecth the video");
    }

    //increment the video views
    await Video.findByIdAndUpdate(videoId, [
        {
            $inc: {
                views: 1,
            },
        },
    ]);

    //add this video to the watch history
    await User.findByIdAndUpdate(videoId, [
        {
            $addToSet: {
                watchHistory: videoId,
            },
        },
    ]);

    return res
        .status(200)
        .json(new APIResponse(200, video[0], "video fetched successfully"));
});

const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { videoId } = req.params;
    //TODO: update video details like title, description, thumbnail

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid VideoId");
    }

    if (!title || !description) {
        throw new APIError(400, "Need title and description to update");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(404, "video not found");
    }

    if (video?.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "Only owner can update the video");
    }

    const thumbnailToDelete = video.thumbnail.public_id;

    const thumbnailLocalPath = req.file?.thumbnail[0].path;

    if (!thumbnailLocalPath) {
        throw new APIError(400, "thumbnail is required");
    }

    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if (!thumbnail) {
        throw new APIError(404, "thumbnail not found");
    }

    const updateVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url,
                },
            },
        },
        { new: true }
    );

    if (!updateVideo) {
        throw new APIError(500, "Unable to update video, please try again");
    }

    if (updateVideo) {
        await deleteOnCloudinary(thumbnailToDelete);
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, { updateVideo }, "Video updated successfully")
        );
});

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    //TODO: delete video

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid VideoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(404, "No video found");
    }

    if (video.owner?.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only owner can delete the video");
    }

    const deleteVideo = await Video.findByIdAndDelete(video?._id);

    if (!deleteVideo) {
        throw new APIError(400, "Failed to delete the video please try again");
    }

    await deleteOnCloudinary(video?.thumbnail.public_id); //deleting the thumbnail picure
    await deleteOnCloudinary(video?.videoFile.public_id, "video"); //deleting the video and specifying the source as VIDEO

    //delete the likes
    await Like.deleteMany({
        video: videoId,
    });

    //delete the comments
    await Comment.deleteMany({
        video: videoId,
    });

    return res
        .status(200)
        .json(new APIResponse(200, {}, "video deleted successfully"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    if (!isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid VideoId");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(404, "Video not found");
    }

    if (video.owner?.toString() !== req.user?._id.toString()) {
        throw new APIError(
            400,
            "only owner can toggle the video publish status"
        );
    }

    const togglePublishStatus = await Video.findByIdAndUpdate(
        video?._id,
        {
            $set: {
                isPublished: !video?.isPublished,
            },
        },
        { new: true }
    );

    if (!togglePublishStatus) {
        throw new APIError(500, "Failed to toogle video publish status");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                { isPublished: togglePublishStatus.isPublished },
                "Video publish toggled successfully"
            )
        );
});

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus,
};
