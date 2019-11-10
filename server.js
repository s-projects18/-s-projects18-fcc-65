'use strict';

// ======================== [1] require ===========================
var express     = require('express');
var bodyParser  = require('body-parser');
var expect      = require('chai').expect;
var cors        = require('cors');

var apiRoutes         = require('./routes/api.js');
var fccTestingRoutes  = require('./routes/fcctesting.js');
var runner            = require('./test-runner');
var helmet            = require('helmet');

// using express-response-formatter
// https://github.com/aofleejay/express-response-formatter
// { meta: ..., data: ...,  error: ... }
const responseEnhancer = require('express-response-formatter');

// mount database-helper lib
var database = require('./helper/database.js');

var app = express();


// ================= [2] create + configure app =====================
app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Add formatter functions to "res" object via "responseEnhancer()"
app.use(responseEnhancer());


// ------------------ security-stuff ----------------------------
// x-frame-options: SAMEORIGIN (Only allow your site to be loading in an iFrame on your own pages)
app.use( helmet.frameguard({action: 'sameorigin' }) );

// x-dns-prefetch-control: off (Do not allow DNS prefetching)
// + improves performance when the user clicks the link
// - it can appear as if a user is visiting things they aren’t visiting
app.use(helmet.dnsPrefetchControl());

// referrer-policy: same-origin (will only send the Referer header for pages on the same origin)
// Referer HTTP header is typically set by web browsers to tell a server where it’s coming from
app.use(helmet.referrerPolicy({ policy: 'same-origin' }));




// ----------------- middleware functions -----------------------
// show error page if there is no database-connection
app.use((req, res, next)=>{
  if(database.checkConnection()) next();
  else res.render('error-db.pug', {title: 'No database connection'});
});

// testing status for frontend
app.use((req, res, next)=>{
  if(req.query.test!==undefined) {
    if(req.query.test==200) res.formatter.ok([{title:'200: an dummy request'}], {info: 'Testinfo'});
    if(req.query.test==400) res.formatter.badRequest([{details:'400: an dummy bad request'},{details:'...'}]);
    if(req.query.test==500) res.formatter.serverError([{details:'500: an dummy bad request'},{details:'...'}]);
  } else next();
});


// ----------------- get/post functions -----------------------
//Sample front-end
app.route('/b/:board/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/board.html');
  });
app.route('/b/:board/:threadid')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/thread.html');
  });

//Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

//For FCC testing purposes
fccTestingRoutes(app);

//Routing for API 
apiRoutes(app);

//Sample Front-end

    
//404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});


// ================= [3] connect to database and start listening ================
// start listening - no matter what db-status is
// checking connection in middleware
database.connect();

//Start our server and tests!
app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port " + process.env.PORT);
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        var error = e;
          console.log('Tests are not valid:');
          console.log(error);
      }
    }, 1500);
  }
});

module.exports = app; //for testing
