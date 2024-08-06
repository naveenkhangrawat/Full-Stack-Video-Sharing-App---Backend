
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import ErrorHandler from "./utils/ErrorHandler.js";

const app = express();

// middlewares

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}));

app.use(cookieParser());

app.use(express.json({limit: "16kb"}));

app.use(express.urlencoded({extended: true, limit: "16kb"}));

app.use(express.static("public"));



// importing routes

// import homeRouter from "./routes/home.route.js";
import userRouter from "./routes/user.route.js";
import subscriptionRouter from "./routes/subscription.route.js";
import likeRouter from "./routes/like.route.js";
import commentRouter from "./routes/comment.route.js";
import tweetRouter from "./routes/tweet.route.js";
import videoRouter from "./routes/video.route.js";
import playlistRouter from "./routes/playlist.route.js";
import healthcheckRouter from "./routes/healthcheck.route.js";
import dashboardRouter from "./routes/dashboard.route.js"


// routes declaration

// app.use("/", homeRouter);
app.use("/api/v1/users", userRouter);
app.use("/api/v1/subscriptions", subscriptionRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/dashboard", dashboardRouter);

// Error handler middleware
app.use(ErrorHandler);

export {app}