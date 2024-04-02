import dotenv from 'dotenv';
import connectDB from "./db/index.js";

dotenv.config({
    path: './env'
})

connectDB();










/*
const app= express();
import express from "express";

;(async ()=>{
    // always use try catch and async await for db connection
    try {
        const dbconnection= await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
        app.on("error",(err)=>{
            console.log("application not able to listen");
            throw err;
        })
        app.listen(process.env.PORT,()=>{
            console.log(`App is listening on port ${process.env.PORT}`)
        })
    } catch (error) {
        alert("DB connect error");
        console.log("DB connect error: ",error);
    }
})()

*/