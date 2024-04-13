import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import {User} from "../models/user.model.js"
import fs from "fs"
import jwt from "jsonwebtoken";

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
const generateAndSaveAccessRefreshToken = async (userId)=>{
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken();
        const refreshToken = await user.generateRefreshToken();
        user.refreshToken= refreshToken
        await user.save({validateBeforeSave: false});

        return {accessToken,refreshToken};
    
    } catch (error) {
        throw new apiError(500, "Error while generating the access refresh tokens")
    }
}
const loginUser = asyncHandler( async (req,res) => {
    //get the username/email & password from user 
    //field validation
    //database query execute
    //return error if invalid credentials
    //create session if correct details 
    //provide access token and refresh token to that user object
    //send them in cookies

    const {usernamemail , password} = req.body
    if(!usernamemail || !password)
        throw new apiError(400, "Please Provide both the username/mail and password")
    

    const user = await User.findOne({
        $or: [{"username": usernamemail},{"email": usernamemail}]
    })

    if(!user)
        throw new apiError(404, "Username not valid as per our database")

    const isValidUser = await user.isPasswordCorrect(password);

    if(!isValidUser) 
        throw new apiError(401,"Password is incorrect");

    const {accessToken,refreshToken} = await generateAndSaveAccessRefreshToken(user._id);



    const loginnedUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    //for cookies
    const options= {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",refreshToken,options)
        .json(
            new apiResponse(200,{
                        user: loginnedUser,
                        accessToken,
                        refreshToken
                    },
                "User loginned successfully"
            )
        )
})
const logoutUser = asyncHandler(async (req,res)=>{
    //clear refresh token from db
    //clear access&refresh tokens from client side cookies

    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true,
        }
    )
    
    
    const options= {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accessToken",options)
        .clearCookie("refreshToken","",options)
        .json(
            new apiResponse(200,{},"User loggedOut successfully")
        )    

})

const refreshAccessToken = asyncHandler( async (req,res) => {
    const existingrefreshToken = req.cookies.refreshToken || req.body.refreshToken || ""; 
    if(!existingrefreshToken)
        throw new apiError(401,"Unauthorized access");
    try {
    
        const decodedUser = jwt.verify(existingrefreshToken,process.env.REFRESH_TOKEN_SECRET)
        const user = await User.findById(decodedUser?._id);
        
        if(!user)
            throw new apiError(401,"user does not exist");

        if(user.refreshToken!==existingrefreshToken)
            throw new apiError(404, "toeken expired ");
    
        const {accessToken,refreshToken} = await generateAndSaveAccessRefreshToken(user._id);
    
        const options= {
            httpOnly: true,
            secure: true,
        }
    
        res
            .status(200)
            .cookie("accessToken",accessToken,options)
            .cookie("refreshToken",refreshToken,options)
            .json(
                new apiResponse(200,{accessToken,refreshToken},"access Token refreshed successfully")
            )
        
    } catch (error) {
        throw new apiError(400,"Something went wrong - "+ error.message)
    }
})

export {registerUser,loginUser,logoutUser,refreshAccessToken}