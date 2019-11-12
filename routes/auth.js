var express = require('express');
var passport = require('passport');

const router = express.Router();

/* Send user to Bungie login */
router.get('/login', passport.authenticate('oauth2'));

/* GET back OAuth2 token */
router.get('/callback', passport.authenticate('oauth2', { failureRedirect: '/login' }),function(req, res) {
    var redirectTo = req.session.redirectTo || '/verified';
    delete req.session.redirectTo;
    // is authenticated ?
    res.redirect(redirectTo);
});

router.get('/logout', function(req,res) {
    req.logout();
    res.redirect('/');
});


module.exports = router;
