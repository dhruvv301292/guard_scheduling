const mongoose = require('mongoose')

const guardSchema = new mongoose.Schema({
    // name of the guard
    name: {
        type: String,
        required: true
    },

    // whether the guard has an armed credential or not
    hasArmedGuardCredential: {
        type: Boolean,
        default: false
    },

    // dates on which the guard is occupied: includes both shifts and PTO  - saving as strings to facilitate easier comparisons
    daysOccupied: {
        type: [String]
    },

    // dates on which the guard is on PTO
    pto: {
        type: [String]
    },

    // total hours worked by guard - used for sorting
    hoursWorked: {
        type: Number,
        default: function() {
            return this.daysOccupied.length
        }
    }
})

module.exports = mongoose.model('Guard', guardSchema)