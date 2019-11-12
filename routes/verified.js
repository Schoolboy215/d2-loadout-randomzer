var express = require('express');
var router = express.Router();
var passport = require('passport');
var profileService = require('../services/profile');

router.get('/', ensureAuthenticated, function(req, res, next) {
  res.render('verified', { username: req.user["name"] });
});

router.get('/characters', ensureAuthenticated, function(req, res, next) {
  profileService.getCharacters(req.user).then(result => {
    if (Array.isArray(result))
      res.json(result[1]);
    else
    { 
      if (req.session.randomizeResult != null)
      {
        var message = req.session.randomizeResult;
        delete req.session.randomizeResult;
        res.render('characters', { characters: result, message: message});
      }
      else
      {
        res.render('characters', { characters: result});  
      }
    }
  });
});

router.post('/characters/:characterId/randomize', function(req, res, next) {
  profileService.getInventoryFromCharacter(req.user, req.params.characterId).then(itemChoices => {
    profileService.equipRandomIntoEachSlot(req.user, req.params.characterId, itemChoices).then(result => {
      req.session.randomizeResult = JSON.stringify(result);
      res.redirect('/verified/characters');
    });
  });
});

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated())
      return next();
  else{
    req.session.redirectTo = req.originalUrl;
    res.redirect('/auth/login')
  }
}

module.exports = router;
