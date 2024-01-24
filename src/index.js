// require('dotenv').config({path: './env'})
import dotenv from "dotenv";
import connectDB from "./db/index.js"; //always import with file extensions to avoid errors
import  app  from "./app.js";

dotenv.config({path: './env'})

connectDB()
.then(()=>{
    app.on("error", (error)=>{
        console.log("Error: ", error);
        throw error
    }) 
})
.then(()=>{
    app.listen(process.env.PORT || 8000, ()=>{
    console.log(`Server is running at port: ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("mongo DB connection failed !!!", err);
});




/* old approach
import express from "express";
const app = express;
;(async ()=>{ //semi-colon of IFFI for cleaning purposes
  try {
    await mongoose.connect(`${process.env.MONGODB_URL}/${DB_NAME}`)
    app.on("error", (error)=>{
        console.log("Error: ", error);
        throw error
    })

    app.listen("process.env.PORT", ()=>{
        console.log(`App is listening on ${process.env.PORT} PORT`);
    })
  } catch (error) {
   console.log("Error:", error); 
  }
})()
*/