import mongoose, { isValidObjectId } from "mongoose";
import { APIResponse } from "../utils/APIResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { APIError } from "../utils/APIErrors.js";
import { Video } from "../models/video.models.js";
import { Playlist } from "../models/playlist.models.js";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    if (!name || !description) {
        throw new APIError(
            400,
            " Please name your Playlist and give a small description"
        );
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    });

    if (!playlist) {
        throw new APIError(404, "failed to create the playlist, try again");
    }

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                playlist,
                `A new playlist named ${name} is created`
            )
        );
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    //TODO: get user playlists

    if (!isValidObjectId(userId)) {
        throw new APIError(400, "Invalid User");
    }

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "userPlaylistVideos",
            },
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$userPlaylistVideos",
                },
                totalViews: {
                    $sum: "$videos.views",
                },
            },
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1,
            },
        },
    ]);

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                { userPlaylists },
                "User Playlists fetched successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    //TODO: get playlist by id

    if (!isValidObjectId(playlistId)) {
        throw new APIError(404, "this playlist does not exist");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $match: {
                "videos.isPublished": true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
        
    ]);

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
               {playlistVideos},
                "Playlist fetched successfully"
            )
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new APIError(404, "Invalid PlaylistId and VideoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new APIError(400, "only owner can add video to thier playlist");
    }

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (!video) {
        throw new APIError(404, "Video not found");
    }

    const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        { new: true }
    );

    if (!addVideoToPlaylist) {
        throw new APIError(400, "Unable to add the video to playlist");
    }

    return res
        .status(200)
        .json(
            new APIResponse(200, addVideoToPlaylist, "Video added to the playlist successfully")
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        throw new APIError(400, "Invalid playlistId or VideoId");
    }

    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }
    if (!video) {
        throw new APIError(404, "video not found");
    }

    if (
        (playlist.owner?.toString() && video.owner.toString()) !==
        req.user?._id.toString()
    ) {
        throw new APIError(
            404,
            "only owner can remove video from thier playlist"
        );
    }

    const removeVideoFromPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $pull: {
                videos: videoId,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                { removeVideoFromPlaylist },
                `Video removed from playlist successfully`
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    // TODO: delete playlist

    if (!isValidObjectId(playlistId)) {
        throw new APIError(404, "Invalid PlaylistId");
    }

    const playlistToDelete = await Playlist.findById(playlistId);

    if (playlistToDelete.owner?.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only owner can add video to thier playlist");
    }

    if (!playlistToDelete) {
        throw new APIError(404, "Playlist not found");
    }

    await Playlist.findByIdAndDelete(playlistToDelete?._id);

    return res
        .status(200)
        .json(
            new APIResponse(200, {playlistToDelete}, "playlist is deleted successfully")
        );
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;
    const { name, description } = req.body;
    //TODO: update playlist

    if (!name || !description) {
        throw new APIError(
            400,
            "Please provide a name and description to update"
        );
    }

    if (!isValidObjectId(playlistId)) {
        throw new APIError(400, "Invalid Playlist");
    }

    const playlist = await Playlist.findById(playlistId);

    if (!playlist) {
        throw new APIError(404, "Playlist not found");
    }

    if (playlist.owner.toString() !== req.user?._id.toString()) {
        throw new APIError(400, "only owner can edit the playlist");
    }

    const UpdatePlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name: name,
                description: description,
            },
        },
        { new: true }
    );

    return res
        .status(200)
        .json(
            new APIResponse(
                200,
                { UpdatePlaylist },
                `Playlist updated successfully`
            )
        );
});

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist,
};
