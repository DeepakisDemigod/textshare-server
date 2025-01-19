const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
    url: { type: String, required: true, unique: true },
    content: { type: String, default: '' },
});

module.exports = mongoose.model('Note', NoteSchema);


