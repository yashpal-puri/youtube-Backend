import mongoose from "mongoose";
import {DB_NAME} from '../constants.js'

const connectDB= async ()=>{
    try{
        const dbconnection = await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`);
        console.log(`\n MongoDB connected Successfully at host : ${dbconnection.connection.host}`);        
    }catch(err){
        console.log("Error in DB connection: ",err);
        process.exit(1);
    }
}

export default connectDB;