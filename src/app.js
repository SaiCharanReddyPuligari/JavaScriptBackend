import express, { urlencoded } from "express";
import cookieParser from "cookie-parser";
import cors from "cors"; 
//cross-origin resource sharing (CORS) enables secure communication between applications hosted on different origins
//Also helps in securing the server by restrcieting methods, and requests like only HTTPS, GET, POST

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}))

app.use(express.json({limit: '16kb'})) //size of the json file
app.use(express.urlencoded({extended: true, limit: '16kb'}))  //accepting the different types of url encoding (+, %)
app.use(express.static("public")) //static middleware store the files, images locally
app.use(cookieParser())

export { app };