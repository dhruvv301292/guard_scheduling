const express = require('express')
const router = express.Router()
const Guard = require('../models/guard')
const Schedule = require('../models/schedule')

// Get all guards
router.get('/', async (req, res) => {
    try {
        const results = await Guard.find().sort({hoursWorked: 1})
        res.json(results)
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
  })

router.get('/:id', getGuardById, async (req, res) => {
    try {
        res.json(res.guard)
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
})

// Create a guard 
router.post('/', async (req, res) => {
    const guard = new Guard({
        name: req.body.name,
        hasArmedGuardCredential: req.body.hasArmedGuardCredential
    })
    try {
        const newGuard = await guard.save()
        res.status(201).json(newGuard)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }    
})

// Update a guard
router.patch('/:id', getGuardById, async (req, res) => {
    let ptoDay, guardId;
    if (req.body.name != null) {
        res.guard.name = req.body.name
    }
    if (req.body.hasArmedGuardCredential != null) {
        res.guard.hasArmedGuardCredential = req.body.hasArmedGuardCredential
    }
    if (req.body.pto != null) {
        ptoDay = convertToDateFormat(req.body.pto)
        if (!res.guard.daysOccupied.includes(ptoDay)) {            
            res.guard.daysOccupied.push(ptoDay)            
        } else {
            res.guard.hoursWorked = res.guard.hoursWorked - 10
        }
        res.guard.pto.push(ptoDay)
        guardId = res.guard._id 
    }
    if (req.body.daysOccupied != null) {
        res.guard.daysOccupied = req.body.daysOccupied
    }
    if (req.body.hoursWorked != null) {
        res.guard.hoursWorked = req.body.hoursWorked
    }
    try {
        const updatedGuard = await res.guard.save()
        if (ptoDay) {
            await Schedule.updateScheduleAfterPto(guardId, ptoDay)
        }        
        res.json(updatedGuard)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})


//delete a guard
router.delete('/:id', getGuardById, async (req, res) => {
    try {
        await res.guard.deleteOne()
        Schedule.updateScheduleAfterGuardDelete(res.guard.id)
        res.json({message: 'Delete Successful'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

//delete all guards
router.delete('/', async (req, res) => {
    try {
        await Guard.deleteMany()
        res.json({message: 'Deleted all guards successfully'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

//middleware to fetch a guard by id since many of the routes are using this
async function getGuardById(req, res, next) {
    let guard;
    try {
        guard = await Guard.findById(req.params.id)
        if (guard == null) {
            return res.status(404).json({messsage: "Cannot find guard with id: " + req.params.id})
        }
    } catch (error) {
        res.status(500).json({message: error.message})
    }
    res.guard = guard
    next()
}

function convertToDateFormat(ptoDate) {
    ptoDate = new Date(ptoDate)
    const formattedDate = `${ptoDate.toLocaleDateString('en-US', { weekday: 'long' })}, ${ptoDate.getMonth() + 1}/${ptoDate.getDate()}/${ptoDate.getFullYear()}`;
    return formattedDate
}

module.exports = router