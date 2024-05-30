import {asyncHandler} from "../utils/asyncHandler.js"
import {apiResponse} from "../utils/apiResponse.js"
import {apiError} from "../utils/apiError.js"
import {Video} from "../models/video.model.js"
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js"
import fs from "fs"
import mongoose, {isValidObjectId} from "mongoose"
import aggregatePaginate from "mongoose-aggregate-paginate-v2"


const uploadVideo = asyncHandler(async (req,res)=>{
    const videoLocalPath = req.files?.video?.[0]?.path||null;
    const thumbnailLocalPath= req.files?.thumbnail?.[0]?.path||null;
    try {
        const {title,description,isPublished}= req.body;
        if([title,description].some(field => !field))
            throw new apiError(404,"Required fields are not found");

        if(!videoLocalPath)
            throw new apiError(404,"Video not found!");

        const video= await uploadOnCloudinary(videoLocalPath);
        let thumbnail=null;
        if(thumbnailLocalPath)
            thumbnail= await uploadOnCloudinary(thumbnailLocalPath);
        if(!video)
            throw new apiError(500,"Error in uploading video on cloud!")

        const result = await Video.create({
            videoFile: video.secure_url,
            thumbnail: thumbnail?.url||"",
            owner: req.user._id,
            title,
            description,
            duration: video.duration,
            isPublished: isPublished || true
        })

        if(!result)
            throw new apiError(500,"Internal error in storing the video in database!")

        res
            .status(200)
            .json(
                new apiResponse(200,result,"Video saved stored successfully!")
            )



    } catch (error) {
        throw new apiError(400,"Some error in uploading the video!"+error.message);
    }finally{
        fs.existsSync(videoLocalPath)?fs.unlinkSync(videoLocalPath):null;
        fs.existsSync(thumbnailLocalPath)?fs.unlinkSync(thumbnailLocalPath):null;
    }

})

const editVideoDetails = asyncHandler(async (req,res)=>{
    try {
        const id = req.params.id;
        if(!id || !isValidObjectId(id))
            throw new apiError(400,"No video ID provided or invalid video id!");

        const video = await Video.findById(id);
        if(!video) 
            throw new apiError(400,"No video found for the requested url id")

        if(video.owner !== req.user._id)
                throw new apiError(400,"You are not authorized to edit this video!")
        
        const {title,description,isPublished} = req.body;
        
        if(!title || !description || !isPublished) 
            throw new apiError(400,"Please provide any field to update");

        const updatedVideo = await User.findByIdAndUpdate(
            id,
            {
                $set: {
                    title: title || video.title,
                    description :  description || video.description,
                    isPublished: isPublished || video.isPublished 
                }
            },
            {new : true}
            )
        
        res
            .status(200)
            .json(
                new apiResponse(200,updatedVideo,"video details updated successfully")
            )
            
    } catch (error) {
        throw new apiError(400, "something went wrong while updating details: "+error.message)
    }
})

const editThumbnail = asyncHandler( async  (req,res) =>{
    const thumbLocalPath = req.file?.path || null
    try {
        const id = req.params.id;
        if(!id || !isValidObjectId(id)) 
            throw new apiError(400,"Video id not found in the url or it's invalid")

        const video = await Video.findById(id);
        
        if(video?.owner != req.user._id)
            throw new apiError(401,"Unauthorized access to update the video thumbnail")

        if(!thumbLocalPath) 
            throw new apiError(400, 'No image provided for thumbnail');

        const thumbnail = await uploadOnCloudinary(thumbLocalPath);   
        
        if(!thumbnail.url)
            throw new apiError(500,"Error in uploading file on cloud")
    
        const updatedVideo = await Video.findByIdAndUpdate(
            id,
            {
                $set: {
                    thumbnail: thumbnail.url
                }
            },
            {
                new: true
            }
        )
        
        await deleteFromCloudinary(video.thumbnail.match(/\/upload\/v\d+\/(.+)\.\w+$/)[1]);
        res
            .status(200)
            .json(
                new apiResponse(200,updatedVideo,"thumbnail updated successfully")
            )
    } catch (error) {
        throw new apiError(400, "some error in updating the thumbnail of the video "+error?.message);
    }
})

const deleteVideo = asyncHandler(async (req,res)=>{
    try {
        const id= req.params.id;
        if(!id || !isValidObjectId(id)) 
            throw new apiError(400,"no video id found or it's invalid")
        const video= await Video.findByIdAndDelete(id);
        if(!video)
            throw new apiError(500,"Some error internally in deleting the video from cloud")

        if(video.owner !== req.user._id)
            throw new apiError(400,"You are not authorized to delete this video!")

        await deleteFromCloudinary(video.thumbnail.match(/\/upload\/v\d+\/(.+)\.\w+$/)[1],"image");        
        await deleteFromCloudinary(video.videoFile.match(/\/upload\/v\d+\/(.+)\.\w+$/)[1],"video");        

        res
            .status(200)
            .json(
                new apiResponse(200,{},"Video deleted successfully!")
            )
    } catch (error) {
        throw new apiError(500,"Something wrong while deleting the video: "+error?.message)
    }
})

const getAllVideos = asyncHandler(async  (req,res)=> {
    try {
        const { page = 1, limit = 10, sortBy= "asc", channel } = req.query

        if(!channel || !isValidObjectId(channel))
            throw new apiError(400,"channel id not found in the url or its invalid");
        
        if(!["asc", "desc", "ascending", "descending", "1", "-1"].includes(sortBy)){
            throw new apiError(400,"sortBy is invalid, use only asc, desc, ascending, descending, 1, and -1")
        }

        const vidAgg = await Video.aggregate();


        const options = {
            page,
            limit,
            sort: {updatedAt: sortBy}
          };
        const videos = await Video.aggregatePaginate(vidAgg,options);       


        if(!videos)
            throw new apiError(500,"Internal error in finding the videos")

        res
            .status(200)
            .json(
                new apiResponse(200,videos.docs,`Total ${videos.totalDocs} Videos fetched successfully`)
            )
    } catch (error) {
        throw new apiError(400,"Some error in getting all the videos"+error?.message);
    }
})

const getVideo = asyncHandler(async (req,res)=>{
    try {
        const vid = req.params.id;
        if(!vid || !isValidObjectId(vid))
            throw new apiError(400,"Video id not found in the url or it's invalid");

        const video = await Video.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup : {
                    from: "users",
                    localField: "owner",
                    foreignField: "_id",
                    as: "owner",
                    pipeline: [
                        {
                            $project: {
                                fullname: 1,
                                email: 1,
                                uername: 1,
                                avatar: 1
                            }
                        }
                    ]
                }
            },
            {
                $addFields: {
                    $addFields: {
                        ownerUser: {
                            $first: "$owner"
                        }
                    }
                }
            }
        ])

        if(!video){
            throw new apiError(500,"Internal error in getting the video details")
        }

        res
            .status(200)
            .json(
                new apiResponse(200,video[0],"Video fetched successfully!")
            )
    } catch (error) {
        throw new apiError(400,"Some error in finding video details"+error?.message);
    }
})


const toggleStatus = asyncHandler(async (req,res)=>{
    try {
        const vid = req.params.id;

        if(!vid || !isValidObjectId(vid))
            throw new apiError(400,"Video id not found in the url or it's invalid");

        const video = await Video.findById(id);

        if(!video) 
            throw new apiError(400,"No video found for the requested url id")
        
        if(video.owner !== req.user._id)
            throw new apiError(400,"You are not authorized to toggle status for this video!")

        const updatedVideo = await User.findByIdAndUpdate(
            id,
            {
                $set: {
                    isPublished: !video.isPublished 
                }
            },
            {new : true}
            )
        
        res
            .status(200)
            .json(
                new apiResponse(200,updatedVideo,"video publishStatus toggled successfully")
            )

    } catch (error) {
        throw new apiError(500, "Some error in toggling the status of video: "+error?.message);
    }
})

export {
    uploadVideo,
    editVideoDetails,
    editThumbnail,
    deleteVideo,
    getAllVideos,
    getVideo,
    toggleStatus
}
