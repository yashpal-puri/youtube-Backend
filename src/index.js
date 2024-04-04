import dotenv from 'dotenv';
import connectDB from "./db/index.js";
import { app } from './app.js';

dotenv.config({
    path: './env'
})

connectDB()
.then((res)=>{
    app.on("error",(error)=>{
        console.log("Express app error in index.js : ",error);
    })
    app.listen(process.env.PORT || 8000,()=>{
        console.log(`Server started on port http://localhost:${process.env.PORT || 8000}`)
    })
})
.catch((err)=>{
    console.log("DB connect error in index.js: ",err);
})










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