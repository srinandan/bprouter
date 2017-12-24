# Microgateway router plugin

## Overview
Microgateway exposes proxies deployed on Apigee Edge (that match edgemicro_* proxy name pattern). Microgateway reads the proxyname, basePath and target endpoint from the proxy bundle. Typically proxies have different target endpoints for each environment. In Apigee Edge, the different environments are handled via Target Servers or Route Rules or even some custom code. Since Microgateway does not have access to Target Server or Route Rules, this plugin will help solve this problem.

## Scenario
The proxy deployed in Apigee Edge is`edgemicro_sample`. The basePath is `/sample` and the target endpoint for dev is `http://api.sample1.com`, the target endpoint for test is `http://api.sample2.com`. We'll see how the plugin will help in this situation.

## Copy the plugin
Find the MG installation folder. 
`cd <MG_INSTALL>\plugins`
`git clone https://github.com/srinandan/bprouter.git`

## Enable the plugin
```
  plugins:
    sequence:
      - oauth
      - bprouter
```

## Configuration Options
* ttl: Set time to live for cache
* lookupEndpoint: The endpoint where MG can find target points for a proxy
* lookupDisabled: To enable or disable the plugin

### Sample Configuration
```
router:
  lookupEndpoint: http://xxxxx/edgemicro-bprouter/endpoint
```

## How does it work?
* Step 1: The call comes to MG. If the basePath matches a proxy, then proceed to step 2
* Step 2: check if the basePath exists in local (in memory cache). if not, proceed to step 3. If yes, step 6.
* Step 3: invoke the `lookupEndpoint` url and pass basePath as a parameter. The response contains an environment specific target endpoint.
* Step 4: Store the endpoint in local cache
* Step 5: route the request to the new endpoint.
* Step 6: use the values in the cache to route the request to the target endpoint stored in cache.

## Endpoint Lookup Implementation
There are a variety of ways to implement the endpoint lookup. You can use external services like Eureka or Consul. In this example, I have used an Apigee proxy that stores endpoint information in a KVM. The format of the KVM (environment scoped) is `basePath` maps to `targetendpoint`. Slashes can't be used in the name field on the KVM. These are replaced by underscores ('_'). For ex: `_sample` maps to `http://sample1.test.com`

The api proxy implementation is included in the repo.

### Create KVM
The name of the KVM used by the proxy is `microgateway-bprouter`. Here is the link to create one: https://docs.apigee.com/management/apis/post/organizations/%7Borg_name%7D/environments/%7Benv_name%7D/keyvaluemaps


