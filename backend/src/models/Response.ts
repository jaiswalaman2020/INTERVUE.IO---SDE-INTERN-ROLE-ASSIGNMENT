import mongoose, { Schema } from "mongoose";
import { IResponse } from "../types/index.js";

const responseSchema = new Schema<IResponse>({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: "Student",
    required: true,
  },
  pollId: {
    type: Schema.Types.ObjectId,
    ref: "Poll",
    required: true,
  },
  selectedOption: {
    type: Schema.Types.ObjectId,
    required: true,
  },
  isCorrect: {
    type: Boolean,
    default: false,
  },
  submittedAt: {
    type: Date,
    default: Date.now,
  },
});

responseSchema.index({ studentId: 1, pollId: 1 }, { unique: true });

export default mongoose.model<IResponse>("Response", responseSchema);
