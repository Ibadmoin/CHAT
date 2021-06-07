const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const fileSchema = new Schema({
    url: String,
    filename: String
});
const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    photo: [fileSchema]
})

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('User', UserSchema);