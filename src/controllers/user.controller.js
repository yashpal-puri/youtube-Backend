import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import {deleteFromCloudinary, uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/apiResponse.js";
import {User} from "../models/user.model.js"
import fs from "fs"
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

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

    try {   
    
        if([fullname,email,username,password].some((field)=> field?.trim()==="")){
            throw new apiError(400,"All fields are required");
        }
        if(!email.includes('@') || !email.includes('.')) {
            throw new apiError(400,"Check your email properly");
        }
    
    
        const existedUser =await User.findOne({
            $or: [{ username } , { email }]
        })
        if(existedUser) {
            throw new apiError(409,"User with email or username already exists")
        }
        
        
        
        if(!avatarLocalPath){ 
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
        res.status(201).json(
            new apiResponse(200,createdUser,"User created successfully")
        )
    } catch (error) {
        throw new apiError(400, "Error in user registration: "+error.message);
    } finally{
        fs.existsSync(avatarLocalPath)?fs.unlinkSync(avatarLocalPath):null;
        fs.existsSync(coverImageLocalPath)?fs.unlinkSync(coverImageLocalPath):null;
    }

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
            $unset: {
                refreshToken: 1
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

const changeCurrentPassword = asyncHandler( async (req,res) => {
    //get the old password, new password , confirm new password from the user
    //user id can be obtained fom the req by auth middleware as well
    //verify if new pass and conf new pass matches
    //find user in the database by findandupdate method
    //return response

    try {
        const {oldPassword , newPassword, confnewPassword} = req.body

        if([oldPassword,newPassword,confnewPassword].some(field => !field || field.trim()===""))    
            throw new apiError(400,'all fields are required')
        if(oldPassword===newPassword || newPassword!==confnewPassword)
            throw new apiError(400,'passwords are not valid')

        const user = await User.findById(req.user._id)
        const isMatch = await user?.isPasswordCorrect(oldPassword);
        if(!isMatch)
            throw new apiError(401,'wrong current password');
        
        user.password=newPassword;
        await user.save({validateBeforeSave: false});

        const updatedUser = await User.findById(user._id).select("-password -refreshToken")
        res
            .status(200)
            .json(
                new apiResponse(200,{user: updatedUser},"User password changed successfully")
            )
    } catch (error) {
        throw new apiError(400,"Somethinh went wrong while updating password: "+error.message);
    }


})

const getCurrentUser = asyncHandler( async (req,res)=>{
    try {
        const user = req.user

        res
            .status(200)
            .json(
                new apiResponse(200,{user},"Retrieved current user successfully")
            )
    } catch (error) {
        throw new apiError(400,"Cant get user right now"+error.message)
    }
})

const updateAccountDetails = asyncHandler ( async (req,res)=>{
    
    try {
        const {newfullname,newemail} = req.body
        
        if(!newemail || !newfullname) 
            throw new apiError(400,"Please provide all fields");

        const newUserData = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    email : newemail ? newemail : req.user.email,
                    fullname : newfullname? newfullname : req.user.fullName
                }
            },
            {new : true}
            ).select('-password -refreshToken')
        
        res
            .status(200)
            .json(
                new apiResponse(200,newUserData,"account details updated successfully")
            )
            
    } catch (error) {
        throw new apiError(400, "something wrong while updating details: "+error.message)
    }

})

const updateUserAvatar = asyncHandler (async (req,res)=>{
    try {
        const avatarLocalpath = req.file?.path || null
        if(!avatarLocalpath) 
            throw new apiError(400, 'No image provided');
        const avatar = await uploadOnCloudinary(avatarLocalpath);   
        
        if(!avatar.url)
            throw new apiError(500,"Error in uploading file on cloud")
    
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    avatar:avatar.url
                }
            },
            {
                new: true
            }
        ).select("-password -refreshToken")
    
        await deleteFromCloudinary(req.user.coverImage.match(/\/upload\/v\d+\/(.+)\.\w+$/)[1],"image");
        res
            .status(200)
            .json(
                new apiResponse(200,updatedUser,"user avatar updated successfully")
            )
    } catch (error) {
        throw new apiError(400, error.message);
    }

})
const updateUserCoverImage = asyncHandler (async (req,res)=>{
    try {
        const coverLocalPath = req.file?.path || null
        if(!coverLocalPath) 
            throw new apiError(400, 'No image provided');
        const coverImage = await uploadOnCloudinary(coverLocalPath);   
        
        if(!coverImage.url)
            throw new apiError(500,"Error in uploading file on cloud")
    
        const updatedUser = await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    coverImage: coverImage.url
                }
            },
            {
                new: true
            }
        ).select("-password -refreshToken")
        
        await deleteFromCloudinary(req.user.coverImage.match(/\/upload\/v\d+\/(.+)\.\w+$/)[1],"image");
        res
            .status(200)
            .json(
                new apiResponse(200,updatedUser,"user cover updated successfully")
            )
    } catch (error) {
        throw new apiError(400, error?.message);
    }

})
const getChannelDetails = asyncHandler( async (req,res)=>{
    try {
        const {username} = req.params;
        if(!username?.trim())
            throw new apiError(400,'Invalid channel username');
    
        const channelInfo = await User.aggregate([
            {
                $match : {
                    username : username.toLowerCase()
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
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount : {
                        $size : "$subscribers"
                    },
                    subscribedToCount : {
                        $size : "$subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullname: 1,
                    username: 1,
                    subscribersCount: 1,
                    subscribedToCount: 1,
                    isSubscribed: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ])        
    
        if(!channelInfo.length) 
            throw new apiError(404, "Invalid channel url")
    
        return res
            .status(200)
            .json(
                new apiResponse(200,channelInfo[0],"Channel fetched successfully")
            )
        
    } catch (error) {
        throw new apiError("There is some error in finding channel details: ",error.message);
    }
})
const getWatchHistory = asyncHandler( async (req,res) => {
    try {
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)
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
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            fullName: 1,
                                            username:1,
                                            avatar: 1,
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ])
    
        res
            .status(200)
            .json(
                new apiResponse(200,user[0].watchHistory,"watch History fetched successfuly")
            )
    } catch (error) {
        throw new apiError(400, "error in getting watch history: "+error.message);
    }
}) 
export {registerUser,
        loginUser,
        logoutUser,
        refreshAccessToken,
        changeCurrentPassword,
        getCurrentUser,
        updateAccountDetails,
        updateUserAvatar,
        updateUserCoverImage,
        getChannelDetails,
        getWatchHistory
    }