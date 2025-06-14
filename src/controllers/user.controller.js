import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAccessAndRefreshToken= async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken= user.generateAccessToken()
        const refreshToken=user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Internal server error - While generating refresh and access token")
    }
    
}

const registerUser = asyncHandler( async (req,res)=> {
    //1.) get user details from frontend
    //2.) validation - not empty
    //3.) check if user already exists: with help of username or email
    //4.) check for images, check for avatar
    //5.) upload images to cloudinary, avatar
    //6.) create user object - create entry in DB
    //7.) remove password and refresh token field from response
    //8.) check , Is user created. 
    //9.) return response 

    const {fullName, email, username, password} = req.body
    // if (fullName===""){
    //     throw new ApiError(400, "full name is required")
    // }
    if (
        [fullName,email,username,password].some((field)=> field?.trim === "")
    ) {
        throw new ApiError(400, "All fields are compulsory")
    }

    const existedUser= await User.findOne({
        $or: [{username},{email}]
    })

    if (existedUser){
        throw new ApiError(409, " User with email or same username already exist")
    }

    const avatarLocalPath= req.files?.avatar[0]?.path
    // const coverImageLocalPath= req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0) {
        coverImageLocalPath=req.files.coverImage[0].path
    } else {
        
    }

    if (!avatarLocalPath) {
        throw new ApiError (400,"Avatar file is required")
    }

    const avatar= await uploadOnCloudinary(avatarLocalPath);
    const coverImage= await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }

    const user= await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username:username.toLowerCase()
    })

    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser){
        throw new ApiError(500, "Internal Server Error while registering user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User registered successfully")
    )


} )

const loginUser=asyncHandler(async(req,res)=>{
    // 1. request body ->data
    // 2. username or email
    // 3. find user
    // 4. pass check
    // 5. access and refresh token 
    // 6. send tokens in cookies

    const {email,username,password}=req.body;

    if (!username && !email){
        throw new ApiError(400,"username or email is required")
    }

    const user= await User.findOne({
        $or:[{username},{email}]
    })

    if (!user) {
        throw new ApiError(404,"User doesn't exist")
    }

    const isPasswordValid= await user.isPasswordCorrect(password)

    if (!isPasswordValid) {
        throw new ApiError(401,"Password Incorrect")
    }

    const {accessToken,refreshToken}= await generateAccessAndRefreshToken(user._id)

    const loggedInUser= await User.findById(user._id).select("-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user:loggedInUser,accessToken,refreshToken
            },
            "User logged in successfully"
        )
    )


}

)

const logoutUser=asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
     req.user._id,
     {
        $set:{
            refreshToken:undefined
        }
     },
     {
        new:true
     }
   )

   const options={
    httpOnly:true,
    secure:true
   }

   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json( new ApiResponse (
    200,{},"User loggedout"
   ))
})

export {registerUser,loginUser,logoutUser}