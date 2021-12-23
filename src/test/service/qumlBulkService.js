process.env.NODE_ENV = "test";

const app = require("../../app");
const envVariables = require("../../envVariables");
const chai = require("chai");
const chaiHttp = require("chai-http");
chai.use(chaiHttp);
const { expect } = chai;
chai.use(require("chai-sorted"));
const _ = require("lodash");

const {readfile} = require("../../service/qumlBulkService.js");
const {updateResponse} = require("../../service/kafkaQumlConsumerService.js");



// const host = 'http://localhost:5000'
const BASE_URL = '/question/v1';

describe("QUML BULK UPLOAD SERVICE",async () => {
   
  it("it should give the questions related to the request data", (done) => {
    const program = {"filters": {"objectType": "collection", "identifier": "do_1133273110340894721318"}};
    chai
      .request(app)
      .post(BASE_URL + "/bulkUploadStatus")
      .set("Accept", "application/json")
      .send(program)
      .end((err, res) => {
        console.log("test case",res.body)
        expect(res.status).to.equal(200);
        expect(res.body.data).to.have.property("responseCode");
        done();
      },3000);
  });


  it("it should produce kafka data", (done) => {
    chai
      .request(app)
      .post(BASE_URL + "/bulkUpload")
      .set("Accept", "application/json")
      .attach(
        "File",
        fs.readFileSync("/home/navadhiti/Documents/example_2.json"),
        "/home/navadhiti/Documents/example_2.json"
      )
      .end((err, res) => {
        expect(res.status).to.equal(200);
          },3000).catch(done());
  });


  it("read file function test case", (done) => {
    readfile("qumlTestData")
    .then((response) => {
      expect(response[0]).to.have.property('userId');
      expect(response[0]).to.have.property('publisherId');
      expect(response[0]).to.have.property('organizationId');  
      done();
    })
    .catch((e) => {
      done(e);
    });
  });

  it("update response function to update data", (done) => {
    updateResponse("do_113351214093565952173","test case response","1629786995450")
    .then((response) => {
      expect(response.status).to.equal(200);
      done();
    })
    .catch((e) => {
      done(e);
    });
  });
});
