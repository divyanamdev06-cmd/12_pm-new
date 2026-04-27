import mongoose from "mongoose";
export const connectDB= async()=>{
    try{
        await mongoose.connect("mongodb://localhost:27017/12pmnew")
        console.log("database connected")
    }
    catch(error){
        console.log("database not connected")
    }
 }