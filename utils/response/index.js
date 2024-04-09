const successResponse = (result) => {
  let response = {
    statusCode: result.statusCode,
    message: result.message,
    data: JSON.parse(result.data),
  };
  return response;
};
const badRequest = (message, data) => {
  let response = {
    statusCode: "[400]",
    message,
    data,
  };
  return response;
};
const failResponse = (result) => {
  let response = {
    statusCode: result.statusCode,
    message: result.message,
    data: result.data,
  };
  return response;
};
const internalServer = (message, data) => {
  let response = {
    statusCode: "[500]",
    message,
    data,
  };
  return response;
};

module.exports = { successResponse, failResponse, internalServer, badRequest };
