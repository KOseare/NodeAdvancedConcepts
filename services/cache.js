const mongoose = require('mongoose')
const redis = require('redis')
const util = require('util')

const redisUrl = 'redis://127.0.0.1:6379'
const client = redis.createClient(redisUrl)
client.hget = util.promisify(client.hget)

const exec = mongoose.Query.prototype.exec

mongoose.Query.prototype.cache = async function (options = {}) {
  this.useCache = true
  this.hashKey = JSON.stringify(options.key || '')

  return this
}

mongoose.Query.prototype.exec = async function () {
  if (!this.useCache) {
    return exec.apply(this, arguments)
  } 

  const key = JSON.stringify({
    ...this.getQuery(),
    collection: this.mongooseCollection.name
  })
  console.log(key)

  // See if there is a value for key in redis
  const cacheValue = await client.hget(this.hashKey, key)
  if (cacheValue) {
    console.log('CACHE')
    const doc = JSON.parse(cacheValue)
    const mongoData = Array.isArray(doc) 
      ? doc.map(d => this.model(d))
      : new this.model(doc) 
    return mongoData
  }

  const result = await exec.apply(this, arguments)
  
  client.hset(this.hashKey, key, JSON.stringify(result), 'EX', 10)
  
  return result
}

module.exports = {
  clearHash (hashKey) {
    client.del(JSON.stringify(hashKey))
  }
}