import { v2 as cloudinary } from "cloudinary";
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key:process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary=async(localFilePath)=>{
 try {
    if (!localFilePath) return null
    //File uploading Step:-
    const response= await cloudinary.uploader.upload(localFilePath,{
        resource_type:"auto"
    })
    // File uploaded successfully, next step:-
    console.log("response in cloudinary",response)
    console.log("file is uploaded on cloudinary",response.url)
    return response
 } catch (error) {
    fs.unlinkSync(localFilePath) // remove the local saved temporary file as the upload on cloudinary got failed
    return null
 }
}

export {uploadOnCloudinary}