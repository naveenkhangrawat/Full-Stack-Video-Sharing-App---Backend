import mongoose, {isValidObjectId} from "mongoose"
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Playlist } from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";


const createPlaylist = asyncHandler(async (req, res) => {
    //TODO: create playlist
    
    const {name, description} = req.body;
    if(!name?.trim() || !description?.trim()){
        throw new ApiError(400, "All fields are required");
    }

    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id
    })
    if(!playlist){
        throw new ApiError(500, "Something went wrong while create playlist");
    }

    return res.status(200)
    .json(new ApiResponse(200, playlist, "Playlist has been created"));

})


const getUserPlaylists = asyncHandler(async (req, res) => {
    //TODO: get user playlists

    const {userId} = req.params;
    if(!userId?.trim()){
        throw new ApiError(400, "user id is missing");
    }
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid User Id");
    }

    const allPlaylists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        }
    ]);
    if(!allPlaylists){
        throw new ApiError(404, "No playlist found");
    }

    return res.status(200)
    .json(new ApiResponse(200, {allPlaylistsInfo: allPlaylists}, "All user playlists fetched successfully"))
})


const getPlaylistById = asyncHandler(async (req, res) => {
    //TODO: get playlist by id
    
    const {playlistId} = req.params;
    if(!playlistId?.trim()){
        throw new ApiError(200, "playlist id is missing");
    }
    if(!isValidObjectId(playlistId)){
        throw new ApiError(200, "Invalid playlist id");
    }

    const playlist = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            username: 1,
                            email: 1,
                            fullName: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
                pipeline: [
                    {
                        $match: {
                            isPublished: true
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        username: 1,
                                        fullName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $arrayElemAt: ["$owner", 0]
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                },
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        }
    ]);
    if(!playlist){
        throw new ApiError(404, "playlist not found");
    }

    console.log(playlist[0]?.videos);

    return res.status(200)
    .json(new ApiResponse(200, {playlistInfo: playlist[0]}, "playlist fetched successfully"));
})


const addVideoToPlaylist = asyncHandler(async (req, res) => {
    
    const {playlistId, videoId} = req.params;
    if(!playlistId?.trim() || !videoId?.trim()){
        throw new ApiError(400, "playlist Id or video Id is missing");
    }
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlistId or videoId");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "video not found");
    }

    const addedVideoPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
            $addToSet: {
                videos: videoId
            }
    },{
        new: true
    })
    if(!addedVideoPlaylist){
        throw new ApiError(404, "playlist not found");
    }
    console.log(addedVideoPlaylist);

    return res.status(200)
    .json(new ApiResponse(200, {}, "video has been added to the playlist"));

})


const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    // TODO: remove video from playlist
    
    const {playlistId, videoId} = req.params;
    if(!playlistId?.trim() || !videoId?.trim()){
        throw new ApiError(400, "playlist Id or video Id is missing");
    }
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid playlistId or videoId");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "video not found");
    }

    const removedVideoPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
            $pull: {
                videos: videoId
            }
    },
    {
        new: true
    })
    if(!removedVideoPlaylist){
        throw new ApiError(404, "playlist not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, {}, "video has been removed from the playlist"));
})


const deletePlaylist = asyncHandler(async (req, res) => {
    // TODO: delete playlist
    
    const {playlistId} = req.params;
    if(!playlistId?.trim()){
        throw new ApiError(400, "playlist Id is missing");
    }
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist Id");
    }

    const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId);
    if(!deletedPlaylist){
        throw new ApiError(404, "playlist not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, {}, "playlist has been deleted"));
})


const updatePlaylist = asyncHandler(async (req, res) => {
    //TODO: update playlist

    const {playlistId} = req.params;
    const {name, description} = req.body;
    if(!name?.trim() && !description?.trim()){
        throw new ApiError(400, "field is required");
    }
    if(!playlistId?.trim()){
        throw new ApiError(400, "playlist Id is missing");
    }
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400, "Invalid playlist Id");
    }

    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(404, "playlist not found");
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
        $set: {
            name: name || playlist?.name,
            description: description || playlist?.description
        }
    },
    {
        new: true
    })
    if(!updatedPlaylist){
        throw new ApiError(404, "playlist not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, updatedPlaylist, "playlist has been updated"));
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

