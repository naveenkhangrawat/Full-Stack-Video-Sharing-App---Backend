
// require('dotenv').config()

import {app} from "./app.js";
import connectDB from "./db/connectDB.js";
import dotenv from "dotenv"

dotenv.config({
    path: "./.env"
})



connectDB().then(() => {
    app.on("error", (error) => {
        console.log("ERROR event occured: ", error);
    })

    app.listen(process.env.PORT || 8080, () => {
        console.log(`App is listening on port: ${process.env.PORT}`);
    })
}).catch((error) => {
    console.log("MONGODB connection Failed: ", error);
});













// import mongoose from "mongoose";
// import { DB_NAME } from "./constants.js";
// ( async () => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URL/DB_NAME}/${DB_NAME}`);

//         app.on("error", function(error){
//             console.log("Error: ", error);
//             throw error;
//         })

//         app.listen(process.env.PORT, function(){
//             console.log(`App is listening on port: ${process.env.PORT}`);
//         })
//     } catch (error) {
//         console.log("ERROR: ", error);
//         throw error;
//     }
// } )()