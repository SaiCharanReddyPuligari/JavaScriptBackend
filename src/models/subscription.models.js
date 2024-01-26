import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema({
    subscriber:{ //the one who is subscibing
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    channel:{  //to the channel you are subscribing
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
}, {timestamps: true})

export const Subscription= mongoose.model("Subscription", subscriptionSchema)