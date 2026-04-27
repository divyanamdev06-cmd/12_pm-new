import express from "express"
import { connectDB } from "./config/db.js";
import userRouter from "./routes/user.route.js"
import otpRoutes from "./routes/otp.routes.js";
import jobRoutes from "./routes/jobRoutes.js";
import category from "./routes/category.routes.js"

import cors from "cors";
const app = express();
connectDB();
  app.use(express.json())
app.use(cors())
app.get("/",(req,res)=>{
    try{
        return res.json({
            message:"server is connect sucessfully",
            success:true
        })
    }
    catch(error){
         return res.json({
            message:"server error",
            success:false
        })
    }
    
})

app.use("/api/v1/user",userRouter);
app.use("/api/v1/otp", otpRoutes);
app.use("/api/v1/job", jobRoutes);
app.use("/api/v1/category",category);



app.listen(3000,function(){
    console.log("server is rumnning")
})