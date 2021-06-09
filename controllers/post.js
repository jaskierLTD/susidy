const Post = require('../models/Post')
const User = require('../models/User')
const errorHandler = require('../utils/errorHandler')
const mongoose = require('mongoose') // database
const bcrypt = require('bcryptjs') // password security
const moment = require('moment') // time offset for date

// OBJECTS COUNTER
function objectLength(obj) {
  var result = 0
  for(var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
    // or Object.prototype.hasOwnProperty.call(obj, prop)
      result++
    }
  }
  return result
}

function deleteOldPosts(){
   // subtracting 7 days
   var current = moment().subtract(7, 'days');
   current = moment.utc(current).format();
   Post.deleteMany({ term : 7, date: {$lte: current} }, (err) => {
     if(err) return console.log("Error while erasing posts " + err)
     console.log("successfully removed 7 days old posts")
   })

   var current2 = moment().subtract(30, 'days');
   current2 = moment.utc(current2).format();
   Post.deleteMany({ term : 30, date: {$lte: current2} }, (err) => {
     if(err) return console.log("Error while erasing posts " + err)
     console.log("successfully removed 30 days old posts")
   })
}

module.exports.showDetails = async function(req, res) {
  const postSearch = await Post.findOne({_id: req.params.id})
  if (postSearch == null || postSearch == undefined){
    res.status(404).json({
      message: 'Такого оголошення не знайдено!'
    })
  } else {
    try {
      const post = await Post.findOneAndUpdate(
        {_id: req.params.id},
        {$set: {  views: postSearch.views + 1 } }
      )
      const postOwner = await User.findOne({_id: postSearch._userId})

      res.status(200).json({cat1: post.cat1,
                            cat2: post.cat2,
                            title: post.title,
                            description: post.description,
                            views: post.views,
                            user: postOwner.username,
                            phone: postOwner.phone
                          })
    } catch (e) {
      errorHandler(res, e)
    }
  }
}

module.exports.getByUser = async function(req, res) {
  const user = await User.findOne({email: req.params.email})
  try {
    deleteOldPosts()
    const posts = await Post.find({_userId: user._id}, { location: 0, _userId: 0, description: 0, __v : 0 })
    res.status(200).json(posts)
  } catch (e) {
    errorHandler(res, e)
  }
}

module.exports.getLatest = async function(req, res) {
  try {
    const posts = await Post.find({}, {location: 0, description: 0, __v : 0 }).limit(5).sort({date: -1})
    var index
    for (index = 0; index < posts.length; ++index) {
        const name = await User.findOne({_id: posts[index]._userId})
        posts[index] = {
          views: posts[index].views,
          _id: posts[index]._id,
          title: posts[index].title,
          cat1: posts[index].cat1,
          cat2: posts[index].cat2,
          date: posts[index].date,
          name: name.username
        }
    }

    res.status(200).json(posts)
  } catch (e) {
    errorHandler(res, e)
  }
}

module.exports.getByRadius = async function(req, res) {
  if (req.body.r > 1000) {
    res.status(404).json({
      message: 'Такого радіусу пошуку не знайдено!'
    })
  } else {
      try {
        deleteOldPosts()
        //const posts = await Post.find({ long: { $gt: 20, $lt: 40 } })
        const posts = await Post.find({
          location: {
            $near : {
              $geometry: { type: "Point",  coordinates: [req.body.myLong, req.body.myLat] },
              $maxDistance: req.body.r
            }
          },
          cat1: req.body.cat1,
          cat2: req.body.cat2
        },
        { location: 0, _userId: 0, description: 0, __v : 0 })
        res.status(200).json(posts)
      } catch (e) {
        errorHandler(res, e)
      }
  }
}

module.exports.remove = async function(req, res) {
  if (req.body.email == null) {
    res.status(404).json({
      message: 'Відсутній email!'
    })
  } else if (req.body.password == null) {
    res.status(404).json({
      message: 'Спробуйте увести пароль.'
    })
  } else {
  // Check password, user exist

    const user = await User.findOne({email: req.body.email})
    const passwordResult = bcrypt.compareSync(req.body.password, user.password)
    if (passwordResult) {
      const postSearch = await Post.findOne({_id: req.params.id})
      if (postSearch == null || postSearch == undefined){
        res.status(404).json({
          message: 'Такого оголошення не знайдено!'
        })
      } else if (postSearch._userId.toString() === user._id.toString()){
      // Auth ID should match POST id of the user

        try {
          await Post.remove({_id: req.params.id})
          res.status(200).json({
            message: 'Оголошення видалено.'
          })
        } catch (e) {
          errorHandler(res, e)
        }

      } else {
        console.log("\n" + user.email + " \nTRIES TO ACCESS POST OF USER:")
        const postOwner = await User.findOne({_id: postSearch._userId})
        console.log(postOwner.email + "\n")
        res.status(402).json({
          message: 'Ви не можете редагувати дані інших людей!'
        })
      }

    } else {
      res.status(404).json({
        message: 'Невірні дані авторизації'
      })
    }

  }
}

module.exports.create = async function(req, res) {
  if (req.body.email == null) {
    res.status(405).json({
      message: 'Відсутній email!'
    })
  } else {
    User.findOne({ email: req.body.email }, async function (err, user) {

        if ((user.balance <= 0.00) && !user.subscription) {
        // CHECK BALANCE

          res.status(402).json({
            message: 'Відсутні кошти для створення оголошень, купіть підписку або запросіть друзів!'
          })
        } else if ((moment(user.nextPost)>moment(moment())) && !user.subscription) {
        // CHECK NEXT POST IF AVAILABLE

          res.status(425).json({
            message: 'Ви зможете створити оголошення: ' + moment(user.nextPost).format("YYYY-MM-DD HH:mm")
          })
        } else {
          if (!user.subscription) {
          // subscription = false

              if ( (req.body.days == null) || (req.body.days == undefined) || (req.body.days != 7) ){
                res.status(405).json({
                  message: 'Оберіть вірний час активності оголошення!'
                })
              } else {
                user.balance =    user.balance - 6.93
                user.basicCount = user.basicCount - 1,
                user.nextPost =   moment().add(req.body.days, 'days').format()
                user.save(function (err) {
                    if(err){
                      res.status(500).json({
                        message: err.message
                      })
                    }
                    // POST CREATE
                    try {
                      const post = new Post({
                        _userId:      user._id,
                        title:        req.body.title,
                        description:  req.body.description,
                        cat1:         req.body.cat1,
                        cat2:         req.body.cat2,
                        term:         req.body.days,
                        location: { type: "Point", coordinates: [ req.body.long, req.body.lat ] },
                      })
                      post.save(function (err) {
                        if(err){
                          res.status(500).json({
                            message: err.message
                          })
                        } else {
                          res.status(201).json({
                            message: 'Оголошення: '+req.body.title+' успішно опубліковано!',
                            nextPost: user.nextPost,
                            balance: user.balance,
                            basicCount: user.basicCount
                          })
                        }
                      })
                    } catch (e) {
                      errorHandler(res, e)
                    }
                })
              }
          } else {
          // subscription = true

            if ( (req.body.days == null) || (req.body.days == undefined) || (req.body.days != 7) && (req.body.days != 30) ){
              res.status(405).json({
                message: 'Оберіть вірний час активності оголошення!'
              })
            } else {
              const posts = await Post.find({_userId: user._id})
              if (objectLength(posts) > 9) {
              // MORE THAN 9 IS THE LIMIT

                res.status(403).json({
                  message: 'Ви створили багато оголошень, будь-ласка зачекайте закінчення дії попереднього або видаліть одне за них (ліміт - 10 оголошень одночасно). Давайте залишимо місце і іншим!'
                })
              } else {
              // LESS THAN 10 IS OKAY!

                  try {
                    const post = new Post({
                      _userId:      user._id,
                      title:        req.body.title,
                      description:  req.body.description,
                      cat1:         req.body.cat1,
                      cat2:         req.body.cat2,
                      term:         req.body.days,
                      location: { type: "Point", coordinates: [ req.body.long, req.body.lat ] },
                    })
                    post.save(function (err) {
                      if(err){
                        res.status(500).json({
                          message: err.message
                        })
                      } else {
                        res.status(201).json({
                          message: 'Оголошення: '+req.body.title+' успішно опубліковано!',
                          nextPost: user.nextPost,
                          balance: user.balance,
                          basicCount: user.basicCount
                        })
                      }
                    })
                  } catch (e) {
                    errorHandler(res, e)
                  }
              }
            }

          }
        }

    })
  }
}

module.exports.update = async function(req, res) {
  if (req.body.email == null) {
    res.status(404).json({
      message: 'Відсутній email!'
    })
  } else if (req.body.password == null) {
    res.status(404).json({
      message: 'Спробуйте увести пароль.'
    })
  } else {
  // Check password, user exist

    const user = await User.findOne({email: req.body.email})
    const passwordResult = bcrypt.compareSync(req.body.password, user.password)
    if (passwordResult) {
      const postSearch = await Post.findOne({_id: req.params.id})
      if (postSearch == null || postSearch == undefined){
        res.status(404).json({
          message: 'Такого оголошення не знайдено!'
        })
      } else if (postSearch._userId.toString() === user._id.toString()){
      // Auth ID should match POST id of the user

        const updated = {
          title:        req.body.title,
          description:  req.body.description
        }

        try {
          const post = await Post.findOneAndUpdate(
            {_id: req.params.id},
            {$set: updated},
            {new: true}
          )
          res.status(200).json(post)
        } catch (e) {
          errorHandler(res, e)
        }
      } else {
        console.log("\n" + user.email + " \nTRIES TO ACCESS POST OF USER:")
        const postOwner = await User.findOne({_id: postSearch._userId})
        console.log(postOwner.email + "\n")
        res.status(402).json({
          message: 'Ви не можете редагувати дані інших людей!'
        })
      }

    } else {
      res.status(404).json({
        message: 'Невірні дані авторизації'
      })
    }

  }
}
