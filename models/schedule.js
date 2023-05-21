const mongoose = require('mongoose')
const Guard = require('../models/guard')
const Contract = require('../models/contract')

const scheduleSchema = new mongoose.Schema({
    contract: {
        type: mongoose.SchemaTypes.ObjectId,
        required: true,
        ref: 'Contract'
    },
    guard: {
        type: mongoose.SchemaTypes.ObjectId,
        required: true,
        ref: 'Guard'
    },
    day: {
        type: String,
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        required: true
    }
})

scheduleSchema.statics.updateScheduleNewContract = async function(contract) {
    contractDays = contract.daysOfWeek
    updatedGuards = []
    for (const day of contractDays) {
        try {
            availableGuard = await Guard.findOne({"daysOccupied": {"$ne": day}}).sort({hoursWorked: 1})            
            if (availableGuard) {
                scheduleEntry = await this.create({
                    contract: contract._id,
                    guard: availableGuard._id,
                    day: day
                })
                localGuardObj = updatedGuards.find(guard => guard._id === availableGuard._id)                
                if (localGuardObj) {
                    localGuardObj.daysOccupied.push(day)
                    localGuardObj.hoursWorked = localGuardObj.hoursWorked + 10                                                      
                } else {
                    localGuardObj = availableGuard
                    localGuardObj.daysOccupied.push(day)
                    localGuardObj.hoursWorked = localGuardObj.hoursWorked + 10
                    updatedGuards.push(localGuardObj)                                 
                }
            } else {
                console.log("Not enough officers to cover this contract. Please appoint more officers")
            }     
        } catch (error) {
            console.log(error.message)
        }       
    };
    for (const guard of updatedGuards) {
        await guard.save()
    }
}

module.exports = mongoose.model('Schedule', scheduleSchema)