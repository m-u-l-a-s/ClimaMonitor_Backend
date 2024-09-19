export const options = {
    url : process.env.COUCH_URL,
    requestDefaults: {
      auth: {
        password : process.env.COUCH_PASSWORD,
        username : process.env.COUCH_USERNAME
      }
    }
  }