import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.DB_URL}/${DB_NAME}`
    );
    console.log(
      `\n MongoDB Connected !! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (err) {
    console.log("DB Connection error: ", err);
    // Process is a node-js method to terminate a process.
    process.exit(1);
  }
};

export default connectDB;
