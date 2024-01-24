const asyncHandler = (resquestHandler)=>{
   return (req, res, next)=>{
        Promise.resolve(resquestHandler(req, res, next)) //successful
               .catch((err)=>next(err))                  //upon failing, move to next function
    }
}



export {asyncHandler}

// const asyncHandler = ()=>{}
// const asyncHandler = (fn)=>()=>{} //higher order function, a function with function as a parameter
// const asyncHandler = (fn)=> async ()=>{} //using async with higher order funtion
//asynchandler using try catch
// const asyncHandler = (fn)=> async (req, res, next)=>{
//     try {
//         await fn(req, res, next);
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message,
//         })
//     }
// }


