const {clearHash} = require('../services/cache');

module.exports = async (req, res, next) => {
  await next() // Waits for the next handler to finish correctly
  clearHash(req.user.id)
}
