import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const getChannelStats = asyncHandler(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $group: {
                _id: null,
                totalSubscribersCount: {
                    $sum: 1
                }
            }
        }
    ]);

    const videosInfo = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes_details"
            }
        },
        {
            $addFields: {
                likes: {
                    $size: "$likes_details"
                }
            }
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$likes"
                },
                totalViews: {
                    $sum: "$views"
                },
                totalVideos: {
                    $sum: 1
                }
            }
        }
    ])

    const channelStats = {
        totalSubscribers: totalSubscribers?.[0]?.totalSubscribersCount || 0,
        totalVideos: videosInfo?.[0]?.totalVideos || 0,
        totalViews: videosInfo?.[0]?.totalViews || 0,
        totalLikes: videosInfo?.[0]?.totalLikes || 0,
    }

    return res.status(200)
    .json(new ApiResponse(200, {channelStats}, "channel stats fetched successfully"));
})


const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const channelVideos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes_details"
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$likes_details"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $project: {
                likes_details: 0
            }
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200, {channelVideos}, "channel videos fetched successfully"));
})


export { getChannelStats, getChannelVideos } 
