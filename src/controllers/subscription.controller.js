import mongoose, {isValidObjectId} from "mongoose"
import {Subscription} from "../models/subscription.model.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    if(!channelId?.trim()){
        throw new ApiError(400, "Channel Id is missing");
    }
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel Id");
    }

    const isSubscribed = await Subscription.findOne({
        channel: channelId,
        subscriber: req.user?._id
    })
    
    if(isSubscribed){
        await Subscription.findByIdAndDelete(isSubscribed?._id);

        return res.status(200)
        .json(new ApiResponse(200, {subscribed: false}, "Channel Unsubscribed!"))
    }

    await Subscription.create({
        channel: channelId,
        subscriber: req.user?._id
    });

    return res.status(200)
    .json(new ApiResponse(200, {channel: channelId, subscriber: req.user?.username, subscribed: true}, "Channel Subscribed!"));
})




// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {

    const {channelId} = req.params;
    if(!channelId?.trim()){
        throw new ApiError(400, "Channel Id is missing");
    }
    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid Channel Id");
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "totalSubscribersOfSubscriber"
                        }
                    },
                    {
                        $addFields: {
                            subscribedToSubscriber: {
                                $cond: {
                                    if: {
                                        $in: [req.user?._id, "$totalSubscribersOfSubscriber.subscriber"]
                                    },
                                    then: true,
                                    else: false
                                }
                            },
                            totalSubscribersOfSubscriber: {
                                $size: "$totalSubscribersOfSubscriber"
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            email: 1,
                            fullName: 1,
                            avatar: 1,
                            subscribedToSubscriber: 1,
                            totalSubscribersOfSubscriber: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscriber: {
                    $arrayElemAt: ["$subscriber", 0]
                }
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ])
    if(!subscribers){
        throw new ApiError(404, "Channel Subscribers not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, {subscribersDetails: subscribers}, "Channel subscribers have been fetched successfully"));
})




// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {

    const { subscriberId } = req.params;
    if(!subscriberId?.trim()){
        throw new ApiError(400, "Subscriber Id is missing");
    }
    if(!isValidObjectId(subscriberId)){
        throw new ApiError(400, "Invalid Subscriber Id");
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $lookup: {
                            from: "videos",
                            localField: "_id",
                            foreignField: "owner",
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
                            latestVideo: {
                                $arrayElemAt: ["$videos", -1]
                            }
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            username: 1,
                            email: 1,
                            fullName: 1,
                            avatar: 1,
                            latestVideo: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channel: {
                    $arrayElemAt: ["$channel", 0]
                }
            }
        },
        {
            $project: {
                _id: 0
            }
        }
    ])
    if(!subscribedChannels){
        throw new ApiError(404, "Subscribed channels not found");
    }

    return res.status(200)
    .json(new ApiResponse(200, {subscribedChannelsDetails: subscribedChannels}, "Subscribed channels have been fetched successfully"));

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
