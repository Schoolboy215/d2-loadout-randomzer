var express = require('express');
var router = express.Router();
var passport = require('passport');
var profileService = require('../services/profile');

module.exports = function(mongoDB){

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

  router.post('/characters/:characterId/:classType/randomize', function(req, res, next) {
    profileService.getInventoryFromCharacter(req.app.db,req.user, req.params.characterId, req.params.classType).then(inventory => {
      let randomizeWeapons = (("weaponCheck" in req.body) ? true : false);
      let randomizeArmor = (("armorCheck" in req.body) ? true : false);
      profileService.getListOfItemsToEquip(inventory,randomizeWeapons,randomizeArmor).then(itemsToEquip => {
        profileService.equipItemsFromList(req.user, req.params.characterId, itemsToEquip).then(equipResults => {
          req.session.randomizeResult = JSON.stringify(equipResults);
          res.redirect('/verified/characters');
        })
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
  return router;
}

//module.exports = router;
