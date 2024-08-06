
import express from "express";

const router = express.Router();

router.get("/", function(req, res){
    res.json({message: "home page"});
})

router.get("/about", function(req, res){
    res.json({message: "about page"});
})

export default router;