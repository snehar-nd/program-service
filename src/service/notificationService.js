const envVariables = require('../envVariables');
const learnerService = envVariables['CORE_INGRESS_GATEWAY_IP'];
const axios = require('axios');
const _ = require("lodash");
const messageUtils = require('../service/messageUtil');
const programMessages = messageUtils.PROGRAM;
const model = require('../models');

class NotificationService {
    async sendNotification(req, reqData) {
        const option = {
            url: `http://${learnerService}/learner/v1/notification/email`,
            method: 'post',
            headers: {
                ...req.headers
            },
            data: {
                request: reqData
            }
        };

        return axios(option);
    }

    getTemplate(status, type) {
        let template = '';
        if (status === 'Approved') {
            template = type + 'NominationAccept';
        }
        if (status === 'Rejected') {
            template = type + 'NominationReject';
        }
        return template;
    }

    async sendNominationEmail(req, users, program) {
        const userIdsToEmail = _.compact(_.map(users, user => {
            if (user.maskedEmail) {
                return user.userId;
            }
        }));

        if (_.isEmpty(userIdsToEmail)) {
            return;
        }

        const emailSubject = programMessages.NOMINATION.NOTIFY.EMAIL_SUBJECT.replace('{PROGRAM_NAME}', program.name);
        const mode = 'email';
        const request = {
            mode: mode,
            subject: emailSubject,
            recipientUserIds: userIdsToEmail,
            emailTemplateType: this.getTemplate('Approved', mode),
            projectName: program.name,
            baseUrl: envVariables.baseURL,
            body: 'VidyaDaan'
        };
        return this.sendNotification(req, request);
    }

    async sendNominationSms(req, users, program) {
        const userIdsToSms = _.compact(_.map(users, user => {
            if (user.maskedPhone) {
                return user.userId;
            }
        }));

        if (_.isEmpty(userIdsToSms)) {
            return;
        }

        const result = await model.configuration.findAll({
            where: {
              key: 'smsNominationAccept',
              status: 'active'
            }
          });

        const projectName = _.truncate(program.name, { length: 25 });
        let smsBody = _.get(_.first(result),'dataValues.value');
        smsBody = smsBody.replace('$projectName', projectName);
        smsBody = smsBody.replace('$url', 'https://vdn.diksha.gov.in');

        const request = {
            mode: 'sms',
            subject: 'VidyaDaan',
            body: smsBody,
            recipientUserIds: userIdsToSms
        };

        return this.sendNotification(req, request);
    }
}

module.exports = NotificationService;
