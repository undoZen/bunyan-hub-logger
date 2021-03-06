'use strict';
var bunyan = require('bunyan');
var uuid = require('uuid');
var assign = require('lodash.assign');
var env = process.env.NODE_ENV || 'development';
var PubStream = require('bunyan-pub-stream');

var stdSerializers = Object.create(bunyan.stdSerializers);
stdSerializers.req = function(req) {
    if (!req || !req.connection) {
        return req;
    }
    if (!req.req_id) {
        req.req_id = uuid.v4();
    }
    return assign({}, bunyan.stdSerializers.req(req), {
        req_id: req.req_id
    });
};
stdSerializers.res = function(res) {
    if (res && res.req) {
        return assign({}, bunyan.stdSerializers.res(res), {
            req_id: stdSerializers.req(res.req).req_id
        });
    } else {
        return bunyan.stdSerializers.res(res);
    }
};

var pubStreams = [];
exports = module.exports = function(opts) {
    opts = typeof opts === 'string' ? {
        name: opts
    } : opts || {};
    var ss = stdSerializers;
    var serializers = opts.serializers || opts.stdSerializers;
    if (serializers) {
        ss = Object.create(stdSerializers);
        assign(ss, serializers);
    }
    var level = 'development' === env ?
        (opts.developmentLevel ? opts.developmentLevel : 'trace') :
        (opts.productionLevel ? opts.productionLevel : 'debug');
    var nps = new PubStream();
    pubStreams.push(nps);
    var streams = [{
        level: level,
        stream: nps,
    }];
    if (Array.isArray(opts.streams)) {
        streams = streams.concat(streams);
    }
    var logger = bunyan.createLogger({
        name: opts.name,
        serializers: ss,
        streams: streams
    });
    if (opts.app) {
        logger.fields.app = opts.app;
    }
    return logger;
}

exports.endAll = function () {
    pubStreams.forEach(function (ps) {
        ps.end();
    });
};

exports.stdSerializers = stdSerializers;
exports.replaceDebug = require('./replaceDebug');
exports.replaceConsole = require('./replaceConsole');
