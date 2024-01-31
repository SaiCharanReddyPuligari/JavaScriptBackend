import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {APIResponse, ApiResponse} from "../utils/APIResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { APIError } from "../utils/APIErrors.js"


const createPlaylist = asyncHandler(async (req, res) => {
     const {name, description} = req.body

    if([name, description].some((value)=>{value.trim()==""})){
        throw new APIError(400, " Please name your Playlist and give a small description")
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    });

    if(!playlist){
        throw new APIError(404, "failed to create the playlist, try again")
    }

    return res
           .status(200)
           .json(
            new APIResponse(200, playlist, `A new playlist named ${name} is created`)
           )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists

    if(!isValidObjectId(userId)){
        throw new APIError(400, "Invalid User")
    }

    const userPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner : new mongoose.Types.ObjectId(userId),
            }
        },
        {
            $lookup:{
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "userPlaylistVideos"
            }
        }, 
        {
            $addFields: {
                totalVideos: {
                    $size: "$userPlaylistVideos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        }
    ])
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist

})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}