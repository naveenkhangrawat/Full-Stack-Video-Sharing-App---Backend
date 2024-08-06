import mongoose, {isValidObjectId} from "mongoose";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";
import { Video } from "../models/video.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { uploadOnCloudinary, removeImageFromCloudinary, removeVideoFromCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";



const getAllVideos = asyncHandler(async (req, res) => {
    //TODO: get all videos based on query, sort, pagination
    
    const { textQuery, userId } = req.query;

    // create search index in MongoDB atlas for full text search
    // provide the name of the search index that was created in 'index' field
    // provide the text you want to search for in 'query' field
    // specify the fields for the search index, fields in which it should search for the text

    if(textQuery?.trim()){
        const searchVideos = await Video.aggregate([
            {
                $search: {
                    index: "searchVideos",
                    text: {
                        query: textQuery,
                        path: ["title", "description"]
                    }
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
                                avatar: 1,
                                email: 1
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
        ])
        if(!searchVideos){
            throw new ApiError(404, "No videos found");
        }
        
        return res.status(200)
        .json(new ApiResponse(200, {searchVideos}, "videos fetched successfully"))
    }

    if(userId?.trim()){
        if(!isValidObjectId(userId)){
            throw new ApiError(400, "Invalid User Id");
        }

        const channelVideos = await Video.aggregate([
            {
                $match: {
                    owner: new mongoose.Types.ObjectId(userId),
                    isPublished: true
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            }
        ])
        if(!channelVideos){
            throw new ApiError(404, "No videos found");
        }
        return res.status(200)
        .json(new ApiResponse(200, {channelVideos}, "videos fetched successfully"))

    }

    const allVideos = await Video.aggregate([
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
                            avatar: 1,
                            email: 1
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
    ])

    if(!allVideos){
        throw new ApiError(404, "No videos found")
    }

    return res.status(200)
    .json(new ApiResponse(200, {allVideos}, "videos fetched successfully"));
})



const publishAVideo = asyncHandler(async (req, res) => {
    // TODO: get video, upload to cloudinary, create video
    
    const { title, description} = req.body;
    if(!title?.trim() || !description?.trim()){
        throw new ApiError(400, "All fields are required");
    }

    // console.log(req.files);
    const videoFileLocalPath = req.files?.videoFile?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;
    if(!videoFileLocalPath){
        throw new ApiError(400, "Video file is required");
    }
    if(!thumbnailLocalPath){
        throw new ApiError(400, "Thumbnail is required");
    }

    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    if(!videoFile){
        throw new ApiError(500, "Video file upload on cloudinary has failed");
    }
    if(!thumbnail){
        throw new ApiError(500, "Thumbnail file upload on cloudinary has failed");
    }
    // console.log(videoFile);
    // console.log(thumbnail);
    
    const publishedVideo = await Video.create({
        videoFile: {
            url: videoFile?.url,
            public_id: videoFile?.public_id
        },
        thumbnail: {
            url: thumbnail?.url,
            public_id: thumbnail?.public_id
        },
        title,
        description,
        duration: videoFile?.duration,
        isPublished: true,
        owner: req.user?._id,
    });
    if(!publishAVideo){
        throw new ApiError(500, "Something went wrong while publishing a video");
    }

    return res.status(200)
    .json(new ApiResponse(200, publishedVideo, "Video has been published successfully"));
})



const getVideoById = asyncHandler(async (req, res) => {
    //TODO: get video by id
    
    const { videoId } = req.params;
    if(!videoId?.trim()){
        throw new ApiError(400, "video Id is missing");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(400, "Invalid video Id");
    }

    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
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
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$subscribers.subscriber"]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            email: 1,
                            fullName: 1,
                            avatar: 1,
                            isSubscribed: 1,
                            subscribersCount: 1
                        }
                    }
                ]
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
                owner: {
                    $arrayElemAt: ["$owner", 0]
                },
                totalLikes: {
                    $size: "$likes_details"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes_details.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                likes_details: false
            }
        }
    ])
    if(!video?.length){
        throw new ApiError(404, "video not found");
    }

    // increase views of the video
    await Video?.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });

    // add video to the user's watch history
    await User?.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    })

    return res.status(200)
    .json(new ApiResponse(200, {videoDetails: video[0]}, "video has been fetched successfully"));
})



const updateVideo = asyncHandler(async (req, res) => {
    //TODO: update video details like title, description, thumbnail
    
    const { videoId } = req.params;
    const { title, description} = req.body;
    if(!videoId?.trim()){
        throw new ApiError(200, "Video Id is missing");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(200, "Invalid video Id");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "Video not found");
    }

    const thumbnailLocalPath = req.file?.path;
    let thumbnail;
    if(thumbnailLocalPath){
        thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
        if(!thumbnail){
            throw new ApiError(500, "Thumbnail file upload on cloudinary has failed");
        }
        
        await removeImageFromCloudinary(video?.thumbnail?.public_id);
    }

    const updatedVideo = await Video.findByIdAndUpdate(videoId, {
        $set: {
            title: title || video?.title,
            description: description || video?.description,
            thumbnail: {
                url: thumbnail?.url || video?.thumbnail?.url,
                public_id: thumbnail?.public_id || video?.thumbnail?.public_id
            }
        }
    },
    {
        new: true
    })
    if(!updatedVideo){
        throw new ApiError(404, "Video not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, {updatedVideo}, "video updated successfully"));

})



const deleteVideo = asyncHandler(async (req, res) => {
    //TODO: delete video
    
    const { videoId } = req.params;
    if(!videoId?.trim()){
        throw new ApiError(200, "video Id is missing");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(200, "Invalid video Id");
    }

    const deletedVideo = await Video.findByIdAndDelete(videoId);
    if(!deletedVideo){
        throw new ApiError(404, "video not found");
    }

    await Like.deleteMany({
        video: videoId
    })

    await Comment.deleteMany({
        video: videoId
    })

    await removeVideoFromCloudinary(deletedVideo?.videoFile?.public_id);

    return res.status(200)
    .json(new ApiResponse(200, {}, "video deleted successfully"));
})



const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    if(!videoId?.trim()){
        throw new ApiError(200, "video Id is missing");
    }
    if(!isValidObjectId(videoId)){
        throw new ApiError(200, "Invalid Video Id");
    }

    const video = await Video.findById(videoId);
    if(!video){
        throw new ApiError(404, "video not found");
    }

    
    const togglePublishedVideo = await Video.findByIdAndUpdate(videoId, {
        $set: {
            isPublished: !video?.isPublished
        }
    },
    { 
        new: true 
    })
    if(!togglePublishedVideo){
        throw new ApiError(404, "video not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, togglePublishedVideo, "video published successfully"));

})



export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
