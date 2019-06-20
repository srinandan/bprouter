'use strict';
const debug = require('debug')('plugin:bprouter');
var cm = require('volos-cache-memory');
const url = require('url');
var request = require('request');
var https = require('https');
var http = require('http');
var httpAgent = new http.Agent({
  keepAlive: true
})
var httpsAgent = new https.Agent({
  keepAlive: true
})

module.exports.init = function(config, logger, stats) {

        var cachename = 'bprouter' + Math.floor(Math.random() * 100) + 1; 
        var lookupEndpoint = config['lookupEndpoint'];
        var lookupCache = config['lookupCache'] || 60000; 
        var disable = config['lookupDisabled'] || false;
        var cache = cm.create(cachename, {
            ttl: lookupCache
        });

        cache.setEncoding('utf8');

        function escapeRegExp(str) {
            return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
        }

        function replaceAll(str, find, replace) {
            return str.replace(new RegExp(escapeRegExp(find), 'g'), replace);
        }

        return {
            onrequest: function(req, res, next) {
                var basePath = res.proxy.base_path;
                var search = replaceAll(basePath, '/','_');
                var target = res.proxy.url;
                var queryparams = url.parse(req.url).search || '';

                if (disable) {
                    next();
                } else {
                    cache.get(search, function(err, value) {
                            if (value) {
                                var parts = url.parse(value);
                                req.targetHostname = parts.host;
                                req.targetPort = parts.port;
                                req.targetPath = basePath + queryparams;
                                next();
                            } else {  
                                var apiCall=lookupEndpoint + "?basePath=" + search;
                                    request(apiCall, function(error, response, body) {
                                        if (!error) {
                                            var endpoint = JSON.parse(body);
                                            if (endpoint.endpoint) {
                                                debug("found endpoint " + endpoint.endpoint);
                                                cache.set(search, endpoint.endpoint);
                                                var parts = url.parse(endpoint.endpoint, true);

                                                // solution for bprouter/issues/5
                                                
                                                var targetSecureProxy=require('url').parse(endpoint.endpoint).protocol=="https:";                                                
                                                if(targetSecureProxy==false){
                                                     res.proxy.agent = httpAgent;

                                                }else{
                                                     res.proxy.agent = httpsAgentt;
                                                }
                                                
                                                if (parts.hostname.includes(":")) {
                                                    var result = parts.hostname.split(":");
                                                    req.targetHostname = result[0];
                                                    req.targetPort = result[1];
                                                } else {
                                                    req.targetHostname = parts.hostname;
                                                    req.targetPort = parts.port;
                                                }
                                                req.targetSecure=false;
                                                req.targetPath = basePath + queryparams;
                                            } else {
                                                cache.set(search, target);
                                            }
                                        } else {
                                            debug(error);
                                            cache.set(search, target);
                                        }
                                        // debug(req);
                                        next();
                                    });
                                }
                            });

                    }
                }
            }
        }
