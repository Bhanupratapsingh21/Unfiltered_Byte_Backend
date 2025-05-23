import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import dotenv from 'dotenv'


const app = express();

dotenv.config({
    path: "./env"
})
const corsarry = [
    process.env.CORS_ORIGIN1,
    process.env.CORS_ORIGIN2,
    process.env.CORS_ORIGIN3,
]
/// use is used for middle wares or configration parts
app.use(cors({
    origin: corsarry,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    credentials: true, // Allow credentials
    preflightContinue: false,
    optionsSuccessStatus: 204
    // read about cors or cridentials or whitelisting 
}))

app.use(express.json({
    limit: "16kb",
}))

// Trust proxy settings (placing it before middleware)
app.set('trust proxy', true);
app.use(helmet());
app.use(morgan('combined'));
app.use(express.urlencoded({ extended: true, limit: "16kb" }))
app.use(express.static("Public"))
app.use(cookieParser())
app.get("/checkhealthstatus", healthcheck);

// routes import 
import TweetsRouter from "./routes/Posts.routes.js"
import Videorouter from "./routes/video.routes.js"
import LikeRouter from "./routes/like.routes.js"
import CommentRouter from "./routes/comments.routes.js"
import SubscriptionRouter from "./routes/subscription.routes.js"
import { healthcheck } from "./controllers/healthcheck.controller.js"
import globalsearchRouter from "./routes/globalsearch.routes.js";
import { getTrendingTags } from "./controllers/dashboard.controller.js";
import helmet from "helmet";
import morgan from "morgan";

// routes declaration
app.use("/api/v1/tweets", TweetsRouter);
app.use("/api/v1/videos", Videorouter);
app.use("/api/v1/like", LikeRouter)
app.use("/api/v1/comment", CommentRouter);
app.use("/api/v1/subscriptions", SubscriptionRouter);
app.use("/api/v1/search", globalsearchRouter);
app.use("/api/v1/tranding", getTrendingTags);

export { app }