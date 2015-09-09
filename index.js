// Quick and dirty hack of https://www.npmjs.com/package/tough-cookie-filestore to ensure cookies can be held and loaded from memory. Good only for cookies that don't need to be persisted on disk.
'use strict';
var tough = require('tough-cookie');
var Store = tough.Store;
var permuteDomain = tough.permuteDomain;
var permutePath = tough.permutePath;
var util = require('util');

function FileCookieStore(filePath) {
    Store.call(this);
    this.idx = {}; // idx is memory cache

    var self = this;

    self.idx = this.idx;
}
util.inherits(FileCookieStore, Store);
exports.FileCookieStore = FileCookieStore;
FileCookieStore.prototype.idx = null;
FileCookieStore.prototype.synchronous = true;

// force a default depth:
FileCookieStore.prototype.inspect = function() {
    return "{ idx: "+util.inspect(this.idx, false, 2)+' }';
};

FileCookieStore.prototype.findCookie = function(domain, path, key, cb) {
    if (!this.idx[domain]) {
        return cb(null,undefined);
    }
    if (!this.idx[domain][path]) {
        return cb(null,undefined);
    }
    return cb(null,this.idx[domain][path][key]||null);
};

FileCookieStore.prototype.findCookies = function(domain, path, cb) {
    var results = [];
    if (!domain) {
        return cb(null,[]);
    }

    var pathMatcher;
    if (!path) {
        // null or '/' means "all paths"
        pathMatcher = function matchAll(domainIndex) {
            for (var curPath in domainIndex) {
                var pathIndex = domainIndex[curPath];
                for (var key in pathIndex) {
                    results.push(pathIndex[key]);
                }
            }
        };

    } else if (path === '/') {
        pathMatcher = function matchSlash(domainIndex) {
            var pathIndex = domainIndex['/'];
            if (!pathIndex) {
                return;
            }
            for (var key in pathIndex) {
                results.push(pathIndex[key]);
            }
        };

    } else {
        var paths = permutePath(path) || [path];
        pathMatcher = function matchRFC(domainIndex) {
            paths.forEach(function(curPath) {
                var pathIndex = domainIndex[curPath];
                if (!pathIndex) {
                    return;
                }
                for (var key in pathIndex) {
                    results.push(pathIndex[key]);
                }
            });
        };
    }

    var domains = permuteDomain(domain) || [domain];
    var idx = this.idx;
    domains.forEach(function(curDomain) {
        var domainIndex = idx[curDomain];
        if (!domainIndex) {
            return;
        }
        pathMatcher(domainIndex);
    });

    cb(null,results);
};

FileCookieStore.prototype.putCookie = function(cookie, cb) {
    if (!this.idx[cookie.domain]) {
        this.idx[cookie.domain] = {};
    }
    if (!this.idx[cookie.domain][cookie.path]) {
        this.idx[cookie.domain][cookie.path] = {};
    }
    this.idx[cookie.domain][cookie.path][cookie.key] = cookie;
    
    return cb(null);
};

FileCookieStore.prototype.updateCookie = function updateCookie(oldCookie, newCookie, cb) {
    // updateCookie() may avoid updating cookies that are identical.  For example,
    // lastAccessed may not be important to some stores and an equality
    // comparison could exclude that field.
    this.putCookie(newCookie,cb);
};

FileCookieStore.prototype.removeCookie = function removeCookie(domain, path, key, cb) {
    if (this.idx[domain] && this.idx[domain][path] && this.idx[domain][path][key]) {
        delete this.idx[domain][path][key];
    }
    
    return cb(null);
};

FileCookieStore.prototype.removeCookies = function removeCookies(domain, path, cb) {
    if (this.idx[domain]) {
        if (path) {
            delete this.idx[domain][path];
        } else {
            delete this.idx[domain];
        }
    }

    return cb(null);
};

