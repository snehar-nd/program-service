var express = require("express");
const { buildPDFWithCallback } = require("../service/print/pdf");
const requestMiddleware = require("../middlewares/request.middleware");

const BASE_URL = "/program/v1";

// Refactor this to move to service
async function printPDF(req, res) {
  const id = req.query.id;
  const format = req.query.format;

  buildPDFWithCallback(id, function (binary, error, errorMsg) {
    var date = new Date();
    if (!error) {
      if (format === "json") {
        const resJSON = {
          id: "api.collection.print",
          ver: "1.0",
          ts: date.toISOString(),
          params: {
            id,
            format,
            status: "successful",
            err: null,
            errmsg: null,
          },
          responseCode: "OK",
          result: {
            content_id: id,
            base64string: binary,
          },
        };        
        res.send(resJSON);
      } else {
        res.contentType(`application/pdf; name=${id}.pdf`);
        res.send(`data:application/pdf;base64, ${binary}`);
      }
    } else {
      res.status(404).send({
        error: errorMsg,
      });
    }
  });
}

module.exports = function (app) {
  app
    .route(BASE_URL + "/print/pdf")
    .get(
      requestMiddleware.gzipCompression(),
      requestMiddleware.createAndValidateRequestBody,
      printPDF
    );
};
