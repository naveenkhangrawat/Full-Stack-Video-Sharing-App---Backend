import { User } from "../models/user.model.js";
import ApiError from "../utils/ApiError.js"
import ApiResponse from "../utils/ApiResponse.js"
import asyncHandler from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";


const verifyJWT = asyncHandler(async function(req, res, next){
    //obtain the token from the client sent along with the request through cookies or request header
    //check if the token is received, if not throw an error
    //verify the token and store the decoded payload data
    //check if the token has been verified, if not throw an error
    //find the user using decoded payload data, if user doesn't exist throw an error
    //modify the request object and add a field for user data
    // call next()

    const incomingToken = req.cookies?.access_token || req.header("Authorization")?.replace("Bearer ", "");

    if(!incomingToken){
        throw new ApiError(401, "Unauthorized request");
    }

    const decodedToken = jwt.verify(incomingToken, process.env.ACCESS_TOKEN_SECRET);
    if(!decodedToken){
        throw new ApiError(401, "Access token has expired");
    }

    const user = await User.findById(decodedToken?._id).select("-password -refreshToken");
    if(!user){
        throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
})


export default verifyJWT;