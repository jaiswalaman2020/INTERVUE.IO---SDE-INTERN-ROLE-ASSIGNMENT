import React, { useEffect, useState, useRef } from "react";
import socket from "../socket";
import PollQuestion from "./PollQuestion";
import ChatSidebar from "./ChatSidebar";
import WaitingScreen from "./WaitingScreen";
import { useNavigate } from "react-router-dom";
import usePollTimer from "../hooks/usePollTimer";
import { Poll, PollResults, PollState } from "../types";

const StudentDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [name, setName] = useState<string>("");
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [question, setQuestion] = useState<Poll | null>(null);
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [result, setResult] = useState<PollResults | null>(null);
  const [serverRemaining, setServerRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [submissionError, setSubmissionError] = useState<string>("");
  const [isRegistering, setIsRegistering] = useState<boolean>(false);
  const hasRegisteredRef = useRef<boolean>(false);

  const timer = usePollTimer(serverRemaining);

  const getRemainingSeconds = (
    poll: Poll | null,
    serverTime?: number,
  ): number => {
    if (!poll) return 0;
    const startedAt = new Date(poll.createdAt).getTime();
    const now = serverTime || Date.now();
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    return Math.max(0, (poll.timeLimit || 60) - elapsedSeconds);
  };

  useEffect(() => {
    socket.on("kicked", () => {
      localStorage.removeItem("studentName");
      localStorage.removeItem("userRole");
      navigate("/kicked");
    });

    return () => {
      socket.off("kicked");
    };
  }, [navigate]);

  useEffect(() => {
    const storedName = localStorage.getItem("studentName");
    const storedRole = localStorage.getItem("userRole");

    if (storedName && storedRole === "student") {
      setName(storedName);

      const handleConnect = (): void => {
        if (hasRegisteredRef.current || isRegistering || isRegistered) {
          console.log("⏭️ Skipping registration - already registered");
          return;
        }

        hasRegisteredRef.current = true;
        setIsRegistering(true);
        console.log("📝 Registering student:", storedName);

        const successHandler = (): void => {
          console.log("✅ Registration successful");
          setIsRegistered(true);
          setIsRegistering(false);
          socket.emit("request-poll-state");
        };

        const errorHandler = (err: { message: string }): void => {
          console.log("❌ Registration failed:", err);
          hasRegisteredRef.current = false;
          setIsRegistering(false);
        };

        socket.once("registration:success", successHandler);
        socket.once("registration:error", errorHandler);
        socket.emit("register-student", { name: storedName });
      };

      socket.on("connect", handleConnect);

      // Call it immediately if already connected
      if (
        socket.connected &&
        !hasRegisteredRef.current &&
        !isRegistering &&
        !isRegistered
      ) {
        handleConnect();
      }

      return () => {
        socket.off("connect", handleConnect);
      };
    }
  }, [isRegistered, isRegistering]);

  const handleRegister = (): void => {
    if (name.trim() === "") {
      setError("Please enter your name");
      return;
    }

    if (isRegistering || hasRegisteredRef.current) {
      console.log("⏭️ Already registering or registered");
      return; // Prevent double submission
    }

    hasRegisteredRef.current = true;
    setIsLoading(true);
    setIsRegistering(true);
    setError("");

    // Check if socket is connected
    if (!socket.connected) {
      setError("Connection to server failed. Please refresh and try again.");
      setIsLoading(false);
      setIsRegistering(false);
      hasRegisteredRef.current = false;
      console.error("Socket not connected");
      return;
    }

    // Set a timeout for registration
    const timeout = setTimeout(() => {
      setError(
        "Registration timeout. Server not responding. Please try again.",
      );
      setIsLoading(false);
      setIsRegistering(false);
      hasRegisteredRef.current = false;
    }, 5000);

    socket.once("registration:success", () => {
      clearTimeout(timeout);
      localStorage.setItem("studentName", name);
      localStorage.setItem("userRole", "student");
      setIsRegistered(true);
      setIsLoading(false);
      setIsRegistering(false);
      socket.emit("request-participants");
      socket.emit("request-poll-state");
    });

    socket.once("registration:error", ({ message }: { message: string }) => {
      clearTimeout(timeout);
      setIsLoading(false);
      setIsRegistering(false);
      hasRegisteredRef.current = false;
      setError(message || "Registration failed");
    });

    socket.emit("register-student", { name });
  };

  useEffect(() => {
    socket.on(
      "poll-started",
      ({ poll, serverTime }: { poll: Poll; serverTime: number }) => {
        console.log("📡 Received poll-started:", poll?.text);
        setQuestion(poll);
        setSubmitted(false);
        setResult(null);
        setSelectedOption("");
        setSubmissionError("");
        setServerRemaining(getRemainingSeconds(poll, serverTime));
      },
    );

    socket.on("poll-results", (data: PollResults) => {
      setResult(data);
    });

    socket.on("poll-state", (state: PollState) => {
      console.log(
        "📡 Received poll-state:",
        state?.poll?.text || "none",
        "HasResponded:",
        state?.hasResponded,
        "IsActive:",
        state?.isActive,
        "RemainingSeconds:",
        state?.remainingSeconds,
      );
      if (!state?.poll) {
        console.log("   No active poll");
        setQuestion(null);
        setResult(null);
        setSubmitted(false);
        setServerRemaining(0);
        return;
      }

      console.log("   Setting question:", state.poll.text);
      console.log(
        "   Will set submitted to:",
        state.hasResponded || !state.isActive,
      );
      setQuestion(state.poll);
      setResult(state.results || null);
      setServerRemaining(
        state.remainingSeconds ??
          getRemainingSeconds(state.poll, state.serverTime),
      );
      setSubmitted(state.hasResponded || !state.isActive);
      setSelectedOption("");
    });

    socket.on("answer:error", ({ message }: { message: string }) => {
      setSubmissionError(message || "Submission failed");
      setSubmitted(false);
    });

    return () => {
      socket.off("poll-started");
      socket.off("poll-results");
      socket.off("poll-state");
      socket.off("answer:error");
    };
  }, []);

  useEffect(() => {
    if (!question || submitted) return;
    if (timer > 0) return;
    // Don't trigger timeout if serverRemaining indicates time is left (timer just hasn't updated yet)
    if (serverRemaining > 0) return;

    socket.emit("timeout", { questionId: question._id });
    setSubmitted(true);
  }, [question, submitted, timer, serverRemaining]);

  const handleSubmit = (): void => {
    console.log("🗳️ Attempting to submit vote", {
      hasSelected: !!selectedOption,
      hasQuestion: !!question,
      questionId: question?._id,
      answer: selectedOption,
      name,
    });

    if (!selectedOption || !question) {
      console.log("❌ Cannot submit - missing option or question");
      return;
    }

    setSubmissionError("");
    console.log("📤 Emitting submit-answer event");
    socket.emit("submit-answer", {
      questionId: question._id,
      answer: selectedOption,
      name,
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white px-6">
      {!isRegistered ? (
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="w-full max-w-xl mx-auto text-center">
            {/* Badge */}
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-primary text-white mb-6 inline-block">
              ✨ Intervue Poll
            </span>

            {/* Headings */}
            <h1 className="text-3xl sm:text-4xl font-semibold mb-2">
              Let's <span className="font-bold text-black">Get Started</span>
            </h1>
            <p className="text-muted text-sm mb-8">
              If you're a student, you'll be able to{" "}
              <strong>submit your answers</strong>, participate in live polls,
              and see how your responses compare with your classmates.
            </p>

            {/* Name Input */}
            <div className="flex items-center justify-center">
              <div className="max-w-md w-full px-4">
                <div className="text-left mb-4">
                  <label className="text-sm font-medium text-dark block mb-1">
                    Enter your Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError("");
                    }}
                    placeholder="Your full name"
                    disabled={isLoading}
                    className="w-full p-3 rounded-full bg-muted/10 border border-muted text-dark focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Continue Button */}
                <div className="flex justify-center">
                  <button
                    onClick={handleRegister}
                    disabled={isLoading}
                    className="w-40 py-3 rounded-full bg-gradient-to-r from-primary to-secondary text-white font-semibold transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? "Connecting..." : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <ChatSidebar />
          {!question ? (
            <WaitingScreen />
          ) : (
            <div className="min-h-screen flex items-center justify-center bg-white px-4">
              <div className="w-full max-w-6xl p-6 rounded-xl shadow-md space-y-6 bg-white">
                <h2 className="text-center text-xl font-semibold">
                  Welcome, {name}!
                </h2>

                {/* Show Question */}
                {!submitted && (
                  <PollQuestion
                    question={question}
                    selectedOption={selectedOption}
                    setSelectedOption={setSelectedOption}
                    handleSubmit={handleSubmit}
                    timer={timer}
                    submitted={false}
                    result={null}
                  />
                )}

                {submissionError && (
                  <div className="text-center mt-4 text-red-500 text-sm font-medium">
                    {submissionError}
                  </div>
                )}

                {/* Waiting */}
                {submitted && !result && (
                  <div className="text-center mt-4 text-secondary text-lg font-medium">
                    Waiting for results...
                  </div>
                )}

                {/* Show Results */}
                {submitted && result && (
                  <PollQuestion
                    question={question}
                    selectedOption={selectedOption}
                    setSelectedOption={setSelectedOption}
                    handleSubmit={handleSubmit}
                    timer={timer}
                    submitted={submitted}
                    result={result}
                  />
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentDashboard;
