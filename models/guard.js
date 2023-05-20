const mongoose = require('mongoose')

const guardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    hasArmedGuardCredential: {
        type: Boolean,
        default: false
    }
})

module.exports = mongoose.model('Guard', guardSchema)