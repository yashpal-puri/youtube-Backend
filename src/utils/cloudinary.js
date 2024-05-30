import {v2 as cloudinary} from 'cloudinary';
import fs from "fs"
          
cloudinary.config({ 
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET,
});


const uploadOnCloudinary= async (localfilepath)=>{
    try{
        if(!localfilepath) return null;
        //upload on cloudinary
        const res = await cloudinary.uploader.upload(localfilepath,{
            resource_type: 'auto'
        })        
        if(res) fs.unlinkSync(localfilepath)   // remove local file as uploading got success
        return res;
    }catch(error){
        fs.unlinkSync(localfilepath)   // remove local file as uploading got failed
        return null;
    }
}

const deleteFromCloudinary= async (public_id,type) => {
    try {
        const res = await cloudinary.uploader.destroy(public_id,{
            resource_type: type
        }) 
        if(res){
            console.log("file deleted successfully");
            return true;
        }
    } catch (error) {
        console.log("Error in deleting the file: ",error.message);
        return false;
    }
}


export {uploadOnCloudinary,deleteFromCloudinary};