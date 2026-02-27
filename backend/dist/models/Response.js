import mongoose, { Schema } from "mongoose";
const responseSchema = new Schema({
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
export default mongoose.model("Response", responseSchema);
//# sourceMappingURL=Response.js.map