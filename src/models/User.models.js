import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema= new mongoose.Schema(
    {
       username:{
        type: String,
        required: true,
        unique: true,
        lowercase: true, 
        trim: true,   //removes any leading or trailing whitespaces
        index: true,  //improves the performance and seacrhing
       },
       email:{
        type: String,
        required: true,
        unique: true,
        lowercase: true, 
        trim: true,   
       },
       fullName:{
        type: String,
        required: true,
        trim: true,   
        index: true,  
       },
       avatar:{
        type: String,  //cloudinary url of image
        required: true,
       },
       coverImage:{
        type: String, //cloudinary URL
       },
       watchHistory:[ //stores the video and its related content
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "video"
        }
      ],
      password:{
        type: String,
        required: [true, "password is required"]
      },
      refreshToken:{
        type: String,
      }
    }, {timestamps: true}
)

//using MongoDB hooks [pre, post]
//Pre hook to perform an operation before save, like encrypting a password
userSchema.pre("save", async function(next){ //always use function, as we use this reference for mongo models
    if(!this.isModified("password")) return;          //we encrypt only once when password is created or is modified
    this.password= await bcrypt.hash(this.password, 10);
    next();
})

//vaidating the password using mongodb methods
userSchema.methods.isPasswordCorret = async function(password){
   return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateAcessToken = function(){ //expires in short duration
    jwt.sign(
        {                        //payload 
           _id: this._id,
           email: this.email,
           username: this.username,
           fullname: this.name,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY,
        }
    )
}
userSchema.methods.generateRefreshToken = function(){ //expires in long duration //we keep in memory(DB)
    jwt.sign(
        {                        //payload 
           _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY,
        }
    )
}


export const User= mongoose.model("User", userSchema);
