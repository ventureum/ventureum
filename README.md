# ventureum
Ventureum provides a platform for users to purchase third-party tokens. 
The platform provides a comprehensive monitoring system and a refund system. 
At the same time, the project funder can also sell Token through this platform.

### Project Funder (owner):
As a project funder, you can create A,B token, and sell all B tokens through ventureum. 
Ventureum can make your token more competitive. 
You should finish all milestone one by one after token sale, 
there will be a regulatory agency to rate your milestone. 
After a milestone finished (finalized), you will receive reward for that 
milestone(unlock the fund from token sale).
### Investor:
As an investor, you will see a list of investment project in ventureum platform. 
In each project, you can view the project information and decide whether to challenge it. 
After you buy some projects' token, you can monitor the milestone completion of this project 
and also the regulator evaluation. If you are not satisfied with this project, 
you can complete the refund during the refund phase.
### Proxy:
As a proxy, you can bid a project milestone object in milestone regulator stage. 
After you bid an object, you can rate it in rating stage. After a milestone finalized, 
proxy can received the reward by your reputation.

# How to start

## Alpha:
Ventureum alpha website: 

[alpha.ventureum.io](http://alpha.ventureum.io "alpha.ventureum.io")

## Test:
also, if you want create a demo or test the platform, we do provide a test website for you : 

[demo.ventureum.io](http://demo.ventureum.io "demo.ventureum.io")

Note: for demo reason, all time periods are different from normal version(formal ones). 
E.g.: In test, the minimum milestone length is 20 mins, it is 60 days in formal one.


# How to use it

## As an owner:
### 1, create a project (cost 50000 vtx)
### 2, wait the project to be approved (7 days)
If your project be challenged and success. Your project will be removed from ventureum project list.
Your project will be added to whitelist if `not be challenged` or `challenge failed`
### 3, Add all milestone and milestone objects 
### 4, start token sale.
### 5, active milestone and working on that.
In milestone stage, if you not finish your milestone on time or investors 
not satisfied with your results. Investors can refund in refund stage(normally the last 7 days).
### 6, When you finish your milestone, you can active next milestone in order to finalize this one.
To finalize this milestone, you need to activate next milestone. 
If this milestone is the last one, there will be a button called `finalize`
After the milestone finalized, you can withdraw the ehter left.

## As an investor:
### 1, Look the project information to decide whether to challenge
If you decide to challenge the project, it will cost you 50000 vtx. 
You will earn reward when the challenge succeeded.
### 2, Purchase token when project in token sale stage.
View the project information and milestone information before purchase.
### 3, Vote for the proxy in voting stage
For some reputable proxy, you can vote for them, 
and the result will affect the rewards that proxy finally receives.
Your vote can motivate them to monitor next milestone.
### 4, If you are not satisfied with the project milestone, you can refund in refund stage.
All refund ether will be locked by one month, after one month, you can withdraw them.


## As a proxy:
### 1, In milestone regulating stage, bid object that you can supervise.
Before you bid them, you can view the project object information and rewards.
### 2, In milestone rating stage, you should rate all objects that you bid.
Your rate have to be reasonable in order to gain the trust of investors.
### 3, You can withdraw reward after milestone finalized.



# Development Environment

### 1. Install Docker

### 2. Run the Docker Container
```
./dock.sh
```
### The Development Environment Contains the Following
```
Ubuntu 16.04
sudo
curl
git
vim
spacemacs
Node.js 8
truffle
```
