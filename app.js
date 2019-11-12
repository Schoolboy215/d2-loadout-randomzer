var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const bodyParser=require('body-parser');
const redis = require('redis');
var session = require('express-session');
var passport = require('passport');
var hbs = require('express-handlebars');
var sassMiddleware  = require('node-sass-middleware');
require('./authenticate/init');

var indexRouter = require('./routes/index');
var verifiedRouter = require('./routes/verified');
var authRouter = require('./routes/auth');

var app = express();

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
  //helpers: require("./public/javascripts/helpers.js").helpers,
  layoutsDir: __dirname + '/views/layouts/',
  partialsDir: __dirname + '/views/partials/'
} ) );
app.set('view engine', 'hbs');

// var rtg   = require("url").parse(process.env.REDISTOGO_URL);
// var redis = require("redis").createClient(rtg.port, rtg.hostname);

// redis.auth(rtg.auth.split(":")[1]);
let RedisStore = require('connect-redis')(session);
let redisClient = redis.createClient();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser(process.env.sessionSecret));
app.use(session({
  store: new RedisStore({
    client: redisClient,
    url: process.env.REDIS_URL
  }),
  secret: process.env.sessionSecret,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: true }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());
app.use(passport.initialize());
app.use(passport.session());

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
  res.render('error');
});

module.exports = app;
