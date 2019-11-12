// file:app/authenticate/init.js
const passport = require('passport')
const OAuth2Strategy = require('passport-oauth2');
var request = require('request');

const user = {
  username: 'test-user',
  passwordHash: 'bcrypt-hashed-password',
  id: 1
}

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(id, done) {
    done(null, id);
});

passport.use(new OAuth2Strategy({
    authorizationURL: 'https://www.bungie.net/en/OAuth/Authorize',
    tokenURL: 'https://www.bungie.net/Platform/App/OAuth/token/',
    clientID: process.env.clientId,
    clientSecret: process.env.clientSecret,
    callbackURL: process.env.callbackURL
  },
  function(accessToken, refreshToken, profile, cb) {
    request.get({
        "headers": {
            'X-API-Key': process.env.apiKey,
            'Authorization' : 'Bearer '+accessToken},
        "url": "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
        "body": JSON.stringify({
            "firstname": "Nic",
            "lastname": "Raboy"
        })
    }, (error, response, body) => {
        if(error) {
            return console.dir(error);
        }
        var parsedProfile = JSON.parse(body);
        console.log(JSON.stringify(parsedProfile["Response"]["destinyMemberships"]));
        for (var profile in parsedProfile["Response"]["destinyMemberships"])
        {
            profile = parsedProfile["Response"]["destinyMemberships"][profile];
            if (profile["membershipType"] == 3)
            {
                return cb(null, {
                    "id" : profile["membershipId"],
                    "name" : profile["displayName"],
                    "token" : accessToken
                });
            }
        }       
    });
  }
));