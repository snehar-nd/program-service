const fs = require("fs");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");
const KafkaService = require("../helpers/kafkaUtil");
const logger = require("sb_logger_util_v2");
const loggerService = require("./loggerService");
const messageUtils = require("./messageUtil");
const responseCode = messageUtils.RESPONSE_CODE;
const programMessages = messageUtils.PROGRAM;
const errorCodes = messageUtils.ERRORCODES;
const envVariables = require("../envVariables");
const rspObj = {};
const csv = require("express-csv");

const bulkUpload = async (req, res) => {
  const logObject = {
    traceId: req.headers["x-request-id"] || "",
    message: programMessages.QUML_BULKUPLOAD.INFO,
  };
  let totalQuestionLength = 0;
  let errorArray = [];
  let pId = uuidv4();
  let successArray = [];
  let qumlData;
  const fileType = req.files.File.mimetype;
  const fileName = req.files.File.name;
  loggerService.entryLog("Api to upload questions in bulk", logObject);
  //validating the file whether the incoming file is json or not
  if (fileType !== "application/json") {
    rspObj.errMsg = "The File  is not in JSON format!!";
    rspObj.responseCode = responseCode.SERVER_ERROR;
    logger.error({ message: "The File  is not in JSON format!!" });
    res
      .status(400)
      .send(
        { message: "The File  is not in JSON format!!", rspObj },
        errorCodes.CODE2
      );
  } else {
    const AppendData = req.files.File.data.toString("utf8");
    fs.writeFile(`${fileName}.json`, AppendData, (err) => {
      if (err) {
        rspObj.errMsg = "Something Went Wrong While Writing the file";
        rspObj.responseCode = responseCode.SERVER_ERROR;
        logger.error(
          { message: "Something Went Wrong While Writing the file", rspObj },
          errorCodes.CODE2
        );
        res
          .status(400)
          .send(
            { message: "Something Went Wrong While Writing the file", rspObj },
            errorCodes.CODE2
          );
      } else {
        logger.info({ message: "File has been written Successfully" });
      }
    });
    await readfile(fileName)
      .then((ele) => {
        qumlData = ele;
      })
      .catch((err) => {
        rspObj.errMsg = "Something went Wrong while file reading";
        rspObj.responseCode = responseCode.SERVER_ERROR;
        logger.error({
          message: "Something went Wrong while file reading",
          rspObj,
        });
        res
          .status(400)
          .send(
            {
              message: "Something went Wrong while file reading",
              errorData: err,
              rspObj,
            },
            errorCodes.CODE2
          );
      });
    totalQuestionLength = qumlData.length;
    //validating whether the userId,publisherId and organizationId is empty or not;
    for (let i = 0; i < qumlData.length; i++) {
      if (qumlData[i].userId === "") {
        errorArray.push(
          `${programMessages.QUML_BULKUPLOAD.MISSING_MESSAGE}: ${JSON.stringify(
            qumlData[i]
          )}`
        );
      } else if (qumlData[i].publisherId === "") {
        errorArray.push(
          `${programMessages.QUML_BULKUPLOAD.MISSING_MESSAGE}:${JSON.stringify(
            qumlData[i]
          )}`
        );
      } else if (qumlData[i].organizationId === "") {
        errorArray.push(
          `${programMessages.QUML_BULKUPLOAD.MISSING_MESSAGE}: ${JSON.stringify(
            qumlData[i]
          )}`
        );
      } else {
        qumlData[i].question["processId"] = pId;
        qumlData[i].question["questionFileRefId"] = uuidv4();
        successArray.push(`${JSON.stringify(qumlData[i])}`);
        //calling the kafka producer here
        KafkaService.sendRecordWithTopic(
          qumlData[i],
          envVariables.SUNBIRD_QUESTION_BULKUPLOAD_TOPIC,
          function (err, response) {
            if (err) {
              logger.error(
                {
                  message: "Something Went wrong while producing kafka",
                  errorData: err,
                },
                errorCodes.CODE2
              );
            }
          }
        );
      }
    }
    fs.unlink(`${fileName}.json`, function (err, res) {
      if (err) {
        logger.error({
          message: "Something Went wrong while performing unlink of the file ",
          errorData: err,
        });
      } else {
        logger.info({
          message: "Successfully unlinked the file",
          resData: res,
        });
      }
      //Do whatever else you need to do here
    });
  }
  rspObj.responseCode = "OK";
  rspObj.result = {
    questionStatus: `Bulk Upload process has started successfully for the process Id : ${pId}`,
    data: {
      "Total no of questions": totalQuestionLength,
      "No of questions getting processed": successArray.length,
      "No of questions With issues": errorArray.length,
      "Questions With wrong message": errorArray,
    },
  };
  logger.info({
    message: "Bulk Upload process has started successfully for the process Id",
    pId,
  });
  loggerService.exitLog(
  `Bulk Upload process has started successfully for the process Id : ${pId}`,
    rspObj
  );
  res
  .status(200)
  .send(
    {message: `Bulk Upload process has started successfully for the process Id : ${pId}`,rspObj}
    );
};

const readfile = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFile(`${filename}.json`, "utf8", (err, jsonString) => {
      if (err) {
        reject(err);
      } else {
        var qumlJsonData = JSON.parse(jsonString);
        resolve(qumlJsonData);
      }
    });
  });
};

//question search API function;
const qumlSearch = (req, res) => {
  const searchData =  {
    "request": { 
        "filters":{
            "objectType":"Question",
            "status":[],
            "processId":req.body.processId
        },
        "fields":["identifier","processId","author","name","status","primaryCategory","questionUploadStatus","code","questionFileRefId"],
        "limit":1000
    }
}
  const logObject = {
    traceId: req.headers["x-request-id"] || "",
    message: programMessages.QUML_BULKSTATUS.INFO,
  };
  loggerService.entryLog("Api to check the status of bulk upload question", logObject);
  fetch(`${envVariables.baseURL}/action/composite/v3/search`, {
    method: "POST", // or 'PUT'
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(searchData),
  })
    .then((response) => response.json())
    .then(async(resData) => {
      rspObj.responseCode = "OK";
      rspObj.result = {
        questionStatus: `Successfully fetched the data for the given request: ${searchData}`,
      };
      logger.info({ message: "Successfully Fetched the data", rspObj });
      res.csv(resData.result.Question)
    loggerService.exitLog(
     "Successfully got the Questions",
      rspObj,
    );    
    })
    .catch((error) => {
      rspObj.errMsg = "Something went wrong while fetching the data";
      rspObj.responseCode = responseCode.SERVER_ERROR;
      logger.error(
        {
          message: "Something went wrong while fetching the data",
          errorData: error,
          rspObj,
        },
        errorCodes.CODE2
      );
      res
        .status(400)
        .send(
          {
            message: "Something went wrong while fetching the data",
            errorData: error,
            rspObj,
          },
          errorCodes.CODE2
        );
    });
};

module.exports = {
  bulkUpload,
  qumlSearch,
  readfile
};
