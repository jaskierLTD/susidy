const mongoose = require('mongoose')
const Schema = mongoose.Schema

const userSchema = new Schema({
  username: {
    type: String,
    unique: false
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  confirmed: {
    type: Boolean,
    default: false
  },
  dateOfBirth: {
    type: String,
    required: true
  },
  genderMale: {
    type: Boolean,
    required: true
  },
  phone:{
    type: String,
    unique: true,
    required: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  subscription: {
    type: Boolean,
    default: false
  },
  subscriptionExpires: {
    type: Date,
    default: null
  },
  nextPost: {
    type: Date,
    default: null
  },
  codeRef: {
    type: String,
    unique: true
  },
  refBy: {
    type: String,
    default: null
  },
  codeCount: {
    type: Number,
    default: 5
  },
  basicCount: {
    type: Number,
    default: 3
  },
  balance: {
    type: Number,
    default: "20.79"
  },
  registerDate: {
    type: Date,
    default: Date.now
  }
})

module.exports = mongoose.model('users', userSchema)
