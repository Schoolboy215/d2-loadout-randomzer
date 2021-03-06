var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser=require('body-parser');
var session = require('express-session');
var passport = require('passport');
var hbs = require('express-handlebars');
var sassMiddleware  = require('node-sass-middleware');
const MongoClient = require('mongodb').MongoClient;
const uri = "mongodb+srv://connector:oAw1SHUvumepVmcO@testingcluster-34ofu.mongodb.net/test?retryWrites=true&w=majority";
const mongoClient = new MongoClient(uri, { useNewUrlParser: true });
require('./authenticate/init');

// var indexRouter = require('./routes/index');
// var verifiedRouter = require('./routes/verified');
// var authRouter = require('./routes/auth');

var app = express();
app.db = "DB not connected yet";

app.use('/stylesheets',sassMiddleware({
  /* Options */
  src: __dirname + '/sass',
  dest: __dirname + '/public/stylesheets',
  debug: true,
  outputStyle: 'expanded'
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine( 'hbs', hbs( { 
  extname: 'hbs', 
  defaultLayout: 'main',
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/partials/'
} ) );
app.set('view engine', 'hbs');

let RedisStore = require('connect-redis')(session);
var redis = require('redis');
var client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  store: new RedisStore({
    client : client
  }),
  secret: process.env.sessionSecret,
  resave: false,
  saveUninitialized: false,
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

// Routing
var indexRouter = require('./routes/index');
var verifiedRouter = require('./routes/verified')(app.db);
var authRouter = require('./routes/auth');

app.use('/', indexRouter);
app.use('/verified', verifiedRouter);
app.use('/auth', authRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error',{err: err});
});

mongoClient.connect(err => {
  if (err){
    console.log("MongoDB connection error");
    console.log(err);
    process.exit();
  }
  else
    app.db = mongoClient.db("d2LoadoutRandomizer");
});

module.exports = app;
