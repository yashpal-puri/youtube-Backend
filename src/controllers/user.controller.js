import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import {User} from "../models/user.model.js"

const registerUser = asyncHandler( async (req,res) =>{
    // get user details from frontend
    const {username,email,fullname,password}= req.body
    console.log(username,email, fullname,password);

    // validation
    if([fullname,email,username,password].some((field)=> field?.trim()==="")){
        throw new apiError(400,"All fields are required");
    }
    if(!email.includes('@') || !email.includes('.')) 
        throw new apiError(400,"Check your email properly");

    // check if user already exist (by email & username)
    const existedUser = User.findOne({
        $or: [{ username } , { email }]
    })
    if(existedUser) {
        console.log(existedUser);
        throw new apiError(409,"User with email or password already exists")
    }

    // check if files are there: avatar (req) , cover_image(not req) 
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverImageLocalPath = req.files?.coverImage[0]?.path;
    if(!avatarLocalPath) throw new apiError(400,"Avatar file is mandatory");

    // upload them to cloudinary 
    const avatar= await uploadOnCloudinary(avatarLocalPath);
    const cover= await uploadOnCloudinary(coverImageLocalPath);

    // check if success or not
    if(!avatar) throw new apiError(400,"Error in uploading avatar image");

    // make user object 
    // create entry in db
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url||"",
        email,
        password,
        username:username.toLowerCase(),
    })
    
    // remove password & refresh token from response
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    // check if response has arrived or not
    // return response or error based on user creation
    if(!createdUser)
        throw new apiError(500,"Something went wrong while registering");
    
    return res.status(201).json(
        new apiResponse(200,createdUser,"User created successfully")
    )

})

export {registerUser}