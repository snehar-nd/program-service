var kafka = require("kafka-node");
const fetch = require("node-fetch");
const logger = require("sb_logger_util_v2");
const loggerService = require("./loggerService");
const messageUtils = require("../service/messageUtil");
const responseCode = messageUtils.RESPONSE_CODE;
const errorCodes = messageUtils.ERRORCODES;
const envVariables = require("../envVariables");
const rspObj = {};

const qumlConsumer = () => {
  try {
    Consumer = kafka.Consumer;
    ConsumerGroup = kafka.ConsumerGroup;
    client = new kafka.KafkaClient({
      kafkaHost: envVariables.SUNBIRD_KAFKA_HOST,
    });
    payload = [
      {
        topic: envVariables.SUNBIRD_QUESTION_BULKUPLOAD_TOPIC,
        partition: 1,
      },
    ];

    var options = {
      kafkaHost: envVariables.SUNBIRD_KAFKA_HOST,
      groupId: envVariables.SUNBIRD_KAFKA_BULKUPLOAD_CONSUMER_GROUP_ID,
      fromOffset: "latest",
    };
    var consumerGroup = new ConsumerGroup(options, [
      envVariables.SUNBIRD_QUESTION_BULKUPLOAD_TOPIC
    ]);

    consumerGroup
      .on("message", function (message) {
        const qumlArr = JSON.parse(message.value);
        logger.info({ message: "Entered into the consumer service" });
        let parsedJsonValue = qumlArr;
        let createApiData = {
          request: {
            question: {
              code: parsedJsonValue.question.code,
              mimeType: parsedJsonValue.question.mimeType,
              name: parsedJsonValue.question.name,
              editorState: parsedJsonValue.question.editorState,
              primaryCategory: parsedJsonValue.question.primaryCategory,
              body: parsedJsonValue.question.body,
              processId: parsedJsonValue.question.processId,
              questionFileRefId: parsedJsonValue.question.questionFileRefId,
            },
          },
        };
        //fetch call for creating a question.
        fetch(`${envVariables.SUNBIRD_ASSESSMENT_SERVICE_BASE_URL}/question/v1/create`, {
            method: "POST", // or 'PUT'
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(createApiData),
          })
          .then((response) => response.json())
          .then((createResponseData) => {
            let updateApiData = createResponseData;
            delete parsedJsonValue.question.mimeType;
            delete parsedJsonValue.question.code;
            delete parsedJsonValue.question.processId;
            delete parsedJsonValue.question.questionId;
            let updateData = { request: parsedJsonValue };
            //if success fetch call for updating question.            
            if (
              createResponseData.responseCode.toLowerCase() ===
              "OK".toLowerCase()
            ) {
              fetch(
                `${envVariables.SUNBIRD_ASSESSMENT_SERVICE_BASE_URL}/question/v1/update/${createResponseData.result.identifier}`,
                {
                  method: "PATCH", // or 'PUT'
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify(updateData),
                }
              )
                .then((response) => response.json())
                .then((updateResponseData) => {
                  let reviewData = { request: { question: {} } };
                  //if success fetch call for reviewing question.
                  if (
                    updateResponseData.responseCode.toLowerCase() ===
                    "OK".toLowerCase()
                  ) {
                    fetch(
                      `${envVariables.SUNBIRD_ASSESSMENT_SERVICE_BASE_URL}/question/v1/review/${updateApiData.result.identifier}`,
                      {
                        method: "POST", // or 'PUT'
                        headers: {
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(reviewData),
                      }
                    )
                      .then((response) => response.json())
                      .then((reviewResponseData) => {
                        let publishApiData = { request: { question: {} } };
                        //if success fetch call for publishing question.
                        if (
                          reviewResponseData.responseCode.toLowerCase() ===
                          "OK".toLowerCase()
                        ) {
                          fetch(
                            `${envVariables.SUNBIRD_ASSESSMENT_SERVICE_BASE_URL}/question/v1/publish/${updateApiData.result.identifier}`,
                            {
                              method: "POST", // or 'PUT'
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify(publishApiData),
                            }
                          )
                            .then((response) => response.json())
                            .then((publishResponseData) => {
                              if (
                                publishResponseData.responseCode.toLowerCase() ===
                                "OK".toLowerCase()
                              ) {
                                updateResponse(
                                  updateApiData.result.identifier,
                                  `Successfully uploaded the question for the identifier:${updateApiData.result.identifier}`
                                );
                              }
                            })
                            .catch((error) => {
                              console.error("Error:", error);
                              updateResponse(
                                updateApiData.result.identifier,
                                `Something went wrong while Publishing the question`
                              );
                            });
                        } 
                      })
                      .catch((error) => {
                        console.error("Error:", error);
                        logger.error({
                          message:
                            "Something Went wrong while reviewing the questions",
                        });
                        updateResponse(
                          updateApiData.result.identifier,
                          `Something Went wrong while reviewing the questions: ${error}`
                        );
                      });
                  }
                })
                .catch((error) => {
                  console.error("Error:", error);
                  logger.error({
                    message: "Something Went Wrong While Updating the question",
                  });
                  updateResponse(
                    updateApiData.result.identifier,
                    `Something Went Wrong While Updating the question: ${error}`
                  );
                });
            }
          })
          .catch((error) => {
            console.error("Error:", error);
            logger.error({
              message: `Something Went Wrong While Creating the question ${error}`,
            });
          });
      
        })
      .on("error", function (message) {
        client.close();
      });
  } catch (error) {
    logger.error(
      {
        message: `Something Went Wrong While Creating the question ${error}`,
      },
      error
    );
  }
};

//function to update the status of all other fetch calls mentioned above using question update.
const updateResponse = (updateData, updateMessage) => {
  const updateNewData = {
    request: {
      question: {
        questionUploadStatus: updateMessage,
      },
    },
  };
  fetch(`${envVariables.SUNBIRD_ASSESSMENT_SERVICE_BASE_URL}/question/v1/update/${updateData}`, {
      method: "PATCH", // or 'PUT'
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updateNewData),
    })
    .then((response) => response.json())
    .then((updateResult) => {
      rspObj.responseCode = "OK";
      rspObj.result = {
        questionStatus: `Successfully updated the question data for the identifier: ${updateData}`,
      };
      logger.info({
        message: "Successfully updated the question data",
        rspObj,
      });
    })
    .catch((error) => {
      rspObj.errMsg = "Something Went wrong while updating question data";
      rspObj.responseCode = responseCode.SERVER_ERROR;
      logger.error(
        {
          message: "Something Went wrong while updating question data",
          errorData: error,
          rspObj,
        },
        errorCodes.CODE2
      );
    });
};

module.exports = {
  qumlConsumer,
  updateResponse
};
