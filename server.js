var express = require('express'),
    app = express(),
    session = require('express-session');

var bodyParser  = require('body-parser');
var morgan      = require('morgan');
var mongoose    = require('mongoose');

var config = require('./config');

var User   = require('./models/user');

mongoose.Promise = global.Promise;

mongoose.connect(config.database, {
  useMongoClient: true,
});
app.use(session({
    secret: config.secret,
    resave: true,
    saveUninitialized: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// use morgan to log requests to the console
app.use(morgan('dev'));

app.use(function(req, res, next) {
  if (req.session && req.session.user) {
    User.findOne({ name: req.session.user.name }, function(err, user) {
      if (user) {
        req.user = user;
        delete req.user.password; // delete the password from the session
        req.session.user = user;  //refresh the session value
        res.locals.user = user;
      }
      // finishing processing the middleware and run the route
      next();
    });
  } else {
    next();
  }
});

// Authentication and Authorization Middleware
var auth = function(req, res, next) {
  if (req.session && req.session.user)
    return next();
  else
    return res.sendStatus(401);
};

// Login endpoint
app.post('/login', function (req, res) {
  User.findOne({ name: req.body.name }, function(err, user) {
    if (!user) {
      res.send({ error: 'Invalid name.' });
    } else {
      if (req.body.password === user.password) {
        req.session.user = user;
        res.send({message: 'login success'});
      } else {
        res.send({ error: 'Invalid password.' });
      }
    }
  });
});

app.get('/logout', function (req, res) {
  req.session.destroy();
  res.send("logout success!");
});

app.post('/users', function(req, res) {
    var user = new User();      // create a new instance of the User model
    user.name = req.body.name;  // set the users name (comes from the request)
    user.password = req.body.password;  // set the users password (comes from the request)
    user.admin = req.body.admin;  // set the users admin (comes from the request)

    // save the user and check for errors
    var promise = user.save();
    promise.then(function () {
    res.json({ message: 'user created!' });
  }).catch(function(err) {
    res.send(err);
  });
})

app.get('/users', auth, function (req, res) {
  if (req.session && req.session.user) {
    User.findOne({ name: req.session.user.name }, function (err, user) {
      if (!user) {
        req.session.reset();
        res.sendStatus(401);
      } else {
        res.locals.user = user;
        User.find({}, function(err, users) {
          res.json(users);
        });
      }
    });
  } else {
    res.sendStatus(401);
  }

});

app.listen(3000);
console.log("app running at http://localhost:3000");