import { Types, Document } from "mongoose";
import { Socket as IOSocket, Server as IOServer } from "socket.io";

// Option interface for polls
export interface IOption {
  _id: Types.ObjectId;
  text: string;
  isCorrect: boolean;
}

// Poll document interface
export interface IPoll extends Document {
  _id: Types.ObjectId;
  text: string;
  options: Types.DocumentArray<IOption & Document>;
  timeLimit: number;
  createdAt: Date;
}

// Student document interface
export interface IStudent extends Document {
  _id: Types.ObjectId;
  name: string;
  socketId: string;
  isKicked: boolean;
  joinedAt: Date;
}

// Response document interface
export interface IResponse extends Document {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  pollId: Types.ObjectId;
  selectedOption: Types.ObjectId;
  isCorrect: boolean;
  submittedAt: Date;
}

// Message document interface
export interface IMessage extends Document {
  _id: Types.ObjectId;
  sender: string;
  text: string;
  socketId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Poll results interface
export interface IPollResults {
  answers: Record<string, number>;
}

// Poll state interface
export interface IPollState {
  poll: IPoll | null;
  results?: IPollResults;
  remainingSeconds?: number;
  isActive?: boolean;
  canAskNew?: boolean;
  serverTime?: number;
  hasResponded?: boolean;
}

// Connected students mapping
export type ConnectedStudents = Record<string, string>;

// Socket with custom data
export interface CustomSocket extends IOSocket {
  data: {
    name?: string;
  };
}

// Socket handler types
export type SocketHandler = (socket: CustomSocket, io: IOServer) => void;

// Event payloads
export interface RegisterStudentPayload {
  name: string;
}

export interface ChatMessagePayload {
  sender: string;
  text: string;
}

export interface CreatePollPayload {
  text: string;
  options: Array<{ text: string; isCorrect: boolean }>;
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

// History item for API response
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
