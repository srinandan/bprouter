'use strict';
const debug = require('debug')('plugin:bprouter');
var cm = require('volos-cache-memory');
const url = require('url');
var request = require('request');

module.exports.init = function(config, logger, stats) {

        var cachename = 'bprouter' + Math.floor(Math.random() * 100) + 1; //to ensure there is a unique cache per worker
        var lookupEndpoint = config['lookupEndpoint'];
        var lookupCache = config['lookupCache'] || 60000; //default is 1 min
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
                debug('plugin onrequest');
                var basePath = url.parse(req.url).pathname;
                var search = replaceAll(basePath, '/','_');
                var target = res.proxy.url;
                var queryparams = url.parse(req.url).search || '';

                debug('basePath ' + basePath + ' and target ' + target);

                if (disable) {
                    debug('plugin diabled');
                    next();
                } else {
                    cache.get(search, function(err, value) {
                            if (value) {
                                debug("found endpoint " + value);
                                //change endpoint
                                var parts = url.parse(value);
                                req.targetHostname = parts.host;
                                req.targetPort = parts.port;
                                req.targetPath = parts.pathname + queryparams;
                                next();
                            } else {
                                debug("key not found in cache");
                                    request(lookupEndpoint + "?basePath=" + search, function(error, response, body) {
                                        if (!error) {
                                            var endpoint = JSON.parse(body);
                                            if (endpoint.endpoint) {
                                                debug("found endpoint " + endpoint.endpoint);
                                                cache.set(search, endpoint.endpoint);
                                                var parts = url.parse(endpoint.endpoint, true);
                                                if (parts.hostname.includes(":")) {
                                                    var result = parts.hostname.split(":");
                                                    req.targetHostname = result[0];
                                                    req.targetPort = result[1];
                                                } else {
                                                    req.targetHostname = parts.hostname;
                                                    req.targetPort = parts.port;
                                                }
                                                req.targetPath = parts.pathname + queryparams;
                                            } else {
                                                debug("endpoint not found, using proxy endpoint");
                                                cache.set(search, target);
                                            }
                                        } else {
                                            debug(error);
                                            debug("endpoint not found, using proxy endpoint");
                                            cache.set(search, target);
                                        }
                                        next();
                                    });
                                }
                            });

                    }
                }
            }
        }
