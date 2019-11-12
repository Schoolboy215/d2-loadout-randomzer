var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
    res.render('index', { loggedIn: (req.passport != null || req.user != null)});
});

module.exports = router;
