import mongoose from "mongoose";
import { Video } from "../models/video.models.js";
import { Comment } from "../models/comment.models.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";
import { Like } from "../models/like.models.js";

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const videoID = await Video.findById(videoId);

    if (!videoID) {
        throw new APIError(400, "video does not exist");
    }

    const videoComments = await Comment.aggregate([
        {
            $match: {
                //_id: req.user._id  //this returns a string not the id, but for normal methods, mongoose internally converts
                //and here we cannot use it
                video_id: new mongoose.Types.ObjectId(videoID),
            },
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            },
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes",
                },
                owner: {
                    $first: "$owner",
                },
                isLikedByUser: {
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
                commentsCount: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                },
                isLikedByUser: 1,
            },
        },
    ]);

    const options = {
        page,
        limit,
    };

    const videoCommentsPaginate = await Comment.aggregatePaginate({
        videoComments,
        options,
    });

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                videoCommentsPaginate,
                "video comments fetched successfully"
            )
        );
});

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video
    const { videoId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new APIError(400, "add a comment");
    }

    const video = await Video.findById(videoId);

    if (!video) {
        throw new APIError(404, "Video not found");
    }

    const addComment = await Comment.create({
        content: content,
        video: videoId,
        owner: req.user?._id,
    });

    if (!addComment) {
        throw new APIError(500, "Failed to add the comment, please retry");
    }

    return res
        .status(200)
        .json(200, new APIResponse("Comment added successfully"));
});

const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content) {
        throw new APIError(400, "content is required");
    }

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new APIError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only comment owner can edit their comment");
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        comment?._id,
        {
            $set: {
                content,
            },
        },
        { new: true }
    );

    if (!updatedComment) {
        throw new APIError(500, "Failed to edit comment please try again");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, updatedComment, "Comment edited successfully")
        );
});

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
    const { commentId } = req.params;

    const comment = await Comment.findById(commentId);

    if (!comment) {
        throw new APIError(404, "Comment not found");
    }

    if (comment?.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only comment owner can delete their comment");
    }

    await Comment.findByIdAndDelete(commentId);

    await Like.deleteMany({
        comment: commentId,
        likedBy: req.user
    });

    return res
        .status(200)
        .json(
            new APIResponse(200, { commentId }, "Comment deleted successfully")
        );
});

export { getVideoComments, addComment, updateComment, deleteComment };
