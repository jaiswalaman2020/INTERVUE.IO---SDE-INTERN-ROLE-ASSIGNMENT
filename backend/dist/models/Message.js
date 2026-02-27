import mongoose, { Schema } from "mongoose";
const messageSchema = new Schema({
    sender: String,
    text: String,
    socketId: String,
}, { timestamps: true });
export default mongoose.model("Message", messageSchema);
//# sourceMappingURL=Message.js.map