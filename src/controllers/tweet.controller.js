import { asyncHandler } from "../utils/asyncHandler.js";
import {apiError} from "../utils/apiError.js"
import { apiResponse } from "../utils/apiResponse.js";
import {Tweet} from "../models/tweet.model.js"

const createTweet = asyncHandler( async (req,res) => {
    try {
        const {content} = req.body;
        if(!content || !content.trim())
            throw new apiError(404,"content is not available please provide it!")
        const createdTweet = await Tweet.create(
            {
                content,
                user: req.user,
            }
        )

        if(!createdTweet)
            throw new apiError(500,"Error in creating tweet")

        res
            .status(200)
            .json(
                new apiResponse(200,createdTweet,"tweet created successfully!")
            )

    } catch (error) {
        throw new apiError(401, "Some error in creating tweet: "+error.message);
    }
})

const editTweet = asyncHandler( async (req,res)=>{
    try {
        const {tweetId,newContent}= req.body;
    
        if(!tweetId || !newContent)
            throw new apiError(404,"Couldnt get all the required details")
    
        const tweet= await Tweet.findById(tweetId)
        if(!tweet || tweet.owner._id != req.user._id) 
            throw new apiError(401,"tweet not available to edit")
    
        const updatedTweet = await Tweet.findByIdAndUpdate(
            tweetId,
            {
                $set: {
                    content: newContent
                }
            },
            {
                new: true
            }
        )
    
        if(!updatedTweet)
            throw new apiError(500,"error in updating the tweet")
    
        res
            .status(200)
            .json(
                new apiResponse(200,updatedTweet,"tweet updated successfully!")
            )
    } catch (error) {
        throw new apiError(400,"error in updating the tweet "+error.message);
    }    
})

const deleteTweet = asyncHandler ( async (req,res)=>{
    try {
        const {tweetId} = req.params
        if(!tweetId?.trim())
            throw new apiError(400,"Please provide the tweet id")
        const tweet =await Tweet.findById(tweetId);
        if(!tweet || tweet.owner._id != req.user._id)
            throw new apiError(401,"tweet not available to delete")
        const response = await Tweet.findByIdAndDelete(tweetId);
        if(!response)
            throw new apiError(500,"internal error in deleting the tweet")
        res 
            .status(200)
            .json(
                new apiResponse(200,{},"tweet deleted successfully!")
            )

    } catch (error) {
        throw new apiError(400,"Error in deleting the tweet: "+error.message);
    }
})

const getUserTweets = asyncHandler( async (req,res) => {
    try {
        
        const tweets=  await Tweet.find({owner :  req.user})
        if(!tweets)
            throw new apiError(500,"error in fetching the tweets")
        res
            .status(200)
            .json(new apiResponse(200,tweets, "all user's tweets fetched successfully!"))

    } catch (error) {
        throw new apiError(401,"error in getting tweets of the user: "+error.message)

    }
})

export {
    createTweet,
    editTweet,
    deleteTweet,
    getUserTweets
}