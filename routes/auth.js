const express = require('express')
const controller = require('../controllers/auth')
const router = express.Router()

//localhost:5000/api/auth/login
router.post('/login',                     controller.login)

//localhost:5000/api/auth/register
router.post('/register',                  controller.register)
router.post('/resendLink',                controller.resendLink)
router.get('/confirmation/:email/:token', controller.confirm)

module.exports = router
