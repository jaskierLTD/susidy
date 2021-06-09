const express = require('express')
const passport = require('passport')
const controller = require('../controllers/post')
const router = express.Router()

router.post('/r',          controller.getByRadius)
router.get('/post/:id',    controller.showDetails)
router.get('/latest',      controller.getLatest)
router.get('/user/:email', passport.authenticate('jwt', {session: false}), controller.getByUser)
router.delete('/:id',      passport.authenticate('jwt', {session: false}), controller.remove)
router.post('/',           passport.authenticate('jwt', {session: false}), controller.create)
router.post('/:id',        passport.authenticate('jwt', {session: false}), controller.update)

module.exports = router
