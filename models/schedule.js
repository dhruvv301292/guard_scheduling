const mongoose = require('mongoose')
const Guard = require('../models/guard')

const scheduleSchema = new mongoose.Schema({
    // refernce to the contract document
    contract: {
        type: mongoose.SchemaTypes.ObjectId,
        required: true,
        ref: 'Contract'
    },

    // refernce to the guard document
    guard: {
        type: mongoose.SchemaTypes.ObjectId,
        required: true,
        ref: 'Guard'
    },

    // date of this schedule entry
    day: {
        type: Date,
        required: true
    }
})



/*
* logic to update schedule when new contract is added
* The idea is to search for available guards and sort them by total hours worked. 
* Guards are filtered for armed credential if the contract demands it. 
* Each guard is also checked for hours worked in the week of the shift date and 
* assigned the shift if they're not already assigned 60 hours of shifts for that week.
* After the assignment of every shift, the hoursWorked field of the guard is incremented by shift duration
* and persisted to the db so that the next shift is assigned to another guard for equal distribution
*/
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
                    day: new Date(day)
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
            throw Error(error.message)
        }       
    };
}

// logic to update schedule when a guard goes on PTO and their shift for that date needs to be reassigned
scheduleSchema.statics.updateScheduleAfterPto = async function(guardId, ptoDay) {
    try {
        const affectedScheduleEntries = await this.find({"guard": {"$eq": guardId}, "day": {"$eq": new Date(ptoDay)}}).populate('contract', 'requiresArmedGuardCredential')
        await this.deleteMany({"guard": {"$eq": guardId}, "day": {"$eq": new Date(ptoDay)}})
        if (affectedScheduleEntries.length > 0) {
            for (const affectedEntry of affectedScheduleEntries) {
                const requiresArmedGuardCredential = affectedEntry.contract.requiresArmedGuardCredential
                let filterObject = {"daysOccupied": {"$ne": getDateString(affectedEntry.day)}}
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
                    availableGuard.daysOccupied.push(getDateString(affectedEntry.day))
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

// logic to update schedule when a guard document is deleted and their shifts need to be reassigned to other available guards
scheduleSchema.statics.updateScheduleAfterGuardDelete = async function(guardId) {
    try {        
        const affectedScheduleEntries = await this.find({"guard": {"$eq": guardId}}).populate('contract', 'requiresArmedGuardCredential')
        await this.deleteMany({"guard": {"$eq": guardId}})
        if (affectedScheduleEntries.length > 0) {
            for (const affectedEntry of affectedScheduleEntries) {
                const requiresArmedGuardCredential = affectedEntry.contract.requiresArmedGuardCredential
                let filterObject = {"daysOccupied": {"$ne": getDateString(affectedEntry.day)}}
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
                    availableGuard.daysOccupied.push(getDateString(affectedEntry.day))
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

// logic to update schedule when a contract document is deleted and guards working shifts of that contract need their daysOccupied to be cleared
scheduleSchema.statics.updateScheduleAfterContractDelete = async function(contractId) {
    try {
        const affectedScheduleEntries = await this.find({"contract": {"$eq": contractId}})
        await this.deleteMany({"contract": {"$eq": contractId}})        
        if (affectedScheduleEntries.length > 0) {
            for (const affectedEntry of affectedScheduleEntries) {                
                let contractGuard = await Guard.findById(affectedEntry.guard)   
                contractGuard.daysOccupied = contractGuard.daysOccupied.filter(day => day !== getDateString(affectedEntry.day))
                contractGuard.hoursWorked = contractGuard.hoursWorked - 10                                                                         
                await contractGuard.save()
            }
        }
    } catch (error) {
        console.log(error.message)
        throw Error(error.message)
    }
}

// function to compute the total number of hours worked by guard in the week pertaining to a certain date - to ensure that no guard is assigned more than 60 hours worth of shifts 
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

function getDateString(date) {
    return `${date.toLocaleDateString('en-US', { weekday: 'long' })}, ${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

module.exports = mongoose.model('Schedule', scheduleSchema)