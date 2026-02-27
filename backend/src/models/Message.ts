import mongoose, { Schema } from "mongoose";
import { IMessage } from "../types/index.js";

const messageSchema = new Schema<IMessage>(
  {
    sender: String,
    text: String,
    socketId: String,
  },
  { timestamps: true },
);

export default mongoose.model<IMessage>("Message", messageSchema);
