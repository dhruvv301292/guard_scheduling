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
    daysOccupied: {
        type: [String]
    },
    hoursWorked: {
        type: Number,
        default: function() {
            return this.daysOccupied.length
        }
    }
})

module.exports = mongoose.model('Guard', guardSchema)