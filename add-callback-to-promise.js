function addCallbackToPromise(promise, callback) {
	if(callback) {
		promise = promise.then((obj) => {
			callback(null, obj)
		}).catch((err) => {
			callback(err)
		})
	}
	
	return promise
}

module.exports = addCallbackToPromise