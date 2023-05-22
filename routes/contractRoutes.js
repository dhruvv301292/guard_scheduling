const express = require('express')
const router = express.Router()
const Contract = require('../models/contract')
const Schedule = require('../models/schedule')

// Get all contracts
router.get('/', async (req, res) => {
    try {
        const results = await Contract.find().exec()
        res.json(results)
    } catch (e) {
        res.status(500).json({ message: e.message })
    }
  })

// Create a contract 
router.post('/', async (req, res) => {
    const contract = new Contract({
        name: req.body.name,
        requiresArmedGuardCredential: req.body.requiresArmedGuardCredential,
        daysOfWeek: req.body.daysOfWeek,
        renewalDuration: req.body.renewalDuration
    })
    try {
        const newContract = await contract.save()
        await Schedule.updateScheduleNewContract(newContract.toObject())
        res.status(201).json(newContract)
    } catch (error) {
        res.status(400).json({ message: error.message })
    }    
})

// Update a contract
router.patch('/:id', getContractById, async (req, res) => {
    if (req.body.name != null) {
        res.contract.name = req.body.name
    }
    if (req.body.requiresArmedGuardCredential != null) {
        res.contract.requiresArmedGuardCredential = req.body.requiresArmedGuardCredential
    }
    if (req.body.daysOfWeek != null) {
        res.contract.daysOfWeek = req.body.daysOfWeek
    }
    try {
        const updatedContract = await res.contract.save()
        res.json(updatedContract)
    } catch (error) {
        res.status(400).json({message: error.message})
    }
})


//delete a contract
router.delete('/:id', getContractById, async (req, res) => {
    try {
        await res.contract.deleteOne()
        Schedule.updateScheduleAfterContractDelete(res.contract.id)
        res.json({message: 'Delete Successful'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

//delete all contracts
router.delete('/', async (req, res) => {
    try {
        await Contract.deleteMany()
        res.json({message: 'Delete Successful'})
    } catch (error) {
        res.status(500).json({message: error.message})
    }
})

//middleware to fetch a contract by id since many of the routes are using this
async function getContractById(req, res, next) {
    let contract;
    try {
        contract = await Contract.findById(req.params.id)
        if (contract == null) {
            return res.status(404).json({messsage: "Cannot find contract with id: " + req.params.id})
        }
    } catch (error) {
        res.status(500).json({message: error.message})
    }
    res.contract = contract
    next()
}

module.exports = router