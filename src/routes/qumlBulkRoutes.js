const qumlBulkUpload = require("../service/qumlBulkService");
const BASE_URL = '/question/v1';

module.exports = function (app) {
    app.route(BASE_URL + '/bulkUpload')
      .post(qumlBulkUpload.bulkUpload)
  
    app.route(BASE_URL + '/bulkUploadStatus')
      .post(qumlBulkUpload.qumlSearch)
  }
  