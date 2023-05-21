const express = require('express')
const router = express.Router()
const Guard = require('../models/guard')
const Contract = require('../models/contract')
const Schedule = require('../models/schedule')

// Get all entries in schedule
router.get('/', async (req, res) => {
    try {
        const results = await Schedule.find().populate('guard', 'name -_id').populate('contract', 'name -_id').select('-_id -__v')
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