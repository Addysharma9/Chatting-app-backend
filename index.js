const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const jwt = require('jsonwebtoken');
const messageschema = require("./models/message")
const db = require("./config/db"); // Ensure this file is correctly set up
const User = require("./models/user");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// ✅ Setup Multer for File Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Ensure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname)); // Unique filename
  },
});

const upload = multer({ storage });

// ✅ Middleware
app.use(cors());
app.use(express.json()); // Important for JSON parsing
app.use("/uploads", express.static("uploads")); // Serve uploaded images

// ✅ Register User Route with Profile Picture Upload
app.post("/register", upload.single("profilePicture"), async (req, res) => {
  try {
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("File:", req.file); // Debug uploaded file

    const { username, email, password, dod, gender } = req.body;
    const profilePicture = req.file ? `/uploads/${req.file.filename}` : "";

    if (!username || !email || !password || !dod || !gender) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      dod,
      gender,
      profilePicture,
      isOnline: false,
      lastSeen: Date.now(),
    });

    await newUser.save();

    res.status(201).json({
      message: "User registered successfully",
      user: {
        username: newUser.username,
        email: newUser.email,
        gender: newUser.gender,
        profilePicture: profilePicture ? `http://192.168.192.66:5504${profilePicture}` : null,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});



app.post("/validate", async (req, res) => {
    console.log(req.body);

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        // Check if user exists
        const finduser = await User.findOne({ email });
        if (!finduser) {
            return res.status(401).json({ message: "Unauthorized: User not found" });
        }

        // Compare hashed password
        const isMatch = await bcrypt.compare(password, finduser.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Unauthorized: Incorrect password" });
        }

        // Generate JWT token (you should store the secret in environment variables for security)
        const token = jwt.sign(
            { userId: finduser._id, email: finduser.email }, // Payload
            'your-secret-key', // Secret key (replace with an environment variable)
            { expiresIn: '1h' } // Token expiration time
        );
        console.log("Generated token:", token);
return res.status(200).json({ message: "User found", user: finduser, token });


    } catch (error) {
        console.error("Validation error:", error);
        return res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
});
// Get All Users with Pagination and Search
app.get("/allusers", async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const search = req.query.search || "";

        const skip = (page - 1) * limit;

        const searchQuery = search
            ? {
                  $or: [
                      { username: { $regex: search, $options: "i" } },
                      { status: { $regex: search, $options: "i" } },
                  ],
              }
            : {};

        const totalUsers = await User.countDocuments(searchQuery);

        const users = await User.find(searchQuery)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        // ✅ Transform Users Data to Include Full Profile Picture URL
        const transformedUsers = users.map(user => ({
            _id: user._id,
            username: user.username,
            email: user.email,
            gender: user.gender,
            status: user.status,
            createdAt: user.createdAt,
            profilePicture: user.profilePicture
                ? user.profilePicture.startsWith('http') 
                    ? user.profilePicture  // If it already has a full URL, keep it as is
                    : `http://192.168.192.66:5504${user.profilePicture}` // Otherwise, append the base URL
                : null,  // Default to null if no profile picture
        }));
        

        res.json({
            users: transformedUsers,
            currentPage: page,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            hasMore: skip + users.length < totalUsers,
        });
    } catch (err) {
        console.error("Error retrieving users:", err);
        res.status(500).json({ message: "Error retrieving users", error: err.message });
    }
});


// Socket.IO Setup
let activeUsers = {};

io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("register", (userName) => {
        if (userName) {
            activeUsers[userName] = socket.id;
            console.log(`${userName} registered with id: ${socket.id}`);
        } else {
            console.log("No username provided");
        }
    });

    socket.on("private_message", (data) => {
        const { sender, recipient, message } = data;
        const recipientSocketId = activeUsers[recipient];

        if (recipientSocketId) {
            io.to(recipientSocketId).emit("private_message", { sender, message });
            console.log(`Message sent to ${recipient}: ${message}`);
        } else {
            console.log(`Recipient ${recipient} not connected`);
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        for (let user in activeUsers) {
            if (activeUsers[user] === socket.id) {
                delete activeUsers[user];
                console.log(`User ${user} removed from activeUsers`);
                break;
            }
        }
    });
});

// Start Server
const PORT = 5504;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
