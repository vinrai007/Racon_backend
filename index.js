    // "start": "nodemon --env-file .env index.js",

import express from "express";
import cors from "cors";
import path from "path";
import url, { fileURLToPath } from "url";
import ImageKit from "imagekit";
import mongoose from "mongoose";
import Chat from "./models/chat.js";
import UserChats from "./models/userChats.js";
// import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
import { ClerkExpressRequireAuth, ClerkExpressWithAuth } from "@clerk/clerk-sdk-node";

import dotenv from 'dotenv';
dotenv.config();


const port = process.env.PORT || 3000;
const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(
  cors({
     origin: "https://racon.onrender.com",
    // origin: process.env.CLIENT_URL,
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());

const connect = async () => {
  try {
    await mongoose.connect(process.env.MONGO);
    console.log("Connected to MongoDB");
  } catch (err) {
    console.log(err);
  }
};

const imagekit = new ImageKit({
  urlEndpoint: process.env.IMAGE_KIT_ENDPOINT,
  publicKey: process.env.IMAGE_KIT_PUBLIC_KEY,
  privateKey: process.env.IMAGE_KIT_PRIVATE_KEY,
});

app.get("/api/upload", (req, res) => {
  const result = imagekit.getAuthenticationParameters();
  res.send(result);
});

app.post("/api/chats", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;
  const { text } = req.body;

  try {
    // CREATE A NEW CHAT
    const newChat = new Chat({
      userId: userId,
      history: [{ role: "user", parts: [{ text }] }],
    });

    const savedChat = await newChat.save();

    // CHECK IF THE USERCHATS EXISTS
    const userChats = await UserChats.find({ userId: userId });

    // IF DOESN'T EXIST CREATE A NEW ONE AND ADD THE CHAT IN THE CHATS ARRAY
    if (!userChats.length) {
      const newUserChats = new UserChats({
        userId: userId,
        chats: [
          {
            _id: savedChat._id,
            title: text.substring(0, 40),
          },
        ],
      });

      await newUserChats.save();
    } else {
      // IF EXISTS, PUSH THE CHAT TO THE EXISTING ARRAY
      await UserChats.updateOne(
        { userId: userId },
        {
          $push: {
            chats: {
              _id: savedChat._id,
              title: text.substring(0, 40),
            },
          },
        }
      );

      res.status(201).send(newChat._id);
    }
  } catch (err) {
    console.log(err);
    res.status(500).send("Error creating chat!");
  }
});

app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  try {
    const userChats = await UserChats.find({ userId });

    res.status(200).send(userChats[0].chats);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching userchats!");
  }
});

app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  try {
    const chat = await Chat.findOne({ _id: req.params.id, userId });

    res.status(200).send(chat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error fetching chat!");
  }
});

app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res) => {
  const userId = req.auth.userId;

  const { question, answer, img } = req.body;

  const newItems = [
    ...(question
      ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }]
      : []),
    { role: "model", parts: [{ text: answer }] },
  ];

  try {
    const updatedChat = await Chat.updateOne(
      { _id: req.params.id, userId },
      {
        $push: {
          history: {
            $each: newItems,
          },
        },
      }
    );
    res.status(200).send(updatedChat);
  } catch (err) {
    console.log(err);
    res.status(500).send("Error adding conversation!");
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(401).send("Unauthenticated!");
});

// PRODUCTION
// app.use(express.static(path.join(__dirname, "../client/dist")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
// });

app.listen(port, () => {
  connect();
  console.log("Server running on 3000");
});

// import express from "express";
// import cors from "cors";
// import path from "path";
// import url, { fileURLToPath } from "url";
// import ImageKit from "imagekit";
// import mongoose from "mongoose";
// import Chat from "./models/chat.js";
// import UserChats from "./models/userChats.js";
// import { ClerkExpressRequireAuth } from "@clerk/clerk-sdk-node";
// import dotenv from 'dotenv';
// import Joi from 'joi';

// // Load environment variables
// dotenv.config();

// // Validate environment variables
// const envVarsSchema = Joi.object({
//   PORT: Joi.number().default(3000),
//   MONGO: Joi.string().required(),
//   IMAGE_KIT_ENDPOINT: Joi.string().required(),
//   IMAGE_KIT_PUBLIC_KEY: Joi.string().required(),
//   IMAGE_KIT_PRIVATE_KEY: Joi.string().required(),
//   CLIENT_URL: Joi.string().uri().required(),
// }).unknown();

// const { error, value: envVars } = envVarsSchema.validate(process.env);

// if (error) {
//   throw new Error(`Config validation error: ${error.message}`);
// }

// const port = envVars.PORT;
// const app = express();

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// // CORS setup
// app.use(
//   cors({
//     origin: envVars.CLIENT_URL,
//     credentials: true,
//   })
// );

// app.use(express.json());

// // MongoDB connection
// const connect = async () => {
//   try {
//     await mongoose.connect(envVars.MONGO);
//     console.log("Connected to MongoDB");
//   } catch (err) {
//     console.error("Error connecting to MongoDB:", err);
//   }
// };

// // ImageKit setup
// const imagekit = new ImageKit({
//   urlEndpoint: envVars.IMAGE_KIT_ENDPOINT,
//   publicKey: envVars.IMAGE_KIT_PUBLIC_KEY,
//   privateKey: envVars.IMAGE_KIT_PRIVATE_KEY,
// });

// // Routes

// // Get ImageKit authentication parameters
// app.get("/api/upload", (req, res, next) => {
//   try {
//     const result = imagekit.getAuthenticationParameters();
//     res.send(result);
//   } catch (err) {
//     next(err);
//   }
// });

// // Create a new chat
// app.post("/api/chats", ClerkExpressRequireAuth(), async (req, res, next) => {
//   const userId = req.auth.userId;
//   const { text } = req.body;

//   try {
//     const newChat = new Chat({
//       userId,
//       history: [{ role: "user", parts: [{ text }] }],
//     });

//     const savedChat = await newChat.save();

//     const userChats = await UserChats.findOne({ userId });

//     if (!userChats) {
//       const newUserChats = new UserChats({
//         userId,
//         chats: [
//           {
//             _id: savedChat._id,
//             title: text.substring(0, 40),
//           },
//         ],
//       });

//       await newUserChats.save();
//     } else {
//       await UserChats.updateOne(
//         { userId },
//         {
//           $push: {
//             chats: {
//               _id: savedChat._id,
//               title: text.substring(0, 40),
//             },
//           },
//         }
//       );
//     }

//     res.status(201).send(savedChat._id);
//   } catch (err) {
//     console.error("Error creating chat:", err);
//     next(err);
//   }
// });

// // Get all chats for a user
// app.get("/api/userchats", ClerkExpressRequireAuth(), async (req, res, next) => {
//   const userId = req.auth.userId;

//   try {
//     const userChats = await UserChats.findOne({ userId });

//     if (!userChats) {
//       return res.status(404).send("No chats found for user.");
//     }

//     res.status(200).send(userChats.chats);
//   } catch (err) {
//     console.error("Error fetching user chats:", err);
//     next(err);
//   }
// });

// // Get a specific chat by ID
// app.get("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res, next) => {
//   const userId = req.auth.userId;

//   try {
//     const chat = await Chat.findOne({ _id: req.params.id, userId });

//     if (!chat) {
//       return res.status(404).send("Chat not found.");
//     }

//     res.status(200).send(chat);
//   } catch (err) {
//     console.error("Error fetching chat:", err);
//     next(err);
//   }
// });

// // Update a chat with a new question and answer
// app.put("/api/chats/:id", ClerkExpressRequireAuth(), async (req, res, next) => {
//   const userId = req.auth.userId;
//   const { question, answer, img } = req.body;

//   const newItems = [
//     ...(question ? [{ role: "user", parts: [{ text: question }], ...(img && { img }) }] : []),
//     { role: "model", parts: [{ text: answer }] },
//   ];

//   try {
//     const updatedChat = await Chat.updateOne(
//       { _id: req.params.id, userId },
//       {
//         $push: {
//           history: {
//             $each: newItems,
//           },
//         },
//       }
//     );

//     if (updatedChat.nModified === 0) {
//       return res.status(404).send("Chat not found or not updated.");
//     }

//     res.status(200).send(updatedChat);
//   } catch (err) {
//     console.error("Error updating chat:", err);
//     next(err);
//   }
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);

//   if (err.status === 401) {
//     res.status(401).send("Unauthenticated!");
//   } else if (err.name === "ValidationError") {
//     res.status(400).send(`Validation Error: ${err.message}`);
//   } else {
//     res.status(500).send("Internal Server Error");
//   }
// });

// // Serve static files in production
// if (process.env.NODE_ENV === "production") {
//   app.use(express.static(path.join(__dirname, "../client/dist")));

//   app.get("*", (req, res) => {
//     res.sendFile(path.join(__dirname, "../client/dist", "index.html"));
//   });
// }

// // Start server and connect to MongoDB
// app.listen(port, () => {
//   connect();
//   console.log(`Server running on port ${port}`);
// });
