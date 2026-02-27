import mongoose, { Schema } from "mongoose";
import { IPoll, IOption } from "../types/index.js";

const optionSchema = new Schema<IOption>({
  text: { type: String, required: true },
  isCorrect: { type: Boolean, default: false },
});

const pollSchema = new Schema<IPoll>({
  text: { type: String, required: true },
  options: [optionSchema],
  timeLimit: { type: Number, default: 60 },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<IPoll>("Poll", pollSchema);
