import mongoose from "mongoose"
 import {Video} from "../models/Video.models.js"
import  {Comment} from "../models/comment.models.js"
import {ApiError} from "../utils/APIError.js"
import {APIResponse, ApiResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    //TODO: get all comments for a video
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    const videoID = await Video.findById(videoId);

    const videoComments = await Comment.aggregate([
        {
          $match: {
            //_id: req.user._id  //this returns a string not the id, but for normal methods, mongoose internally converts
            //and here we cannot use it 
            video_id: new mongoose.Types.ObjectId(videoID)
          }
        },
        {
            $lookup:{
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes",
            }
        },
        {
          $addFields: {
            commentsCount:{
                $size: "$owner"
            },
            likesCount:{
                $size: "$likes"
            },
            isLikedByUser:{
                $cond:{
                    $if:{$in:[req.user._id, "$likes.likedBy"]}
                }
            }
          }  
        },
        {
            $project:{
                commentsCount: 1,
                likesCount: 1,
                owner: {
                    username: 1,
                    fullName: 1,
                    avatar: 1,
                },
                isLikedByUser: 1
            }
        }
    ])

    const options= {
        page: 1,
        limit: 10,
    }

    const videoCommentsPaginate= await Comment.aggregatePaginate({
        videoComments,
        options,
    })

    return res
           .status(200)
           .json(
            new APIResponse(200, videoCommentsPaginate, "video comments fetched successfully")
           )
    
})

const addComment = asyncHandler(async (req, res) => {
    // TODO: add a comment to a video


})

const updateComment = asyncHandler(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncHandler(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }