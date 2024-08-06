
import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema({
    channel: {                           // a channel user is subscribing to
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    subscriber: {                        // user that has subscribed to the channel
        type: Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true});

export const Subscription = mongoose.model("Subscription", subscriptionSchema);





