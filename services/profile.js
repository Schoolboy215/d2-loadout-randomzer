var request = require('request');

exports.getCharacters = function(user)
{
    return new Promise((resolve) => {
        request.get({
            "qs" : {"components" : "Characters"},
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/TigerSteam/Profile/"+user.id
        }, (error, response, body) => {
            if(error) {
                return console.dir(error);
            }
            var parsedProfile = JSON.parse(body);
            var characters = [];
            if (parsedProfile["Response"] == null)
            {
                resolve("Chracter loading error");
                return;
            }
            for(var key in parsedProfile["Response"]["characters"]["data"]) {
                var value = parsedProfile["Response"]["characters"]["data"][key];
                characters.push(value);
            }
            Promises = [];
            completed = 0;
            filledCharacters = {};
            for (var index in characters) {
                var character = characters[index];
                filledCharacters[character["characterId"]] = {
                    "characterId" : character["characterId"],
                    "gender" : "",
                    "race" : "",
                    "class" : "",
                    "light" : character["light"]
                }
                Promises.push(
                    [
                        new Promise(resolve => {resolve(character["characterId"])}),
                        getRaceFromHash(user, character["raceHash"]),
                        getGenderFromHash(user, character["genderHash"]),
                        getClassFromHash(user, character["classHash"])
                    ]
                );
                Promise.all(Promises[index]).then(values => {
                    filledCharacters[values[0]]["race"] = values[1];
                    filledCharacters[values[0]]["gender"] = values[2];
                    filledCharacters[values[0]]["class"] = values[3];
                    completed += 1;
                    if (completed == characters.length)
                        resolve(filledCharacters);
                });
            }
        });
    });   
}

getRaceFromHash = function(user, raceHash)
{
    return new Promise(resolve => {
        request.get({
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/Manifest/DestinyRaceDefinition/"+raceHash+"/"
        }, (error, response, body) => {
            parsedBody = JSON.parse(body);
            resolve(parsedBody["Response"]["displayProperties"]["name"]);
        })
    });
}
getGenderFromHash = function(user, genderHash)
{
    return new Promise(resolve => {
        request.get({
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/Manifest/DestinyGenderDefinition/"+genderHash+"/"
        }, (error, response, body) => {
            parsedBody = JSON.parse(body);
            resolve(parsedBody["Response"]["displayProperties"]["name"]);
        })
    });
}
getClassFromHash = function(user, classHash)
{
    return new Promise(resolve => {
        request.get({
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/Manifest/DestinyClassDefinition/"+classHash+"/"
        }, (error, response, body) => {
            parsedBody = JSON.parse(body);
            resolve(parsedBody["Response"]["displayProperties"]["name"]);
        })
    });
}

exports.getInventoryFromCharacter = function(user,characterId)
{
    return new Promise(resolve => {
        request.get({
            "qs" : {"components" : "CharacterEquipment,CharacterInventories"},
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/TigerSteam/Profile/"+user.id+"/Character/"+characterId+"/"
        }, (error, response, body) => {
            var parsedBody = JSON.parse(body);
            var inventoryAndEquip = parsedBody;
            getListOfBucketsFromEquipment(user, parsedBody["Response"]["equipment"]["data"]["items"]).then(bucketLookup => {
                getItemsEligibleToPutInBuckets(user, bucketLookup, inventoryAndEquip["Response"]["inventory"]["data"]["items"]).then(equipmentChoices => {
                    resolve(equipmentChoices);
                });
            });
        })
    });
}

exports.equipRandomIntoEachSlot = function(user,characterId,equipmentArray)
{
    return new Promise(resolve => {
        itemsToEquip = [];
        toReturn = {};
        for (var equipmentBucket in equipmentArray)
        {
            var choices = equipmentArray[equipmentBucket];
            var index = Math.floor(Math.random() * choices.length);
            if (choices[index] != null)
            {
                itemsToEquip.push(choices[index]);
                toReturn[equipmentBucket] = choices[index];
            }
        }
        request.post({
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/Actions/Items/EquipItems/",
            body: {
                itemIds : itemsToEquip,
                characterid : characterId,
                membershipType : 3
            },
            json: true
        }, (error, response, body) => {
            resolve("Equip completed");
        })
    });
}

getListOfBucketsFromEquipment = function(user, equipmentArray)
{
    return new Promise(resolve => {
        var Promises = [];
        for (var equipment in equipmentArray)
        {
            equipment = equipmentArray[equipment];
            Promises.push(getBucketInfoFromHash(user, equipment["bucketHash"]));
        }
        Promise.all(Promises).then(bucketLookups => {
            bucketLookup = {};
            for (var bucket in bucketLookups)
            {
                bucket = bucketLookups[bucket];
                bucketLookup[bucket[0]] = bucket[1];
            }
            resolve(bucketLookup);
        });
    });
}

getItemsEligibleToPutInBuckets = function(user, bucketLookup, inventoryArray)
{
    desiredBuckets = {};
    desiredBuckets["Kinetic Weapons"] = [];
    desiredBuckets["Energy Weapons"] = [];
    desiredBuckets["Power Weapons"] = [];
    desiredBuckets["Helmet"] = [];
    desiredBuckets["Gauntlets"] = [];
    desiredBuckets["Chest Armor"] = [];
    desiredBuckets["Leg Armor"] = [];
    desiredBuckets["Class Armor"] = [];
    return new Promise(resolve =>{
        for(var key in desiredBuckets) {
            var hashToMatch = bucketLookup[key]; 
            for (var item in inventoryArray)
            {
                item = inventoryArray[item];
                if (item["bucketHash"] == hashToMatch)
                {
                    desiredBuckets[key].push(item["itemInstanceId"]);
                }
            }
        }
        resolve(desiredBuckets);
    });
}

getBucketInfoFromHash = function(user, bucketHash)
{
    return new Promise(resolve => {
        request.get({
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryBucketDefinition/"+bucketHash+"/"
        }, (error, response, body) => {
            parsedBody = JSON.parse(body);
            resolve([parsedBody["Response"]["displayProperties"]["name"], bucketHash]);
        })
    });
}