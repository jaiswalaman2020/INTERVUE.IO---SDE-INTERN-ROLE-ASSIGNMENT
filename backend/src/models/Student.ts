import mongoose, { Schema } from "mongoose";
import { IStudent } from "../types/index.js";

const studentSchema = new Schema<IStudent>({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  socketId: {
    type: String,
    required: true,
    unique: true,
  },
  isKicked: {
    type: Boolean,
    default: false,
  },
  joinedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model<IStudent>("Student", studentSchema);
