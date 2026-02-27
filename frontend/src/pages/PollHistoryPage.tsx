import React, { useEffect, useState } from "react";
import axios from "axios";
import PollHistory from "../components/PollHistory";
import { PollHistoryItem } from "../types";

const API_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

const PollHistoryPage: React.FC = () => {
  const [pollHistory, setPollHistory] = useState<PollHistoryItem[]>([]);

  useEffect(() => {
    const fetchHistory = async (): Promise<void> => {
      try {
        const res = await axios.get<PollHistoryItem[]>(
          `${API_URL}/api/polls/history`,
        );
        setPollHistory(res.data);
      } catch (err) {
        console.error("Failed to fetch poll history", err);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="min-h-screen bg-white p-6">
      <PollHistory history={pollHistory} />
    </div>
  );
};

export default PollHistoryPage;
