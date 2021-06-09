const mongoose = require('mongoose')
const Schema = mongoose.Schema

// Note that longitude comes first in a GeoJSON coordinate array, not latitude.
const postSchema = new Schema({
  _userId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'users'
  },
  date: {
    type: Date,
    default: Date.now
  },
  term: {
    type: Number,
    default: 7
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  cat1: {
    type: Number,
    required: true
  },
  cat2: {
    type: Number,
    required: true
  },
  location : {
    type: {
      type: String,
      enum: ['Point'],
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    }
  },
  views: {
    type: Number,
    default: 0
  }
})

postSchema.index({location: '2dsphere'})
module.exports = mongoose.model('posts', postSchema)
