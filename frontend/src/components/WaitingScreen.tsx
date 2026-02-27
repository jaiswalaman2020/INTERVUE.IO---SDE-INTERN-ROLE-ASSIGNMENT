import React from "react";

const WaitingScreen: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="flex flex-col items-center">
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-sm px-4 py-1 rounded-full mb-4">
          ✨ Intervue Poll
        </div>
        <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-2xl font-semibold text-black text-center">
          Wait for the teacher to ask questions..
        </p>
      </div>
    </div>
  );
};

export default WaitingScreen;
