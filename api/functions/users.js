exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify({ users: [] })
    };
  }
  return { statusCode: 405, body: "Method not allowed" };
};
