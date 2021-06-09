const express = require('express')
const passport = require('passport')
const upload = require('../middleware/upload')
const controller = require('../controllers/category')
const router = express.Router()

//usual
//router.delete('/:id', controller.remove)
router.get('/',       controller.getAll)
router.get('/:id',    passport.authenticate('jwt', {session: false}), controller.getById)
router.delete('/:id', passport.authenticate('jwt', {session: false}), controller.remove)
router.post('/',      passport.authenticate('jwt', {session: false}), upload.single('image'), controller.create)
router.post('/:id',   passport.authenticate('jwt', {session: false}), upload.single('image'), controller.update)

module.exports = router
