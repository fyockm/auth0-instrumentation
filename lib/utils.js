'use strict';

exports.tag = function(key, val) {
  return key + ':' + val;
};

exports.processTags = function(tags) {
  if (Array.isArray(tags)) {
    return tags;
  } else if (typeof tags === 'object') {
    const processedTags = [];
    for (let key in tags) {
      processedTags.push(exports.tag(key, tags[key]));
    }
    return processedTags;
  }
  return [];
};

exports.buildKinesisOptions = function (configMap, keepAliveAgent) {
  return {
    accessKeyId: configMap.AWS_ACCESS_KEY_ID,
    secretAccessKey: configMap.AWS_ACCESS_KEY_SECRET,
    sessionToken: configMap.AWS_SESSION_TOKEN,
    streamName: configMap.LOG_TO_KINESIS,
    region: configMap.AWS_KINESIS_REGION || configMap.AWS_REGION,
    partitionKey: function getPartitionKey() { return Date.now().toString() + Math.random(); },
    httpOptions: {
      agent: keepAliveAgent
    },
    objectMode: typeof configMap.KINESIS_OBJECT_MODE !== 'undefined' ? configMap.KINESIS_OBJECT_MODE : true,
    buffer: {
      timeout: configMap.KINESIS_TIMEOUT || 5,
      length: configMap.KINESIS_LENGTH || 50,
      isPrioritaryMsg: function (entry) {
        return entry.level >= 40;
      }
    }
  };
};

exports.decorateLogger = function(logger) {
  const createChildLoggerFactory = function(logger) {
    return function child(childOptions, simple) {
      return exports.decorateLogger(logger.child(childOptions, simple));
    };
  };
  const createLogFormatter = function(logger, lvl) {
    return function formatLog() {
      const args = Array.from(arguments);
      if (typeof args[0] === 'string' && typeof args[1] !== 'string') {
        const swap = args[0];
        args[0] = args[1] || {};
        args[1] = swap;
      }
      return logger[lvl].apply(logger, args);
    };
  };

  return {
    child: createChildLoggerFactory(logger),
    trace: createLogFormatter(logger, 'trace'),
    debug: createLogFormatter(logger, 'debug'),
    info: createLogFormatter(logger, 'info'),
    warn: createLogFormatter(logger, 'warn'),
    error: createLogFormatter(logger, 'error'),
    fatal: createLogFormatter(logger, 'fatal')
  };
};
