const mongoose = require("mongoose");

const connection = mongoose.connect('mongodb://0.0.0.0/Chatting').then(()=>{
    console.log("connected database");
    
})
module.exports = connection;