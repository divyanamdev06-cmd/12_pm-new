// import mongoose from "mongoose";
// export const connectDB= async()=>{
//     try{
//         // await mongoose.connect("mongodb://localhost:27017/12pmnew")
//        await mongoose.connect("mongodb+srv://divyanamdev06_db_user:1neb4nVYYHUOMHMq@cluster0.fslughg.mongodb.net/12pmnew")
//         console.log("database connected")
//     }
//     catch(error){
//         console.log("database not connected")
//     }
//  }
import mongoose from "mongoose";
export const connectDB= async()=>{
    try{
        await mongoose.connect("mongodb+srv://divyanamdev06_db_user:1neb4nVYYHUOMHMq@cluster0.fslughg.mongodb.net/12pmnew")
        console.log("database connected")
    }
    catch(error){
        console.log("database not connected")
    }
 }