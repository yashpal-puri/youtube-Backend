import { User } from "../models/user.model.js";
import { apiError } from "../utils/apiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"


export const verifyJWT = asyncHandler(async (req,_,next)=>{
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ","")
        if(!token) 
            throw new apiError(401,"Unauthorized request");
    
        const decodedInfo = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
        if(!decodedInfo)
            throw new apiError(500, "Some internal error while retrieving the information")
     
        const user = await User.findById(decodedInfo._id).select(
            "-password -refreshToken"
        )
    
        if(!user) 
            throw new apiError(401, "Invalid access token")
    
        req.user = user;
        next();
    } catch (error) {
        throw new apiError(400,error.message);
    }
    
}) 