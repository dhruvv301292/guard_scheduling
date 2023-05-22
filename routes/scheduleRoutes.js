const express = require('express')
const router = express.Router()
const Guard = require('../models/guard')
const Contract = require('../models/contract')
const Schedule = require('../models/schedule')

// Get all entries in schedule
router.get('/', async (req, res) => {
    let start = req.query.start
    let end = req.query.end
    console.log(start)
    console.log(end)
    let filterObject
    if (start) {
        start = new Date(start)
        filterObject = {day: {$gte: start}}
    }
    if (end) {
        end = new Date(end)
        filterObject.day.$lte = end
    }
    console.log(filterObject)
    try {
        const results = await Schedule.find(filterObject).populate('guard', 'name -_id').populate('contract', 'name -_id').select('-_id -__v').sort({day: 1})
        res.json(results)
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
  })

router.delete('/', async (req, res) => {
    try {
        await Schedule.deleteMany({ contract: {$exists: true} })
        res.json({message: 'All schedule entries deleted successfully'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

module.exports = router