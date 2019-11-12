# d2-loadout-randomzer
This repo is meant to be run via Heroku. It is a simple web app to allow users to log into their Bungie account and randomize the items equipped by their Destiny 2 characters.

There are a ton of commented blocks in here that might get cleaned up sometime.

If run locally, change the lines in the bin/www file to run the https server and point the .crt and .key files to actual objects in your root directory. You'll also need to set up a .env file with the following values
```
sessionSecret=[The secret you want to use for your session storage]
apiKey=[Your api key from Bungie]
clientId=[Your client id from Bungie]
clientSecret=[Your client secret from Bungie]
callbackURL=[A local callback for Bungie to hit back at. Needs to end in /auth/callback like this https://localhost:3000/auth/callback]
REDISCLOUD_URL=[The rediscloud url you get from Heroku]
```
