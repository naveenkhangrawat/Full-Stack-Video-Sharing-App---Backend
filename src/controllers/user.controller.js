import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import { removeImageFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);

        if(!user){
            throw new ApiError(500, "Invalid userId");
        }
    
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        if(!accessToken || !refreshToken){
            throw new ApiError(500, "something went wrong while generating tokens");
        }
    
        user.refreshToken = refreshToken;
        await user.save({validateBeforeSave: false});
    
        return {accessToken, refreshToken};
    } catch (error) {
        throw new ApiError(500, "something went wrong while generating tokens");
    }
}

const registerUser = asyncHandler(async function(req, res){
    // get user details from frontend
    // check if the data is not empty
    // check if user already exists : username or email
    //check if images have been uploaded, mainly avatar
    // upload the images on cloudinary, check if images have been uploaded
    //create a user document in the database- check if user is created
    //remove password and refresh token field from the document to send it to response
    // send the response

    const {username, email, fullName, password} = req.body;
    console.log(req.body);

    // if(username === ""){
    //      throw new ApiError(400, 'username is required');
    // }
    if([username, email, fullName, password].some((element) => element?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, 'username or email already existed');
    }

    console.log('uploaded files',req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "avatar file is required");
    }

    const avatarImage = await uploadOnCloudinary(avatarLocalPath);
    let coverImage;
    if(coverImageLocalPath){
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }
    
    
    if(!avatarImage){
        throw new ApiError(500, 'File upload on Cloudinary has failed');
    }

    const newUser = await User.create({
        username: username.toLowerCase(), 
        email, 
        fullName, 
        password, 
        avatar: avatarImage.url,
        coverImage: coverImage?.url || ""
    });
    console.log('newUser: ', newUser);
    const newUserCreated = await User.findById(newUser._id).select("-password -refreshToken");
    console.log('newUserCreated: ', newUserCreated);
    if(!newUserCreated){
        throw new ApiError(500, "something went wrong while registering the user");
    }
    console.log('user created');

    return res.status(201).json(new ApiResponse(200, newUserCreated, "user registered successfully!"));
})

const loginUser = asyncHandler(async function(req, res){
    // req body -> data receive (email, password, username)
    // check if data is not empty or undefined or null
    //find the user, if user does not exist throw an error
    //password check, if password does not match throw an error
    //generate access token, refresh token
    //send cookies

    const {email, username, password} = req.body;
    
    // !email && !username 
    //false (email hai)
    //false (username hai)
    //false (email and username both hai)
    //true (email and username dono nahi hai)

    // !(email || username)
    //false
    //false
    //false
    //true
    if(!(email || username)){
        throw new ApiError(400, "username or email is required");
    }
    if(!password){
        throw new ApiError(400, "password is required");
    }

    const user = await User.findOne({
        $or: [{username}, {email}]
    })
    if(!user){
        throw new ApiError(404, "Invalid username or email! user does not exist");
    }

    const isPasswordValid = await user.isPasswordCorrect(password);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid Password")
    }

    const {refreshToken, accessToken} = await generateAccessAndRefreshTokens(user._id);

    const updatedUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "None"
    }

    return res.status(200)
    .cookie("access_token", accessToken, options)
    .cookie("refresh_token", refreshToken, options)
    .json(new ApiResponse(
        200,
        {
            user: updatedUser, 
            accessToken, 
            refreshToken
        },
        "user logged in successfully"
        ));
})


const logoutUser = asyncHandler(async function(req, res){
    
    //find the user, if not throw an error
    //clear the refreshToken field
    //clear the cookies

    const result = await User.findByIdAndUpdate(req.user._id, 
        {
            $unset: {
                refreshToken: "",
            }
        },
        {
            new: true
        });


        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }

        return res
        .status(200)
        .clearCookie("access_token", options)
        .clearCookie("refresh_token", options)
        .json(new ApiResponse(200, {}, "User Logged Out"));
});

const refreshingAccessToken = asyncHandler(async function(req, res){
    // obtain the refresh token from the client
    // check if the token is received, if not throw an error
    // verify the refresh token
    // check if the token has been verified, if not throw an error
    // match the incoming refresh token with the refresh token stored in the database
    // if they don't match, throw an error
    // if they match, generate new access and refresh token
    // store the new refresh token in the database
    // send them in the cookies

    const incomingRefreshToken = req.cookies?.refresh_token || req.body.refresh_token;
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    if(!decodedToken){
        throw new ApiError(401, "Invalid Refresh Token");
    }

    const user = await User.findById(decodedToken?._id);
    if(!user){
        throw new ApiError(401, "Invalid Refresh Token");
    }

    if(incomingRefreshToken !== user?.refreshToken){
        throw new ApiError(401, "Invalid Refresh Token");
    }

    const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user?._id);

    await User.findByIdAndUpdate(user._id, 
        {
            $set: {
                refreshToken: refreshToken,
            }
        }, 
        {
            new: true
        });


    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("access_token", accessToken, options)
    .cookie("refresh_token", refreshToken, options)
    .json(new ApiResponse(
        200, 
        {accessToken, refreshToken}, 
        "Access Token refreshed"
    ));

})

const changeCurrentPassword = asyncHandler(async function(req, res){
    // find the user
    // obtain the old password and new password from the client, check if it is not empty
    // validate the old password with the stored one, if don't match throw an error
    // match the new password with the stored one, if it matches throw an error
    // store the new password in the database

    const user = await User.findById(req.user?._id);
   
    const {oldPassword, newPassword} = req.body; 
    if([oldPassword, newPassword].some((element) => element?.trim() === "")){
        throw new ApiError(400, "All fields are required");
    }

    const isPasswordValid = await user.isPasswordCorrect(oldPassword);
    if(!isPasswordValid){
        throw new ApiError(401, "Invalid Password");
    }

    const isNewPasswordValid = await user.isPasswordCorrect(newPassword);
    if(isNewPasswordValid){
        throw new ApiError(401, "New password is same as current password! Try another one");
    }

    user.password = newPassword;
    await user.save({validateBeforeSave: false});

    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
})

const getCurrentUser = asyncHandler(async function(req, res){
    
    return res.status(200)
    .json(new ApiResponse(200, {userData: req.user}, "current user fetched successfully"));
})

const updateAccountDetails = asyncHandler(async function(req, res){

    const {fullName, email} = req.body;

    if(!fullName || !email){
        throw new ApiError(400, "All fields are required");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                fullName,
                email
            }
        },
        {
            new: true
        }
    ).select("-password -refreshToken");

    return res.status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
})

const updateUserAvatar = asyncHandler(async function(req, res){
    const avatarLocalPath = req.file?.path;
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required");
    }

    const avatarImage = await uploadOnCloudinary(avatarLocalPath);
    if(!avatarImage){
        throw new ApiError(400, "Avatar file upload on Cloudinary has been failed");
    }

    const avatarPublicId = req.user?.avatar?.split("/").pop().split(".")[0]
    await removeImageFromCloudinary(avatarPublicId);


    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                avatar: avatarImage?.url
            }
        }, 
        {
            new: true
        }
    ).select("-password -refreshToken");

    return res.status(200)
    .json(new ApiResponse(200, user, "Avatar has been updated successfully"));
})

const updateUserCoverImage = asyncHandler(async function(req, res){
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover Image is required");
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage){
        throw new ApiError(400, "CoverImage file upload on Cloudinary has been failed");
    }

    const coverImagePublicId = req.user?.coverImage?.split("/").pop().split(".")[0]
    await removeImageFromCloudinary(coverImagePublicId);

    const user = await User.findByIdAndUpdate(req.user?._id, 
        {
            $set: {
                coverImage: coverImage?.url
            }
        }, 
        {
            new: true
        }
    ).select("-password -refreshToken");

    return res.status(200)
    .json(new ApiResponse(200, user, "CoverImage has been updated successfully"));
})

const getUserChannelProfile = asyncHandler(async function(req, res){
    const {username} = req.params;
    if(!username?.trim()){
        throw new ApiError(400, "username is missing");
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "channelsSubscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$channelsSubscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [{channel: "$_id", subscriber: req.user?._id}, "$subscribers"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: true,
                username: true,
                avatar: true,
                coverImage: true,
                email: true,
                subscribersCount: true,
                channelsSubscribedToCount: true,
                isSubscribed: true
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "channel does not exist");
    }

    return res.status(200)
    .json(new ApiResponse(200, {channelData: channel[0]}, "Channel data fetched successfully"));
})

const getUserWatchHistory = asyncHandler(async function(req, res){

    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $sort: {
                            updatedAt: -1
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
        }
    ])

    return res.status(200)
    .json(new ApiResponse(200, {userWatchHistory: user[0].watchHistory}, "Watch History fetched successfully"));
})

export {
    registerUser, 
    loginUser, 
    logoutUser, 
    refreshingAccessToken, 
    changeCurrentPassword, 
    getCurrentUser, 
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}







