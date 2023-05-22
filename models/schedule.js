const mongoose = require('mongoose')
const Guard = require('../models/guard')

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
        required: true
    }
})

scheduleSchema.statics.updateScheduleNewContract = async function(contract) {
    const contractDays = contract.datesOfMonth
    for (const day of contractDays) {
        try {
            const requiresArmedGuardCredential = contract.requiresArmedGuardCredential
            let filterObject = {"daysOccupied": {"$ne": day}}
            if (requiresArmedGuardCredential) {
                filterObject = {...filterObject, "hasArmedGuardCredential": {"$eq": true}}
            }
            const availableGuards = await Guard.find(filterObject).sort({hoursWorked: 1})
            let availableGuard
            for (const guard of availableGuards) {
                if (hoursWorkedThisWeek(guard.daysOccupied, day) < 60) {
                    availableGuard = guard
                    break
                }
            }
            if (availableGuard) {
                await this.create({
                    contract: contract._id,
                    guard: availableGuard._id,
                    day: day
                })
                availableGuard.daysOccupied.push(day)
                availableGuard.hoursWorked = availableGuard.hoursWorked + 10
                await availableGuard.save()
            } else {
                console.log("Not enough officers to cover this contract. Please appoint more officers")
                throw Error("Not enough officers to cover this contract. Please appoint more officers")
            }     
        } catch (error) {
            console.log(error.message)
        }       
    };
}

scheduleSchema.statics.updateScheduleAfterPto = async function(guardId, ptoDay) {
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
                const availableGuards = await Guard.find(filterObject).sort({hoursWorked: 1})
                let availableGuard
                for (const guard of availableGuards) {
                    if (hoursWorkedThisWeek(guard.daysOccupied, affectedEntry.day) < 60) {
                        availableGuard = guard
                        break
                    }
                }
                if (availableGuard) {
                    await this.create({
                        contract: affectedEntry.contract._id,
                        guard: availableGuard._id,
                        day: affectedEntry.day
                    })
                    availableGuard.daysOccupied.push(affectedEntry.day)
                    availableGuard.hoursWorked = availableGuard.hoursWorked + 10
                    await availableGuard.save()
                } else {
                    console.log("Not enough officers to cover this contract. Please appoint more officers or reject PTO request for officer: " + guardId)
                    throw Error("Not enough officers to cover this contract. Please appoint more officers or reject PTO request for officer: " + guardId)
                }
            }
        }
    } catch (error) {        
        console.log(error.message)
        throw Error(error.message)
    }
}

scheduleSchema.statics.updateScheduleAfterGuardDelete = async function(guardId) {
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
                const availableGuards = await Guard.find(filterObject).sort({hoursWorked: 1})
                let availableGuard
                for (const guard of availableGuards) {
                    if (hoursWorkedThisWeek(guard.daysOccupied, affectedEntry.day) < 60) {
                        availableGuard = guard
                        break
                    }
                }
                if (availableGuard) {
                    await this.create({
                        contract: affectedEntry.contract._id,
                        guard: availableGuard._id,
                        day: affectedEntry.day
                    })
                    availableGuard.daysOccupied.push(affectedEntry.day)
                    availableGuard.hoursWorked = availableGuard.hoursWorked + 10
                    await availableGuard.save()
                } else {
                    console.log("Not enough officers to cover this contract. Please appoint more officers")
                    throw Error("Not enough officers to cover this contract. Please appoint more officers")
                }
            }
        }
    } catch (error) {
        console.log(error.message)
        throw Error(error.message)
    }
}

scheduleSchema.statics.updateScheduleAfterContractDelete = async function(contractId) {
    try {
        const affectedScheduleEntries = await this.find({"contract": {"$eq": contractId}})
        await this.deleteMany({"contract": {"$eq": contractId}})        
        if (affectedScheduleEntries.length > 0) {
            for (const affectedEntry of affectedScheduleEntries) {                
                let contractGuard = await Guard.findById(affectedEntry.guard)   
                contractGuard.daysOccupied = contractGuard.daysOccupied.filter(day => day !== affectedEntry.day)
                contractGuard.hoursWorked = contractGuard.hoursWorked - 10                                                                         
                await contractGuard.save()
            }
        }
    } catch (error) {
        console.log(error.message)
        throw Error(error.message)
    }
}

function hoursWorkedThisWeek(daysOccupied, currentDate) {
    const currentDateTime = new Date(currentDate).getTime();
    const currentWeekStart = new Date(currentDateTime);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);
    
    const currentWeekEnd = new Date(currentDateTime);
    currentWeekEnd.setDate(currentWeekEnd.getDate() + (6 - currentWeekEnd.getDay()));
    currentWeekEnd.setHours(23, 59, 59, 999);
    
    const count = daysOccupied.filter(dateStr => {
      const dateTime = new Date(dateStr).getTime();
      return dateTime >= currentWeekStart.getTime() && dateTime <= currentWeekEnd.getTime();
    }).length;
    
    return count * 10;
}

module.exports = mongoose.model('Schedule', scheduleSchema)