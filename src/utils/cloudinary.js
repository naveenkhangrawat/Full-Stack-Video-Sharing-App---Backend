
import {v2 as cloudinary} from "cloudinary";
import fs from "fs";


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
    
})


async function uploadOnCloudinary(localFilePath){
    try {
        const response = await cloudinary.uploader.upload(localFilePath, {resource_type: "auto"});
        console.log("File has been uploaded on Cloudinary: ", response.url);

        fs.unlinkSync(localFilePath);

        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath);
        console.log(error);
        return null;
    }
}

async function removeImageFromCloudinary(imagePublicId){
    try {
        const response = await cloudinary.api.delete_resources([imagePublicId], {type: 'upload', resource_type: 'image'});
        console.log("Previous file has been removed from cloudinary");

        return response;
    } catch (error) {
        console.log(error);
        return null;
    }
}

async function removeVideoFromCloudinary(videoPublicId){
    try {
        const response = await cloudinary.api.delete_resources([videoPublicId], {type: 'upload', resource_type: 'video'});
        console.log("Previous file has been removed from cloudinary");

        return response;
    } catch (error) {
        console.log(error);
        return null;
    }
}



export {uploadOnCloudinary, removeImageFromCloudinary, removeVideoFromCloudinary};