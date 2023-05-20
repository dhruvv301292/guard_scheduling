const mongoose = require('mongoose')

const contractSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    requiresArmedGuardCredential: {
        type: Boolean,
        default: false
    },
    daysOfWeek: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },
    startDate: {
        type: Date,
        default: Date.now
    }
})

module.exports = mongoose.model('Contract', contractSchema)