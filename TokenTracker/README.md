# Token Tracker V 1.0

## Run it on Lambda
- There are three token_tracker_v3_${stage} already set up on Lambda
- Press "Test" in the lambda function would run the function (no input needed) and update the users' votes in coresponding database.
- The process may take several minutes depends on the size of user data.
- You should see the job report in the "Log" when the function finished.

## Run it on local machine
- You need a [**Redis server**](https://redis.io/topics/quickstart) running in the background.
- Add the following codes to "src/tokenTracker.js"

```javascript
async function main () {
  let t = new TokenTracker()
  await t.startUpdate()
} 

main()
```
- **Comment out the exports.handler function**

## How to upload to S3 and update Lambda
```
bash updateLambda.sh ${target}
```

where ${target} is ["exp", "test", "staging"]

## Run it in your lambda function
If you decide to upload this function to another aws lambda in a VPC. You must meet the following three requirements:
- The VPC the lambda function is in has access to outside internet.
- Your lambda function is in the right security group.(i.e. The security group can initiate outgoing connections)
- There is a Redis server running on a EC2 machine inside your VPC private subnet.

### Lambda function network settings:
- Choose your VPC.
- Select your VPC private subnet. Make sure your private subnet has NAT gateway set up properly. See below for how to set up NAT gateway for private subnet.
- Choose the security group for the lambda function. Make sure the security group you are using has access to outbound traffics.

### Set up NAT gateway
- **Make sure you have created both "private" and "public" subnet for your VPC before proceeding.**
- Go to your VPC console. Press "NAT Gateways" in the console.
- Press "Create a NAT Gateway"
- In the "Subnet", select the **"public"** subnet of your VPC.
- Choose a Elastic IP/ Create a new one. 
- After creating the NAT gateway, **copy the NAT gateway ID**, and go to "Route Table" from the VPC console.
- Select the "**Main**" route table for your VPC(Create a new one if you don't have one, make it "Main").
- In the "**Route**" tab, press edit. Put **0.0.0.0/0** in the Destination, and paste the NAT gateway you just created in to "Target". Press "Save".
- **Your Lamda function should be able to initial outgoing connection by now. If not, check the next steps.**
- Make sure your private subnet is associated with the main route table. Check "Subnet Asscociation" inside your main route table. Your **public subnet** should **not** be associated with this route table (main table).
- Make sure there is a "Internet Gateway" set up for your public subnet. Go to "Internet Gateways" in the VPC console. Your should see a internet gateway **"attached"** to your VPC. If not, create one.
- Copy the ID of the internet gateway attached to your VPC.
- Go back to "Route Tables", select your "not main" route table for your VPC.(Create a new one if you don't have it).
- In the "Routes" tab, Press "Edit", put **0.0.0.0/0** in Destination, and paste the internet ID you copied in to "Target". Press Save.
- In the "Subnet Associations" tab, make sure **only** your **"public subnet"** is associated with this route table(not main table). If not, press "Edit" and associate it with your public subnet.


