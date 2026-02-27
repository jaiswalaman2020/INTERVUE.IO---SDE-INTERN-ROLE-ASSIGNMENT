// Socket.IO event types
export interface Poll {
  _id: string;
  text: string;
  options: PollOption[];
  timeLimit: number;
  createdAt: string;
}

export interface PollOption {
  _id: string;
  text: string;
  isCorrect: boolean;
}

export interface PollResults {
  answers: Record<string, number>;
}

export interface PollState {
  poll: Poll | null;
  results?: PollResults;
  remainingSeconds?: number;
  isActive?: boolean;
  canAskNew?: boolean;
  serverTime?: number;
  hasResponded?: boolean;
}

export interface Message {
  sender: string;
  text: string;
  createdAt: string;
}

export interface PollHistoryItem {
  _id: string;
  question: string;
  options: PollHistoryOption[];
  createdAt: string;
}

export interface PollHistoryOption {
  _id: string;
  text: string;
  isCorrect: boolean;
  count: number;
  percentage: number;
}

// Component prop types
export interface PollQuestionProps {
  question: Poll;
  selectedOption: string;
  setSelectedOption: (option: string) => void;
  handleSubmit: () => void;
  timer: number;
  submitted: boolean;
  result: PollResults | null;
}

export interface PollHistoryProps {
  history: PollHistoryItem[];
}

// Location state types
export interface LiveResultsLocationState {
  poll: Poll;
  timeLimit: number;
  remainingSeconds: number;
  serverTime: number;
}
