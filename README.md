# Resilient Live Polling System

A real-time polling application with state recovery, enabling teachers to create interactive polls and students to participate with synchronized timers.

## Features

### Teacher Persona (Admin)

- **Poll Creation**: Create MCQ questions with configurable timer duration
- **Live Dashboard**: View real-time vote updates with percentage breakdown
- **Poll History**: Access previously conducted polls and their aggregate results from database
- **Student Management**: Kick students from the session
- **Smart Poll Control**: Create new polls only when:
  - No question has been asked yet
  - All students have answered the previous question
  - Timer has expired

### Student Persona (User)

- **Unique Session Names**: Register with a name unique to each tab/session
- **Real-time Questions**: Receive questions instantly when teacher creates them
- **Timer Synchronization**: Timers sync with server state
  - Late joiners see correct remaining time (e.g., joining 10s late to 60s poll shows 50s)
- **One-time Voting**: Submit answer within time limit (race condition protected)
- **Live Results**: View poll results after submission

### Resilience Features

- **State Recovery**: Refresh-safe - page reload resumes UI exactly where it left off
- **Race Condition Protection**: Database-level unique constraints prevent duplicate votes
- **Server as Source of Truth**: Timer and vote counts managed server-side

### Bonus Features

- **Chat System**: Real-time chat between students and teachers
- **Kick Functionality**: Teachers can remove disruptive students

## Tech Stack

### Backend

- **Runtime**: Node.js with Express 5.1
- **Language**: TypeScript
- **Real-time**: Socket.IO 4.8
- **Database**: MongoDB with Mongoose 8.15
- **Dev Tools**: tsx for development, tsc for production builds

### Frontend

- **Framework**: React 19.1 with Hooks
- **Build Tool**: Vite 6.3
- **Language**: TypeScript
- **Styling**: Tailwind CSS 3.4
- **Routing**: React Router 7.6
- **Real-time**: Socket.IO Client 4.8

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express server setup
│   │   ├── socket.ts         # Socket.IO event handlers
│   │   ├── types/
│   │   │   └── index.ts      # TypeScript interfaces
│   │   └── models/
│   │       ├── Poll.ts       # Poll schema
│   │       ├── Student.ts    # Student schema
│   │       ├── Response.ts   # Vote response schema
│   │       └── Message.ts    # Chat message schema
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Main app with routing
│   │   ├── main.tsx          # React entry point
│   │   ├── socket.ts         # Socket.IO client setup
│   │   ├── types/
│   │   │   └── index.ts      # TypeScript interfaces
│   │   ├── hooks/
│   │   │   └── usePollTimer.ts
│   │   ├── components/
│   │   │   ├── TeacherDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── PollQuestion.tsx
│   │   │   ├── LiveResults.tsx
│   │   │   ├── PollHistory.tsx
│   │   │   ├── ChatSidebar.tsx
│   │   │   ├── WaitingScreen.tsx
│   │   │   └── KickedOut.tsx
│   │   └── pages/
│   │       ├── TeacherPage.tsx
│   │       ├── StudentPage.tsx
│   │       └── PollHistoryPage.tsx
│   ├── package.json
│   └── tsconfig.json
│
└── README.md
```

## Installation

### Prerequisites

- Node.js 18+
- MongoDB instance (local or cloud)
- npm or yarn

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017/polling-system" > .env

# Development
npm run dev

# Production build
npm run build
npm start
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (for production, point to deployed backend)
echo "VITE_SOCKET_URL=http://localhost:3000" > .env

# Development
npm run dev

# Production build
npm run build
```

## Environment Variables

### Backend

| Variable      | Description               | Default                                    |
| ------------- | ------------------------- | ------------------------------------------ |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/polling-system` |
| `PORT`        | Server port               | `3000`                                     |

### Frontend

| Variable          | Description           | Default                 |
| ----------------- | --------------------- | ----------------------- |
| `VITE_SOCKET_URL` | Backend WebSocket URL | `http://localhost:3000` |

## Socket Events

### Teacher Events

| Event          | Direction       | Description                                   |
| -------------- | --------------- | --------------------------------------------- |
| `create-poll`  | Client → Server | Create new poll with question, options, timer |
| `poll-created` | Server → Client | Broadcast new poll to all clients             |
| `kick-student` | Client → Server | Remove a student from session                 |

### Student Events

| Event              | Direction       | Description                         |
| ------------------ | --------------- | ----------------------------------- |
| `register-student` | Client → Server | Register with unique name           |
| `submit-vote`      | Client → Server | Submit answer to current poll       |
| `student-kicked`   | Server → Client | Notify student they've been removed |

### Shared Events

| Event          | Direction     | Description                  |
| -------------- | ------------- | ---------------------------- |
| `vote-update`  | Server → All  | Real-time vote count updates |
| `timer-sync`   | Server → All  | Synchronized timer updates   |
| `poll-ended`   | Server → All  | Poll timer expired           |
| `chat-message` | Bidirectional | Chat messages                |

## API Endpoints

| Method | Endpoint     | Description                       |
| ------ | ------------ | --------------------------------- |
| `GET`  | `/api/polls` | Get all poll history with results |

## Database Schema

### Poll

```typescript
{
  question: string;
  options: string[];
  correctAnswer?: number;
  duration: number;
  createdAt: Date;
  endedAt?: Date;
}
```

### Response (Vote)

```typescript
{
  pollId: ObjectId;
  studentId: ObjectId;
  selectedOption: number;
  submittedAt: Date;
}
// Unique index on (studentId, pollId) prevents duplicate votes
```

### Student

```typescript
{
  name: string;
  socketId: string;
  joinedAt: Date;
}
```

## Race Condition Protection

The system prevents duplicate votes through:

1. **Database Constraint**: Unique compound index on `(studentId, pollId)` in Response model
2. **Server-side Validation**: Checks for existing vote before processing
3. **Client-side State**: Disables vote button after submission

```typescript
// Response model unique index
responseSchema.index({ studentId: 1, pollId: 1 }, { unique: true });
```

## State Recovery

When a user refreshes the page:

1. **Backend** maintains current poll state in memory and database
2. **On reconnect**, client requests current state via `get-current-state`
3. **Server responds** with active poll, remaining time, and vote counts
4. **UI resumes** exactly where user left off

## Usage

### As Teacher

1. Navigate to `/teacher`
2. Create a poll with question, options (2-4), and timer duration
3. Watch live results as students vote
4. View poll history for past results
5. Use chat to communicate with students
6. Kick disruptive students if needed

### As Student

1. Navigate to `/student`
2. Enter a unique name (per session)
3. Wait for teacher to create a poll
4. Answer within the time limit
5. View results after submission or timer expiry
6. Use chat to ask questions

## Development

```bash
# Run both frontend and backend in development
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm run dev
```
