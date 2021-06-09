const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Token = require('../models/Token')
const keys = require('../config/keys')
const errorHandler = require('../utils/errorHandler')
const nodemailer = require('nodemailer')
const crypto = require('crypto');
const moment = require('moment') // time offset for date

require('dotenv').config()
const redirection = 'http://localhost:4200/'

// set "Less secure app account" for Gmail
// GMAIL -> "Ненадежные приложения, у которых есть доступ к аккаунту"

// LOGIN
module.exports.login = async function(req, res) {
  const candidate = await User.findOne({email: req.body.email})

  if (candidate) {
    // Check password, user exist
    const passwordResult = bcrypt.compareSync(req.body.password, candidate.password)
    if (passwordResult) {

      if (!candidate.confirmed){
        // check user is verified or not
        res.status(401).json({
          message: 'Ваш Email не підтверджено. Спробуйте надіслати активацію повторно.'
        })
      } else {
        // Token generation, passwords matched
        const token = jwt.sign(
          {
            email: candidate.email,
            userId: candidate._id
          },
          keys.jwt,
          {
            expiresIn: 60 * 60
          }
        )

        if (moment(candidate.nextPost)<moment(moment())){
          const update = await User.findOneAndUpdate(
            {email: req.body.email},
            {$set: {  nextPost: null } }
          )
        }

        res.status(200).json({
          message: 'Successfully Logged in!',
          token: `Bearer ${token}`,
          subscription: candidate.subscription,
          subscriptionExpires: candidate.subscriptionExpires,
          nextPost:   candidate.nextPost,
          codeCount:  candidate.codeCount,
          basicCount: candidate.basicCount,
          balance:    candidate.balance,
          username:   candidate.username,
          email:      candidate.email,
          phone:      candidate.phone,
          genderMale: candidate.genderMale,
          dateOfBirth:candidate.dateOfBirth,
          codeRef:    candidate.codeRef
        })
      }

    } else {
      // Пароли не совпали
      res.status(401).json({
        message: 'Паролі не співпадають. Спробуйте знову.'
      })
    }
  } else {
    // User doesn't exist, ERROR
    res.status(404).json({
      message: 'Користувач з таким email не знайдений.'
    })
  }
}


// REGISTRATION
module.exports.register = async function(req, res) {
  const candidate = await User.findOne({email: req.body.email})
  const phone =     await User.findOne({phone: req.body.phone})
  const refer =     await User.findOne({codeRef: req.body.ref})

  if (candidate) {
  // Пользователь существует, нужно отправить ошибку

    res.status(409).json({
      message: 'Такий email вже зайнято. Спробуйте інший'
    })
  } else if (phone) {
  // Такой телефон уже есть

    res.status(409).json({
      message: 'Такий телефон вже зайнято. Спробуйте інший'
    })
  } else {
  // Проверяем реферала

    if (req.body.ref != undefined && req.body.ref != null) {
    // Вказано значення коду

      if (refer) {
      // Реферал есть

        createUser(refer.email, req, res)

      } else {
      // Реферала нет

        res.status(404).json({
          message: 'Невірний реферальний код'
        })
      }
    } else {
    // Звичайна реєстрація без коду

      createUser(null, req, res)
    }

  }
}

module.exports.confirm = async function(req, res) {
  Token.findOne({ token: req.params.token }, function (err, token) {
      if (!token){
      // token is not found into database i.e. token may have expired

        res.status(400).json({
          message: 'Термін дії активації вичерпано, спробуйте надіслати Email ще раз.'
        })
      }
      else{
      // if token is found then check valid user

          User.findOne({ _id: token._userId, email: req.params.email }, function (err, user) {
              if (!user){
              // not valid user

                res.status(401).json({
                  message: 'Ми не змогли знайти користувача у базі данних, будь-ласка зареєструйтеся!'
                })
              }
              else if (user.confirmed){
              // user is already verified

                res.status(200).json({
                  message: 'Користувач вже активував акаунт. Ви можете увійти.'
                })
              }
              else{
              // verify user

                  user.confirmed = true
                  if (user.refBy != null) {

                    // Changes credentials for current user who registers
                    user.codeCount = 4
                    user.balance = 27.72
                    user.basicCount = 4

                    // Changes credentials for the REFFERAL friend
                    User.findOne({ email: user.refBy }, function (err, ref) {
                      var newCode = ref.codeRef
                      if (ref.codeCount == 1) {
                        newCode = null
                      }
                      ref.codeCount = ref.codeCount - 1
                      ref.codeRef = newCode,
                      ref.balance = ref.balance + 6.93,
                      ref.basicCount = ref.basicCount + 1

                      ref.save(function (err) {
                          if(err){
                            res.status(500).json({
                              message: err.message
                            })
                          }
                          else{
                          // account successfully verified

                              user.save(function (err) {
                                  if(err){
                                    res.status(500).json({
                                      message: err.message
                                    })
                                  }
                                  else{
                                  // account successfully verified

                                    res.redirect(302, redirection)
                                  }
                              })

                          }
                      })
                    })

                  } else {
                  // account without ref successfully verified

                      user.save(function (err) {
                          if(err){
                            res.status(500).json({
                              message: err.message
                            })
                          }
                          else{
                          // account successfully verified

                            //res.status(200).json({
                            //  message: 'Ваш акаунт успішно активовано.'
                            //})
                            res.redirect(302, redirection)
                          }
                      })

                  }

              // verify user
              }
          })
      }

  })

}

module.exports.resendLink = async function (req, res) {
    User.findOne({ email: req.body.email }, function (err, user) {

        // user is not found into database
        if (!user){
          res.status(400).json({
            //message: 'We were unable to find a user with that email. Make sure your Email is correct!'
            message: 'Ми не змогли знайти користувача з такою поштою. Переконайтесь, що Email правильний!'
          })
        }

        // user has been already verified
        else if (user.isVerified){
          res.status(200).json({
            //message: 'This account has been already verified. Please log in.'
            message: 'Цей акаунт вже верифіковано. Будь-ласка увійдіть.'
          })
        }

        // send verification link
        else{

            // generate token and save
            var token = new Token({
              _userId: user._id,
              token: crypto.randomBytes(16).toString('hex')
            })
            token.save(function (err) {

                if (err) {
                  res.status(500).json({
                    message: err.message
                  })
                }

                // Send email (use credintials of SendGrid)
                var transporter = nodemailer.createTransport({
                  service: 'gmail',
                  auth: {
                      user: process.env.EMAIL,
                      pass: process.env.PASSWORD
                  }
                })

                var mailOptions = {
                  from: 'Neighbours - сусіди!',
                  to: user.email,
                  subject: 'Активація Вашого акаунту у додатку "Сусіди"!',
                  text: 'Привіт, '+ user.username +',\n\n' + 'Будь-ласка, підтвердіть Вашу реєстрацію перейшовши за посиланням: \nhttp:\/\/' + req.headers.host + '\/api/auth/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' +'\n\n' + 'Якщо це були не ви - проігноруйте це повідомлення, або зверніться до служби підтримки встановивши додаток "Сусіди".'
                }

                transporter.sendMail(mailOptions, function (err) {
                  if (err) {
                    res.status(500).json({
                      message: 'Технічна помилка!, будь-ласка спробуйте надіслати Email знову.'
                    })
                  }
                  res.status(200).json({
                    message: 'Запит на підтвердження вислано на ' + user.email + '. Буде дійсним одну добу. Якщо Ви не отримали листа натисніть Надіслати знову.'
                  })
                })

            })
        }
    })
}


// GENERATE RANDOM REFFERAL LINK
function makeid(length) {
   var result           = ''
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
   var charactersLength = characters.length
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength))
   }
   return result
}

// CREATE NEW USER BASED ON REFFERAL CODE
function createUser(ref, req, res) {
   const salt = bcrypt.genSaltSync(10)
   const password = req.body.password
   const user = new User({
       username:    req.body.username,
       email:       req.body.email,
       dateOfBirth: req.body.dateOfBirth,
       genderMale:  req.body.male,
       password:    bcrypt.hashSync(password, salt),
       phone:       req.body.phone,
       codeRef:     makeid(6).toString(),
       new:         true,
       refBy:       ref
   })

     user.save(function (err) {
       if (err) {
         res.status(500).json({
           message: 'Помилка при збереженні данних на сервері' + err.message
         })
       }

       // generate token and save
       var token = new Token({
         _userId: user._id,
         token: crypto.randomBytes(16).toString('hex')
       })

       token.save(function (err) {

           if(err){
             res.status(500).json({
               message: 'Помилка збереження токена на сервері' + err.message
             })
           }

           // Send email (use credintials of SendGrid)
           var transporter = nodemailer.createTransport({
             service: 'gmail',
             auth: {
                 user: process.env.EMAIL,
                 pass: process.env.PASSWORD
             }
           })

           var mailOptions = {
             from: 'Neighbours - сусіди!',
             to: user.email,
             subject: 'Активація Вашого акаунту у додатку "Сусіди"!',
             text: 'Привіт, '+ req.body.username +',\n\n' + 'Будь-ласка, підтвердіть Вашу реєстрацію перейшовши за посиланням: \nhttp:\/\/' + req.headers.host + '\/api/auth/confirmation\/' + user.email + '\/' + token.token + '\n\nThank You!\n' +'\n\n' + 'Якщо це були не ви - проігноруйте це повідомлення, або зверніться до служби підтримки встановивши додаток "Сусіди".'
           }

           transporter.sendMail(mailOptions, function (err) {
             if (err) {
               res.status(500).json({
                 message: 'Технічна помилка! Не можемо надіслати Email. Будь-ласка, спробуйте надіслати Email знову.'
               })
             } else {
            // successfully

               res.status(200).json({
                 message: 'Запит на підтвердження вислано на ' + user.email + '. Буде дійсним одну добу. Якщо Ви не отримали листа натисніть Надіслати знову.'
               })
             }
           })

         })
     })
}
