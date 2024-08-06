
import mongoose, {isValidObjectId} from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js";
import { Like } from "../models/like.model.js";



const toggleVideoLike = asyncHandler(async function(req, res){

    const {videoId} = req.params;
    if(!videoId?.trim()){
        throw new ApiError(400, "VideoId is missing")
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid Video Id");
    }

    const isVideoLiked = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id
    })

    if(isVideoLiked){
        await Like.findByIdAndDelete(isVideoLiked?._id);

        return res.status(200)
        .json(new ApiResponse(200, {}, "Video unliked!"))
    }

    const newLikedVideo = await Like.create({
        video: videoId,
        likedBy: req.user?._id
    })
    if(!newLikedVideo){
        throw new ApiError(500, "video not liked! Something went wrong");
    }

    return res.status(200)
    .json(new ApiResponse(200, {}, "Video liked!"));

})


const toggleCommentLike = asyncHandler(async (req, res) => {

    const {commentId} = req.params
    if(!commentId?.trim()){
        throw new ApiError(400, "CommentId is missing")
    }
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid Comment Id");
    }

    const isCommentLiked = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id
    })
    if(isCommentLiked){
        await Like.findByIdAndDelete(isCommentLiked?._id);

        return res.status(200)
        .json(new ApiResponse(200, {}, "Comment unliked!"));
    }

    const newLikedComment = await Like.create({
        comment: commentId,
        likedBy: req.user?._id
    })
    if(!newLikedComment){
        throw new ApiError(500, "comment not liked! Something went wrong");
    }

    return res.status(200)
    .json(new ApiResponse(200, {}, "Comment liked!"));

})


const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    if(!tweetId?.trim()){
        throw new ApiError(400, "TweetId is missing")
    }
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet Id");
    }

    const isTweetLiked = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id
    })

    if(isTweetLiked){
        await Like.findByIdAndDelete(isTweetLiked?._id);

        return res.status(200)
        .json(new ApiResponse(200, {}, "Tweet unliked!"));
    }

    const newLikedTweet = await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id
    })
    if(!newLikedTweet){
        throw new ApiError(500, "tweet not liked! Something went wrong");
    }

    return res.status(200)
    .json(new ApiResponse(200, {}, "Tweet liked!"));
}
)

const getLikedVideos = asyncHandler(async (req, res) => {
    
    const likedVideos = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
                video: {
                    $nin: [undefined, null]
                }
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
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
                video: {
                    $arrayElemAt: ["$video", 0]
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
                video: 1
            }
        }
    ])
    if(!likedVideos){
        throw new ApiError(404, "Liked Videos not found!");
    }

    return res.status(200)
    .json(new ApiResponse(200, {likedVideos}, "liked videos fetched successfully"));
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
