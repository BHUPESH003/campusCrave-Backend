// import { failResponse } from "../utils/response";
// import { S3 } from "aws-sdk";
const { S3 } = require("aws-sdk");
// import { devLogger } from "../utils/logging/log-helper";
// import { failResponse, successResponse } from "../utils/response";

const { failResponse, successResponse } = require("../utils/response");

const s3 = new S3({
  apiVersion: "2006-03-01",
  region: "ap-south-1",
  signatureVersion: "v4",
});
let validExtensions = ["jpg", "png"];
const bucketName = "campuscrave";
const getUploadURL = async (event) => {
  try {
    // devLogger("getUploadUrl", event, "event");
    let documentDetails = event.body.uploadedDocuments;
    let folderName = `${event.body.folderName}`;
    let signUrlData = [];
    documentDetails.map((document) => {
      let fileName = `${document.fileName}`;
      let ext = fileName.split(".").pop();
      if (validExtensions.includes(ext.toLowerCase())) {
        const preSignedUrl = uploadToS3(
          bucketName,
          `${folderName}/${fileName}`,
          300
        );
        console.log(preSignedUrl);
        signUrlData.push({
          fileName: fileName,
          uploadPath: preSignedUrl,
        });
      } else {
        signUrlData.push({
          fileName: fileName,
          uploadPath: null,
          info: "Extension is not allowed",
        });
      }
    });
    let result = {
      statusCode: "[200]",
      message: "Data Fetched",
      data: JSON.stringify(signUrlData),
    };
    if (signUrlData.length > 0) {
      return successResponse(result);
    } else {
      let result = {
        statusCode: "[400]",
        message: "Error in creating S3 upload url",
        data: null,
      };
      return failResponse(result);
    }
  } catch (e) {
    console.log(e);
  }
};

const uploadToS3 = (bucketName, key, expire) => {
  let preSignedUrl = s3.getSignedUrl("putObject", {
    Bucket: bucketName,
    Key: key,
    Expires: expire,
  });
  return preSignedUrl;
};
module.exports = { getUploadURL, uploadToS3 };
