
import mongoose, {isValidObjectId} from "mongoose";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js";
import { Video } from "../models/video.model.js";

const getVideoComments = asyncHandler(async (req, res) => {
    
    const {videoId} = req.params;
    
    if(!videoId?.trim()){
        throw new ApiError(400, "video Id is missing");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id");
    }

    const videoComments = await Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
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
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                }
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes_details",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "likedBy",
                            foreignField: "_id",
                            as: "likedBy",
                            pipeline: [
                                {
                                    $project: {
                                        _id: 1,
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
                            likedBy: {
                                $arrayElemAt: ["$likedBy", 0]
                            }
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                totalLikes: {
                    $size: "$likes_details"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes_details.likedBy._id"]},
                        then: true,
                        else: false
                    }
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
                _id: 1,
                content: 1,
                owner: 1,
                totalLikes: 1,
                isLiked: 1,
                likes_details: 1,
                createdAt: 1,
                updatedAt: 1,
            }
        }
    ])
    if(!videoComments){
        throw new ApiError(404, "Video comments not found");
    }


    return res.status(200)
    .json(new ApiResponse(200, {videoComments}, "video comments fetched successfully"));

})


const addComment = asyncHandler(async (req, res) => {

    const {videoId} = req.params;
    const {content} = req.body;
    if(!videoId?.trim()){
        throw new ApiError(400, "videoId is missing");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id");
    }
    if(!content?.trim()){
        throw new ApiError(400, "Comment is required");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(400, "video does not exist");
    }

    const comment = await Comment.create({
        content,
        video: videoId,
        owner: req.user?._id
    })
    if(!comment){
        throw new ApiError(500, "Comment is not created! Something went wrong");
    }

    const newCreatedComment = await Comment.findById(comment?._id).select("-owner -video");

    return res.status(200)
    .json(new ApiResponse(200, newCreatedComment, "comment added!"));
})


const updateComment = asyncHandler(async (req, res) => {
    
    const {commentId} = req.params;
    const {content} = req.body;
    if(!commentId?.trim()){
        throw new ApiError(400, "commend Id is missing");
    }
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment Id");
    }
    if(!content?.trim()){
        throw new ApiError(400, "comment is required");
    }

    const updatedComment = await Comment.findByIdAndUpdate(commentId, {
        $set: {
            content
        }
    },
    {
        new: true
    })
    if(!updatedComment){
        throw new ApiError(404, "Comment not found!");
    }

    return res.status(200)
    .json(new ApiResponse(200, {}, "Comment updated!"));

})


const deleteComment = asyncHandler(async (req, res) => {
    
    const {commentId} = req.params;
    if(!commentId?.trim()){
        throw new ApiError(400, "comment Id is missing");
    }
    if(!isValidObjectId(commentId)){
        throw new ApiError(400, "Invalid comment Id");
    }

    const deletedComment = await Comment.findByIdAndDelete(commentId);
    if(!deletedComment){
        throw new ApiError(404, "comment not found");
    }

    await Like.deleteMany({
        comment: commentId
    })

    return res.status(200)
    .json(new ApiResponse(200, {}, "comment deleted"));
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}
