const mongoose = require('mongoose')

const CONTRACT_DURATION = 30

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
    },
    datesOfMonth: {
        type: [String]
    }
})

contractSchema.pre('save', function(next) {
    const dates = [];
    const currentDate = this.startDate
    const daysOfWeek = this.daysOfWeek
    for (let i = 0; i < CONTRACT_DURATION; i++) {
        if (daysOfWeek.includes(currentDate.toLocaleDateString('en-US', { weekday: 'long' }))) {
            const formattedDate = `${currentDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${currentDate.getMonth() + 1}/${currentDate.getDate()}/${currentDate.getFullYear()}`;
            dates.push(formattedDate);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    this.datesOfMonth = dates
    next()
});

module.exports = mongoose.model('Contract', contractSchema)