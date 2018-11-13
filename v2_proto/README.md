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

