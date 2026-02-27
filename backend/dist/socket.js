import Poll from "./models/Poll.js";
import Student from "./models/Student.js";
import Response from "./models/Response.js";
import Message from "./models/Message.js";
const connectedStudents = {}; // socket.id => name mapping
function buildResults(poll, responses) {
    const result = { answers: {} };
    for (const opt of poll.options) {
        result.answers[opt._id.toString()] = 0;
    }
    for (const res of responses) {
        const id = res.selectedOption?.toString();
        if (id && result.answers[id] !== undefined) {
            result.answers[id] += 1;
        }
    }
    return result;
}
async function getPollState(socketId) {
    const poll = await Poll.findOne().sort({ createdAt: -1 });
    if (!poll) {
        return { poll: null };
    }
    const now = Date.now();
    const startedAt = poll.createdAt?.getTime() ?? now;
    const elapsedSeconds = Math.floor((now - startedAt) / 1000);
    const remainingSeconds = Math.max(0, poll.timeLimit - elapsedSeconds);
    const responses = await Response.find({ pollId: poll._id });
    const results = buildResults(poll, responses);
    const connectedStudentCount = Object.keys(connectedStudents).length;
    // Allow new poll if: timer expired OR no students connected OR all students answered
    const canAskNew = remainingSeconds === 0 ||
        connectedStudentCount === 0 ||
        responses.length >= connectedStudentCount;
    let hasResponded = false;
    if (socketId) {
        const student = await Student.findOne({ socketId });
        if (student) {
            const existing = await Response.findOne({
                pollId: poll._id,
                studentId: student._id,
            });
            hasResponded = Boolean(existing);
        }
    }
    return {
        poll,
        results,
        remainingSeconds,
        isActive: remainingSeconds > 0,
        canAskNew,
        serverTime: now,
        hasResponded,
    };
}
// Get updated list of students after kicking
async function getUpdatedList() {
    const students = await Student.find({ isKicked: false });
    return students.map((s) => s.name);
}
export default function socketHandler(socket, io) {
    console.log("New client connected:", socket.id);
    // Student registration
    socket.on("register-student", async ({ name }) => {
        try {
            if (!name || name.trim() === "") {
                socket.emit("registration:error", { message: "Name cannot be empty" });
                return;
            }
            socket.data.name = name;
            // Remove any old socket entries for this student name to prevent duplicates
            for (const [socketId, studentName] of Object.entries(connectedStudents)) {
                if (studentName === name && socketId !== socket.id) {
                    delete connectedStudents[socketId];
                    // Also delete the old student record
                    await Student.deleteOne({ socketId });
                }
            }
            // Delete any other student record that has this socketId (from previous session)
            await Student.deleteMany({ socketId: socket.id });
            // First, try to find and update existing student by name
            let student = await Student.findOne({ name });
            if (student) {
                // Update existing student's socketId
                student.socketId = socket.id;
                student.isKicked = false;
                await student.save();
            }
            else {
                // Create new student
                student = await Student.create({
                    name,
                    socketId: socket.id,
                    isKicked: false,
                });
            }
            connectedStudents[socket.id] = name;
            console.log(`✅ Student registered: ${name} (${socket.id})`);
            const students = await Student.find({ isKicked: false });
            const participantNames = students.map((s) => s.name);
            // Send success to registering student
            socket.emit("registration:success", { studentId: student._id });
            // Broadcast updated participants list
            io.emit("participants:update", participantNames);
        }
        catch (error) {
            console.error("❌ Registration error:", error);
            socket.emit("registration:error", { message: "Registration failed" });
        }
    });
    // Request Participants list
    socket.on("request-participants", async () => {
        try {
            const students = await Student.find({ isKicked: false });
            const participantNames = students.map((s) => s.name);
            socket.emit("participants:update", participantNames);
        }
        catch (error) {
            console.error("❌ Error fetching participants:", error);
        }
    });
    // Real-time chat
    socket.on("chat:message", async ({ sender, text }) => {
        try {
            if (sender !== "Teacher") {
                const student = await Student.findOne({ name: sender });
                if (!student || student.isKicked) {
                    console.log(`❌ Rejected message from kicked student: ${sender}`);
                    return;
                }
            }
            const newMsg = await Message.create({
                sender,
                text,
                socketId: socket.id,
            });
            console.log(`💬 Message from ${sender}: ${text}`);
            io.emit("chat:message", {
                sender: newMsg.sender,
                text: newMsg.text,
                createdAt: newMsg.createdAt,
            });
        }
        catch (error) {
            console.error("❌ Chat message error:", error);
        }
    });
    // To get all the messages
    socket.on("get-all-messages", async () => {
        const allMessages = await Message.find({}).sort({ createdAt: 1 });
        socket.emit("chat:messages", allMessages);
    });
    // Teacher creates poll
    socket.on("create-poll", async ({ text, options, timeLimit }) => {
        try {
            console.log(`📝 Create poll event received - Text: ${text}, Options: ${options?.length}, timeLimit: ${timeLimit}`);
            if (!text || !options || options.length < 2) {
                console.log(`❌ Invalid poll data`);
                socket.emit("poll:error", { message: "Invalid poll data" });
                return;
            }
            // Check if there's a previous poll where not all students have answered
            const lastPoll = await Poll.findOne().sort({ createdAt: -1 });
            if (lastPoll) {
                const responses = await Response.find({ pollId: lastPoll._id });
                const connectedStudentCount = Object.keys(connectedStudents).length;
                // Check if the timer has expired
                const now = Date.now();
                const startedAt = lastPoll.createdAt?.getTime() ?? now;
                const elapsedSeconds = Math.floor((now - startedAt) / 1000);
                const remainingSeconds = Math.max(0, lastPoll.timeLimit - elapsedSeconds);
                const timerExpired = remainingSeconds === 0;
                // Allow new poll if: timer expired OR no students connected OR all students have answered
                const canCreateNewPoll = timerExpired ||
                    connectedStudentCount === 0 ||
                    responses.length >= connectedStudentCount;
                console.log(`📊 Poll check - Responses: ${responses.length}, Connected: ${connectedStudentCount}, TimerExpired: ${timerExpired}, CanCreate: ${canCreateNewPoll}`);
                if (!canCreateNewPoll) {
                    console.log(`❌ Cannot create new poll - students still answering (${connectedStudentCount - responses.length} remaining)`);
                    socket.emit("poll:error", {
                        message: `Please wait. ${connectedStudentCount - responses.length} student(s) still answering.`,
                    });
                    return;
                }
            }
            const poll = await Poll.create({ text, options, timeLimit });
            console.log(`📊 Poll created: ${text}`);
            io.emit("poll-started", { poll, serverTime: Date.now() });
            io.emit("poll-status", { canAskNew: false });
        }
        catch (error) {
            console.error("❌ Poll creation error:", error);
            socket.emit("poll:error", { message: "Failed to create poll" });
        }
    });
    // Student submits answer
    socket.on("submit-answer", async ({ questionId, answer, name }) => {
        try {
            console.log(`🗳️ Vote attempt - StudentName: ${name}, SocketId: ${socket.id}, QuestionId: ${questionId}`);
            let student = await Student.findOne({ socketId: socket.id });
            console.log(`   Found by socketId: ${!!student}`);
            if (!student && name) {
                student = await Student.findOne({ name });
                console.log(`   Found by name: ${!!student}`);
                if (student) {
                    student.socketId = socket.id;
                    await student.save();
                    connectedStudents[socket.id] = name;
                    console.log(`   Updated socketId for existing student`);
                }
                else {
                    try {
                        student = await Student.create({ name, socketId: socket.id });
                        connectedStudents[socket.id] = name;
                        console.log(`   Created new student record`);
                    }
                    catch (error) {
                        console.error("❌ Student recovery error:", error);
                    }
                }
            }
            if (!student) {
                console.log(`❌ Student not found after all recovery attempts`);
                socket.emit("answer:error", { message: "Student not found" });
                return;
            }
            console.log(`✅ Student verified: ${student.name} (${student._id})`);
            console.log(`   Checking poll: ${questionId}`);
            const poll = await Poll.findById(questionId);
            if (!poll) {
                console.log(`❌ Poll not found: ${questionId}`);
                socket.emit("answer:error", { message: "Poll not found" });
                return;
            }
            console.log(`✅ Poll found: ${poll.text}`);
            const now = Date.now();
            const startedAt = poll.createdAt?.getTime() ?? now;
            const elapsedSeconds = Math.floor((now - startedAt) / 1000);
            const remainingSeconds = Math.max(0, poll.timeLimit - elapsedSeconds);
            console.log(`⏱️  Poll timing - Now: ${now}, StartedAt: ${startedAt}, Elapsed: ${elapsedSeconds}s, TimeLimit: ${poll.timeLimit}s, Remaining: ${remainingSeconds}s`);
            if (remainingSeconds <= 0) {
                console.log(`❌ Poll expired: remaining=${remainingSeconds}`);
                socket.emit("answer:error", { message: "Poll has ended" });
                return;
            }
            const existing = await Response.findOne({
                pollId: questionId,
                studentId: student._id,
            });
            if (existing) {
                socket.emit("answer:error", { message: "Already submitted" });
                return;
            }
            // Find the selected option
            const option = poll.options.id(answer);
            const isCorrect = option?.isCorrect || false;
            // Save student's response
            try {
                await Response.create({
                    studentId: student._id,
                    pollId: questionId,
                    selectedOption: answer,
                    isCorrect,
                });
            }
            catch (error) {
                if (error &&
                    typeof error === "object" &&
                    "code" in error &&
                    error.code === 11000) {
                    socket.emit("answer:error", { message: "Already submitted" });
                    return;
                }
                throw error;
            }
            console.log(`✅ Answer submitted by ${student.name}`);
            // Get all current responses
            const responses = await Response.find({ pollId: questionId });
            const result = buildResults(poll, responses);
            const connectedStudentCount = Object.keys(connectedStudents).length;
            // Allow new poll if: timer expired OR no students connected OR all students answered
            const canAskNew = remainingSeconds === 0 ||
                connectedStudentCount === 0 ||
                responses.length >= connectedStudentCount;
            // Broadcast results to all clients
            io.emit("poll-results", result);
            io.emit("poll-status", { canAskNew });
        }
        catch (error) {
            console.error("❌ Answer submission error:", error);
            socket.emit("answer:error", { message: "Failed to submit answer" });
        }
    });
    socket.on("request-poll-state", async () => {
        try {
            console.log(`📋 Request poll state from: ${socket.data.name || "unknown"} (${socket.id})`);
            const state = await getPollState(socket.id);
            console.log(`   Poll state: ${state.poll ? `${state.poll.text}` : "none"}, HasResponded: ${state.hasResponded}, CanAskNew: ${state.canAskNew}, IsActive: ${state.isActive}, RemainingSeconds: ${state.remainingSeconds}`);
            socket.emit("poll-state", state);
        }
        catch (error) {
            console.error("❌ Poll state error:", error);
            socket.emit("poll:error", { message: "Failed to fetch poll state" });
        }
    });
    socket.on("timeout", async ({ questionId }) => {
        try {
            const poll = await Poll.findById(questionId);
            if (!poll) {
                return;
            }
            const responses = await Response.find({ pollId: questionId });
            const result = buildResults(poll, responses);
            const connectedStudentCount = Object.keys(connectedStudents).length;
            const now = Date.now();
            const startedAt = poll.createdAt?.getTime() ?? now;
            const elapsedSeconds = Math.floor((now - startedAt) / 1000);
            const remainingSeconds = Math.max(0, poll.timeLimit - elapsedSeconds);
            // Allow new poll if: timer expired OR no students connected OR all students answered
            const canAskNew = remainingSeconds === 0 ||
                connectedStudentCount === 0 ||
                responses.length >= connectedStudentCount;
            io.emit("poll-results", result);
            io.emit("poll-status", { canAskNew });
        }
        catch (error) {
            console.error("❌ Timeout handling error:", error);
        }
    });
    // History of the poll
    socket.on("get-poll-history", async () => {
        try {
            const polls = await Poll.find({}).sort({ createdAt: -1 }).limit(10);
            const allResults = [];
            for (const poll of polls) {
                const responses = await Response.find({ pollId: poll._id });
                const result = {};
                for (const opt of poll.options) {
                    result[opt._id.toString()] = 0;
                }
                for (const res of responses) {
                    const id = res.selectedOption?.toString();
                    if (id && result[id] !== undefined) {
                        result[id] += 1;
                    }
                }
                allResults.push({
                    poll,
                    results: result,
                });
            }
            console.log(`📜 Poll history retrieved (${allResults.length} polls)`);
            socket.emit("poll-history", allResults);
        }
        catch (error) {
            console.error("❌ Poll history error:", error);
            socket.emit("history:error", { message: "Failed to fetch history" });
        }
    });
    // Kick student
    socket.on("kick-student", async ({ name }) => {
        try {
            const student = await Student.findOneAndUpdate({ name }, { $set: { isKicked: true } });
            if (!student) {
                console.log(`⚠️ Student not found: ${name}`);
                return;
            }
            console.log(`🚫 Student kicked: ${name}`);
            // Find the kicked student's socket
            const targetSocket = [...io.sockets.sockets.values()].find((s) => s.data?.name === name);
            if (targetSocket) {
                targetSocket.emit("kicked");
                targetSocket.disconnect(true);
            }
            // Remove from connectedStudents
            delete connectedStudents[student.socketId];
            // Update participant list for all connected clients
            const updatedList = await getUpdatedList();
            io.emit("participants:update", updatedList);
        }
        catch (error) {
            console.error("❌ Kick student error:", error);
        }
    });
    // Disconnect cleanup
    socket.on("disconnect", async () => {
        try {
            const studentName = socket.data.name || "Unknown";
            console.log(`🔌 Client disconnected: ${studentName} (${socket.id})`);
            await Student.deleteOne({ socketId: socket.id });
            delete connectedStudents[socket.id];
            // Get updated participant list
            const updatedList = await getUpdatedList();
            io.emit("participants:update", updatedList);
        }
        catch (error) {
            console.error("❌ Disconnect cleanup error:", error);
        }
    });
}
//# sourceMappingURL=socket.js.map