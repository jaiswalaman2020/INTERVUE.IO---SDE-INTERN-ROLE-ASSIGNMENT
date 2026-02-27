import { Types, Document } from "mongoose";
import { Socket as IOSocket, Server as IOServer } from "socket.io";
export interface IOption {
    _id: Types.ObjectId;
    text: string;
    isCorrect: boolean;
}
export interface IPoll extends Document {
    _id: Types.ObjectId;
    text: string;
    options: Types.DocumentArray<IOption & Document>;
    timeLimit: number;
    createdAt: Date;
}
export interface IStudent extends Document {
    _id: Types.ObjectId;
    name: string;
    socketId: string;
    isKicked: boolean;
    joinedAt: Date;
}
export interface IResponse extends Document {
    _id: Types.ObjectId;
    studentId: Types.ObjectId;
    pollId: Types.ObjectId;
    selectedOption: Types.ObjectId;
    isCorrect: boolean;
    submittedAt: Date;
}
export interface IMessage extends Document {
    _id: Types.ObjectId;
    sender: string;
    text: string;
    socketId: string;
    createdAt: Date;
    updatedAt: Date;
}
export interface IPollResults {
    answers: Record<string, number>;
}
export interface IPollState {
    poll: IPoll | null;
    results?: IPollResults;
    remainingSeconds?: number;
    isActive?: boolean;
    canAskNew?: boolean;
    serverTime?: number;
    hasResponded?: boolean;
}
export type ConnectedStudents = Record<string, string>;
export interface CustomSocket extends IOSocket {
    data: {
        name?: string;
    };
}
export type SocketHandler = (socket: CustomSocket, io: IOServer) => void;
export interface RegisterStudentPayload {
    name: string;
}
export interface ChatMessagePayload {
    sender: string;
    text: string;
}
export interface CreatePollPayload {
    text: string;
    options: Array<{
        text: string;
        isCorrect: boolean;
    }>;
    timeLimit: number;
}
export interface SubmitAnswerPayload {
    questionId: string;
    answer: string;
    name: string;
}
export interface TimeoutPayload {
    questionId: string;
}
export interface KickStudentPayload {
    name: string;
}
export interface PollHistoryItem {
    _id: Types.ObjectId;
    question: string;
    options: Array<{
        _id: Types.ObjectId;
        text: string;
        isCorrect: boolean;
        count: number;
        percentage: number;
    }>;
    createdAt: Date;
}
//# sourceMappingURL=index.d.ts.map