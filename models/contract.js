const mongoose = require('mongoose')

const contractSchema = new mongoose.Schema({
    // the name of the contract - separate from Id since mongoose requires Ids to be in specific format
    name: {
        type: String,
        required: true
    },

    // the duration in days after which contract will be renewed and shifts re-assigned
    renewalDuration: {
        type: Number,
        default: 14
    },

    // whether the contract requires an armed guard credential
    requiresArmedGuardCredential: {
        type: Boolean,
        default: false
    },

    // days of the week on which guard services are required
    daysOfWeek: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    },

    // the start date of the contract - same as creation date of contract - renewal duration also starts on this date
    startDate: {
        type: Date,
        default: Date.now
    },

    // dates within the renewal duration for which guarding services are required starting in the week of startDate
    datesOfMonth: {
        type: [String]
    }
})

// logic to generate datesOfMonth before every save
contractSchema.pre('save', function(next) {
    const dates = [];
    const currentDate = this.startDate
    const daysOfWeek = this.daysOfWeek
    for (let i = 0; i < this.renewalDuration; i++) {
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