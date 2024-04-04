const asyncHandler= (fn)=>{
    (req,res,next)=>{
        Promise.resolve(fn(req,res,next)).catch((err)=> next(err))
    }
}

export {asyncHandler};

// const asyncHandler = (fn)=>async (req,res,next)=>{
//     try {
//         await fn(req,res,next)
//     } catch (error) {
//         console.log("Error in asyncHandler: ",error);
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }