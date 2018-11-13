# Prerequisites

## Install and run Loom

Follow the official doc: https://loomx.io/developers/docs/en/basic-install-all.html

## Install dependencies

```
npm install
```

## Compile and migrate contracts to Loom

```
truffle migrate --reset --network loom
```

## Copy build files to Frontend (e.g. Opportunity/src)

```
cp -r ./build/contracts/ ../../Opportunity/src
```
## Start Redis-server


```
bash ./redis.sh
```
## Start Listener


```
npm run startListener
```

Always restart listener after migration since the listener only retrieves build files once.
The listener is responsible to invoke BigBang apis and update database.
Currently, **exp** database is being used.

## Use [Arena](https://www.npmjs.com/package/bull-arena) for event queue visualization


```
npm run arena
```

# Testing

## Add mock data

```
truffle exec ./scripts/addMockData.js --network loom
```


## Set user type and reputation value

* First find the uuid and publicKey of the user you want to modify. 

These info can be found easily in Arena
![](https://i.imgur.com/DLcXcES.png)

* Then modifiy the uuid, publicKey reputation and userType in setUserType.js files

* Next, run the following command:

```
truffle exec ./scripts/setUserType.js --network loom

```

## Finalize Validators

After manually setting a new user as KOL, we often want to test the rating functions. The first step before obj rating is to finalize validators for the corresponding milestone (which basically sort and pick top K validators as the **designated milestone validators**).

Consider we pick top-K validators in each milestone, to finalize validators for project **projectId**'s milestone **milestoneId**, simply modifiy

```
scripts/finalizeValidators.js
```

by changing projectId, milestoneId and the number of validators to be picked. 

**IMPORTANT** 

Make sure the validator you are testing with is picked as a designated validator before rating.
