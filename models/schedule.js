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
    const contractDays = contract.daysOfWeek    
    let updatedGuards = []
    for (const day of contractDays) {
        try {
            const requiresArmedGuardCredential = contract.requiresArmedGuardCredential
            let filterObject = {"daysOccupied": {"$ne": day}}
            if (requiresArmedGuardCredential) {
                filterObject = {...filterObject, "hasArmedGuardCredential": {"$eq": true}}
            }
            const availableGuard = await Guard.findOne(filterObject).sort({hoursWorked: 1})
            if (availableGuard && availableGuard.hoursWorked < 60) {
                await this.create({
                    contract: contract._id,
                    guard: availableGuard._id,
                    day: day
                })
                let localGuardObj = updatedGuards.find(guard => guard._id.toString() === availableGuard._id.toString())
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

scheduleSchema.statics.updateScheduleAfterPto = async function(guardId, ptoDay) {
    let updatedGuards = []
    try {
        const affectedScheduleEntries = await this.find({"guard": {"$eq": guardId}, "day": {"$eq": ptoDay}}).populate('contract', 'requiresArmedGuardCredential')
        await this.deleteMany({"guard": {"$eq": guardId}, "day": {"$eq": ptoDay}})
        if (affectedScheduleEntries.length > 0) {
            for (const affectedEntry of affectedScheduleEntries) {
                const requiresArmedGuardCredential = affectedEntry.contract.requiresArmedGuardCredential
                let filterObject = {"daysOccupied": {"$ne": affectedEntry.day}}
                if (requiresArmedGuardCredential) {
                    filterObject = {...filterObject, "hasArmedGuardCredential": {"$eq": true}}
                }
                let availableGuard = await Guard.findOne(filterObject).sort({hoursWorked: 1})
                if (availableGuard) {
                    await this.create({
                        contract: affectedEntry.contract._id,
                        guard: availableGuard._id,
                        day: affectedEntry.day
                    })
                    let localGuardObj = updatedGuards.find(guard => guard._id.toString() === availableGuard._id.toString())
                    if (localGuardObj) {
                        localGuardObj.daysOccupied.push(affectedEntry.day)
                        localGuardObj.hoursWorked = localGuardObj.hoursWorked + 10                                                      
                    } else {
                        localGuardObj = availableGuard
                        localGuardObj.daysOccupied.push(affectedEntry.day)
                        localGuardObj.hoursWorked = localGuardObj.hoursWorked + 10
                        updatedGuards.push(localGuardObj)                                 
                    }
                } else {
                    console.log("Not enough officers to cover this contract. Please appoint more officers or reject PTO request")
                }
            }
        }
    } catch (error) {
        console.log(error.message)
    }
    for (const guard of updatedGuards) {
        await guard.save()
    }   
}

scheduleSchema.statics.updateScheduleAfterGuardDelete = async function(guardId) {
    let updatedGuards = []
    try {        
        const affectedScheduleEntries = await this.find({"guard": {"$eq": guardId}}).populate('contract', 'requiresArmedGuardCredential')
        await this.deleteMany({"guard": {"$eq": guardId}})
        if (affectedScheduleEntries.length > 0) {
            for (const affectedEntry of affectedScheduleEntries) {
                const requiresArmedGuardCredential = affectedEntry.contract.requiresArmedGuardCredential
                let filterObject = {"daysOccupied": {"$ne": affectedEntry.day}}
                if (requiresArmedGuardCredential) {
                    filterObject = {...filterObject, "hasArmedGuardCredential": {"$eq": true}}
                }
                const availableGuard = await Guard.findOne(filterObject).sort({hoursWorked: 1})
                if (availableGuard) {
                    await this.create({
                        contract: affectedEntry.contract._id,
                        guard: availableGuard._id,
                        day: affectedEntry.day
                    })
                    let localGuardObj = updatedGuards.find(guard => guard._id.toString() === availableGuard._id.toString())
                    if (localGuardObj) {
                        localGuardObj.daysOccupied.push(affectedEntry.day)
                        localGuardObj.hoursWorked = localGuardObj.hoursWorked + 10                                                      
                    } else {
                        localGuardObj = availableGuard
                        localGuardObj.daysOccupied.push(affectedEntry.day)
                        localGuardObj.hoursWorked = localGuardObj.hoursWorked + 10
                        updatedGuards.push(localGuardObj)                                 
                    }
                } else {
                    console.log("Not enough officers to cover this contract. Please appoint more officers")
                }
            }
        }
    } catch (error) {
        console.log(error.message)
    }
    for (const guard of updatedGuards) {
        await guard.save()
    }
}

scheduleSchema.statics.updateScheduleAfterContractDelete = async function(contractId) {
    let updatedGuards = []
    try {
        const affectedScheduleEntries = await this.find({"contract": {"$eq": contractId}})
        await this.deleteMany({"contract": {"$eq": contractId}})        
        if (affectedScheduleEntries.length > 0) {
            for (const affectedEntry of affectedScheduleEntries) {
                console.log("affected Entry Guard: " + affectedEntry.guard)
                const contractGuard = await Guard.findById(affectedEntry.guard)  
                console.log("contract guard: " + contractGuard)            
                let localGuardObj = updatedGuards.find(guard => guard._id.toString() === contractGuard._id.toString())
                if (localGuardObj) {
                    localGuardObj.daysOccupied = localGuardObj.daysOccupied.filter(day => day !== affectedEntry.day)
                    localGuardObj.hoursWorked = localGuardObj.hoursWorked - 10                                                      
                } else {
                    localGuardObj = contractGuard
                    localGuardObj.daysOccupied = localGuardObj.daysOccupied.filter(day => day !== affectedEntry.day)
                    localGuardObj.hoursWorked = localGuardObj.hoursWorked - 10
                    updatedGuards.push(localGuardObj)                                 
                }                
                
            }
        }
    } catch (error) {
        console.log(error.message)
    }
    for (const guard of updatedGuards) {
        await guard.save()
    }
}

module.exports = mongoose.model('Schedule', scheduleSchema)