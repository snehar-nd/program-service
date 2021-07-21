const TelemetryServiceInstance = require('sb_telemetry_util');
const envVariables = require('../envVariables');
const _ = require("lodash");
const telemetryEventConfig = require('../config/telemetryEventConfig.json');
const logger = require('sb_logger_util_v2');

const telemetryInstance = new TelemetryServiceInstance();

function initTelemetry() {
    config = {
        host: envVariables.telemetryConfig.host,
        endpoint: envVariables.telemetryConfig.endpoint,
        method: envVariables.telemetryConfig.method,
        batchsize: 10
    }
    telemetryInstance.init(config);
}

function generateAuditEvent(DBinstance, model, action) {
    const event = {};
        event['context'] = {
           pdata: telemetryEventConfig.pdata,
           env: model.name,
           channel: ''
        }
        event['edata'] = {
            state: DBinstance.status || '',
            prevstate: action === 'create' ? '' : DBinstance.previous().status || DBinstance.status,
            props: _.keys(DBinstance.previous())
        }
        event['object'] = {
           id: DBinstance[model.primaryKeyAttributes[0]] || '',
           type: model.name
        }
        logger.info({ msg: 'Audit Event', event})
    telemetryInstance.audit(event);
}

module.exports.initializeTelemetryService = initTelemetry
module.exports.generateAuditEvent = generateAuditEvent