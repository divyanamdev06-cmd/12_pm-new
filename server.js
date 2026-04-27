import "dotenv/config";
import express from "express";
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.route.js"
import otpRoutes from "./routes/otp.routes.js";
import jobRoutes from "./routes/jobRoutes.js";
import category from "./routes/category.routes.js"
import { sendResponse } from "./utils/response.js";

import cors from "cors";
const app = express();
connectDB();
app.use(express.json())
app.use(cors())
app.get("/",(req,res)=>{
    try{
        return sendResponse(res, {
          message: "Server is running",
          data: { ok: true }
        });
    }
    catch(error){
         return sendResponse(res, {
          success: false,
          statusCode: 500,
          message: "Server error",
          error: error.message
        });
    }
    
})

app.use("/api/v1/user",userRouter);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/job", jobRoutes);
app.use("/api/v1/category",category);

// 404 handler
app.use((req, res) => {
  return sendResponse(res, {
    success: false,
    statusCode: 404,
    message: "Route not found",
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT,function(){
    console.log(`server is running on ${PORT}`)
})