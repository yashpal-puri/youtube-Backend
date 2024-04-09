import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import {User} from "../models/user.model.js"
import fs from "fs"

const registerUser = asyncHandler( async (req,res) =>{
    // get user details from frontend
    // validation
    // check if user already exist (by email & username)
    // check if files are there: avatar (req) , cover_image(not req) 
    // upload them to cloudinary 
    // check if success or not
    // make user object 
    // create entry in db
    // remove password & refresh token from response
    // check if response has arrived or not
    // return response or error based on user creation

    const {username,email,fullname,password}= req.body
    const avatarLocalPath = req.files?.avatar?.[0]?.path||null;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path || null;   


    if([fullname,email,username,password].some((field)=> field?.trim()==="")){
        avatarLocalPath?fs.unlinkSync(avatarLocalPath):null;
        coverImageLocalPath?fs.unlinkSync(coverImageLocalPath):null;
        throw new apiError(400,"All fields are required");
    }
    if(!email.includes('@') || !email.includes('.')) {
        avatarLocalPath?fs.unlinkSync(avatarLocalPath):null;
        coverImageLocalPath?fs.unlinkSync(coverImageLocalPath):null;
        throw new apiError(400,"Check your email properly");
    }


    const existedUser =await User.findOne({
        $or: [{ username } , { email }]
    })
    if(existedUser) {
        avatarLocalPath?fs.unlinkSync(avatarLocalPath):null;
        coverImageLocalPath?fs.unlinkSync(coverImageLocalPath):null;
        throw new apiError(409,"User with email or username already exists")
    }
    
    
    
    if(!avatarLocalPath){ 
        coverImageLocalPath?fs.unlinkSync(coverImageLocalPath):null;
        throw new apiError(400,"Avatar file is mandatory");
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath);
    const coverImage= await uploadOnCloudinary(coverImageLocalPath);
    if(!avatar) throw new apiError(400,"Error in uploading avatar image");



    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase(),
    })
    
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new apiError(500,"Something went wrong while registering");
    }
    return res.status(201).json(
        new apiResponse(200,createdUser,"User created successfully")
    )

})

export {registerUser}