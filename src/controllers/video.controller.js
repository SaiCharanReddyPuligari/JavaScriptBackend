import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/APIError.js";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

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
        throw new ApiError(400, "Invalid userId");
    }

    pipeline.push({
        $match: {
            owner: new mongoose.Types.ObjectId(userId)
        }
    });
   } 
   
   
});

const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;
  // TODO: get video, upload to cloudinary, create video
});

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: get video by id
});

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: update video details like title, description, thumbnail
});

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  //TODO: delete video
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};
