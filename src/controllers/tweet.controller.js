import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {Like} from "../models/like.model.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    // get the tweet from the user and check 
    // get the user from req.user
    // create a tweet document and check
    // send the response

    const {content} = req.body;
    if(!content?.trim()){
        throw new ApiError(400, "Tweet content is required");
    }

    const tweet = await Tweet.create({
        content,
        owner: req.user?._id
    })
    if(!tweet){
        throw new ApiError(500, "Tweet creating operation has been failed!")
    }

    const newCreatedTweet = await Tweet.findById(tweet?._id).select("-owner -updatedAt");

    return res.status(200)
    .json(new ApiResponse(200, newCreatedTweet, "Tweet has been created successfully"));
})


const getUserTweets = asyncHandler(async (req, res) => {
    // get the user from req.user
    // find all the tweets of a user
    // send the response

    const {userId} = req.params;
    if(!userId?.trim()){
        throw new ApiError(400, "user Id is missing");
    }
    if(!isValidObjectId(userId)){
        throw new ApiError(400, "Invalid User Id");
    }

    const tweets = await Tweet.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
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
                from: "likes",
                localField: "_id",
                foreignField: "tweet",
                as: "like_details",
            }
        },
        {
            $addFields: {
                owner: {
                    $arrayElemAt: ["$owner", 0]
                },
                totalLikes: {
                    $size: "$like_details"
                },
                isLiked: {
                    $cond: {
                        if: {$in : [req.user?._id, "$like_details.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                content: 1,
                owner: 1,
                totalLikes: 1,
                isLiked: 1,
                createdAt: 1
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])
    if(!tweets){
        throw new ApiError(404, "Tweets not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, {tweets}, "Tweets has been fetched successfully"));
})


const updateTweet = asyncHandler(async (req, res) => {
    const {content} = req.body;
    const {tweetId} = req.params;
    if(!tweetId?.trim()){
        throw new ApiError(400, "Tweet Id is missing");
    }
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet Id");
    }
    if(!content?.trim()){
        throw new ApiError(400, "Tweet content is required");
    } 

    const updatedTweet = await Tweet.findByIdAndUpdate(tweetId, {
        $set: {
            content
        }
    },
    {
        new: true
    })
    if(!updatedTweet){
        throw new ApiError(400, "Invalid Tweet Id");
    }

    return res.status(200)
    .json(new ApiResponse(200, updateTweet, "Tweet has been updated successfully"));
})


const deleteTweet = asyncHandler(async (req, res) => {
    const {tweetId} = req.params;
    if(!tweetId?.trim()){
        throw new ApiError(400, "tweet Id is missing");
    }
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400, "Invalid Tweet Id");
    }

    const deletedTweet = await Tweet.findByIdAndDelete(tweetId);
    if(!deletedTweet){
        throw new ApiError(400, "Invalid tweet Id");
    }

    await Like.deleteMany({
        tweet: tweetId
    })

    return res.status(200)
    .json(new ApiResponse(200, {}, "tweet has been deleted successfully"));
})


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
