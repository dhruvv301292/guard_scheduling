const mongoose = require('mongoose')

const guardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    hasArmedGuardCredential: {
        type: Boolean,
        default: false
    },
    pto: {
        type: [Date]
    },
    daysOccupied: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    },
    hoursWorked: {
        type: Number,
        default: function() {
            return this.daysOccupied.length
        }
    }
})

module.exports = mongoose.model('Guard', guardSchema)