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
            try{
                var parsedProfile = JSON.parse(body);
            }
            catch(err) {
                resolve(["profile error",body]);
            }
            var characters = [];
            if (parsedProfile == null || parsedProfile["Response"] == null)
            {
                resolve(["profile error",body]);
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
getVaultInventory = function(user)
{
    return new Promise((resolve) => {
        request.get({
            "qs" : {"components" : "ProfileInventories"},
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/TigerSteam/Profile/"+user.id
        }, (error, response, body) => {
            var parsedBody = JSON.parse(body);
            var fullInventory = parsedBody["Response"]["profileInventory"]["data"]["items"];
            getListOfBucketsFromEquipment(user, fullInventory).then(bucketLookup => {
                var generalItems = []
                for (var index in fullInventory)
                {
                    if (fullInventory[index]["bucketHash"] == bucketLookup["General"])
                        generalItems.push(fullInventory[index]);
                }
                var Promises = []
                for (var index in generalItems)
                {
                    Promises.push(getItemInfo(user, generalItems[index]["itemHash"], generalItems[index]["itemInstanceId"]));
                }
                Promise.all(Promises).then(itemResults => {
                    resolve(itemResults);
                })
            });
        });
    });   
}
cleanupCharacterInventory = function(inventory, equipment, bucketLookup)
{
    return new Promise(resolve => {
        var cleanedItems = [];
        for (index in inventory)
        {
            var bucketName = Object.keys(bucketLookup).find(key => bucketLookup[key] === inventory[index]["bucketHash"]);
            if (inventory[index]["itemInstanceId"] != null && bucketName != null)
            {
                cleanedItems.push({
                    itemInstanceId : inventory[index]["itemInstanceId"],
                    itemHash : inventory[index]["itemHash"],
                    bucketName : bucketName,
                    bucketHash : inventory[index]["bucketHash"],
                    vault : false,
                    equipped : false
                });
            }
        }
        for (index in equipment)
        {
            var bucketName = Object.keys(bucketLookup).find(key => bucketLookup[key] === equipment[index]["bucketHash"]);
            if (equipment[index]["itemInstanceId"] != null && bucketName != null)
            {
                cleanedItems.push({
                    itemInstanceId : equipment[index]["itemInstanceId"],
                    itemHash : equipment[index]["itemHash"],
                    bucketName : bucketName,
                    bucketHash : equipment[index]["bucketHash"],
                    vault : false,
                    equipped : true
                });
            }
        }
        resolve(cleanedItems);
    });
}
returnCombinedInventoriesByBucket = function(characterInventory, vaultInventory, bucketLookup)
{
    return new Promise(resolve => {
        combinedInventory = {};
        for (bucketName in bucketLookup)
        {
            combinedInventory[bucketName] = [];
            for (itemIndex in characterInventory)
            {
                if (characterInventory[itemIndex]["bucketName"] == bucketName)
                    combinedInventory[bucketName].push(characterInventory[itemIndex]);
            }
            for (itemIndex in vaultInventory)
            {
                if (vaultInventory[itemIndex]["bucketName"] == bucketName)
                    combinedInventory[bucketName].push(vaultInventory[itemIndex]);
            }
        }
        resolve(combinedInventory);
    });
}
getItemInfo = function(user, itemHash, itemInstanceId)
{
    return new Promise(resolve => {
        request.get({
            "headers": {
                'X-API-Key': process.env.apiKey,
                'Authorization' : 'Bearer '+user.token},
            "url": "https://www.bungie.net/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/"+itemHash+"/"
        }, (error, response, body) => {
            parsedBody = JSON.parse(body);
            getBucketInfoFromHash(user,parsedBody["Response"]["inventory"]["bucketTypeHash"]).then(bucketInfo => {
                resolve({
                    itemInstanceId : itemInstanceId,
                    itemHash : itemHash,
                    bucketName : bucketInfo[0],
                    bucketHash : bucketInfo[1],
                    vault : true,
                    equipped : false
                });
            });
            //resolve(parsedBody["Response"]["displayProperties"]["name"]);
        })
    });
}
exports.getListOfItemsToEquip = function(items)
{
    return new Promise(resolve => {
        var bucketsToConsider = [
            "Kinetic Weapons",
            "Energy Weapons",
            "Power Weapons",
            "Helmet",
            "Gauntlets",
            "Chest Armor",
            "Leg Armor",
            "Class Armor"
        ];
        var itemsToEquip = [];
        for (bucket in bucketsToConsider)
        {
            bucket = bucketsToConsider[bucket];
            var currentPool = items[bucket];
            var holdingInPool = [];
            for (item in currentPool)
            {
                if (currentPool[item]["vault"] == false && currentPool[item]["equipped"] == false)
                    holdingInPool.push(currentPool[item]);
            }
            var index = Math.floor(Math.random() * currentPool.length);
            itemsToEquip.push({
                item : currentPool[index],
                sendToVault : false
            });
            if (currentPool[index]["vault"] == true && holdingInPool.length >= 9)
            {
                var index = Math.floor(Math.random() * holdingInPool.length);
                itemsToEquip.push({
                    item : holdingInPool[index],
                    sendToVault : true
                });
            }
        }
        resolve(itemsToEquip);
    })
}
exports.equipItemsFromList = function(user, characterId, items)
{
    return new Promise(resolve => {
        var transferPromises = [];
        var instanceIdArray = [];
        for (item in items)
        {
            if (items[item]["sendToVault"] == true)
            {
                transferPromises.push(
                    new Promise(innerResolve => {
                        request.post({
                            "headers": {
                                'X-API-Key': process.env.apiKey,
                                'Authorization' : 'Bearer '+user.token},
                            "url": "https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/",
                            body: {
                                itemReferenceHash : items[item]["item"]["itemHash"],
                                stackSize : 1,
                                transferToVault : true,
                                itemId : items[item]["item"]["itemInstanceId"],
                                characterId : characterId,
                                membershipType : 3
                            },
                            json: true
                        }, (error, response, body) => {
                            innerResolve("Transfer completed");
                        });
                    })
                );
            }
        }
        Promise.all(transferPromises).then(storageResults=> {
            transferPromises = [];
            for (item in items)
            {
                if (items[item]["item"]["vault"] == true)
                {
                    transferPromises.push(
                        new Promise(innerResolve => {
                            request.post({
                                "headers": {
                                    'X-API-Key': process.env.apiKey,
                                    'Authorization' : 'Bearer '+user.token},
                                "url": "https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/",
                                body: {
                                    itemReferenceHash : items[item]["item"]["itemHash"],
                                    stackSize : 1,
                                    transferToVault : false,
                                    itemId : items[item]["item"]["itemInstanceId"],
                                    characterId : characterId,
                                    membershipType : 3
                                },
                                json: true
                            }, (error, response, body) => {
                                innerResolve("Transfer completed");
                            });
                        })
                    );
                }
                instanceIdArray.push(items[item]["item"]["itemInstanceId"]);
            }
            Promise.all(transferPromises).then(transferResults => {
                request.post({
                    "headers": {
                        'X-API-Key': process.env.apiKey,
                        'Authorization' : 'Bearer '+user.token},
                    "url": "https://www.bungie.net/Platform/Destiny2/Actions/Items/EquipItems/",
                    body: {
                        itemIds : instanceIdArray,
                        characterid : characterId,
                        membershipType : 3
                    },
                    json: true
                }, (error, response, body) => {
                    resolve("Equip completed");
                })
            });
        })
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
            var inventoryAndEquip = parsedBody["Response"]["equipment"]["data"]["items"].concat(parsedBody["Response"]["inventory"]["data"]["items"]);
            var equipment = parsedBody["Response"]["equipment"]["data"]["items"];
            var inventory = parsedBody["Response"]["inventory"]["data"]["items"];
            getVaultInventory(user).then(vaultItems => {
                getListOfBucketsFromEquipment(user, inventoryAndEquip).then(bucketLookup => {
                    cleanupCharacterInventory(inventory, equipment, bucketLookup).then(characterInventory => {
                        returnCombinedInventoriesByBucket(characterInventory, vaultItems, bucketLookup).then(combinedInventory => {
                            resolve(combinedInventory);
                        });
                    });
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
        var checkedHashes = [];
        for (var equipment in equipmentArray)
        {
            equipment = equipmentArray[equipment];
            if (!checkedHashes.includes(equipment["bucketHash"]))
            {
                checkedHashes.push(equipment["bucketHash"]);
                Promises.push(getBucketInfoFromHash(user, equipment["bucketHash"]));
            }
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