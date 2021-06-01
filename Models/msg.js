const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const fileSchema = new Schema({
    url: String,
    filename: String
});

const msgSchema = new Schema({
    file: [fileSchema],
    description: String,
    author: {
        type: Schema.Types.ObjectId,
        ref: "User"
    },
    friend: String,
    CreatedAt: String
});

module.exports = mongoose.model('msg', msgSchema);