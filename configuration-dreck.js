const _ = require('underscore')

const addCallbackToPromise = require('add-callback-to-promise')
const Dreck = require('./dreck')

/**
 * options: {
 * 		configurationId (string),
 * 		afterModifyUrl: (string)
 * }
 */
class ConfigurationDreck extends Dreck {
	constructor(options) {
		super(options)
	}
	
	createQuery(req, res) {
		return this.createConfigurationIdQuery()
	}
	
	createConfigurationIdQuery() {
		let query = {
			configurationId: this.configurationId
		}
		return query
	}
	
	fetch(query, callback) {
		let p = new Promise((resolve, reject) => {
			this.mongoCollection.find(query).toArray(async (err, result) => {
				if(err) {
					this.log.error(err)
					return reject(err)
				}
				if(!result || result.length == 0) {
					result = await this.createNewFocus()
					resolve([result])
				}
				else {
					this.postFetchesProcessor(result).then((processed) => {
						resolve(processed)
					})
				}
			})
		})
		return addCallbackToPromise(p, callback)
	}
	
	save(focus, callback) {
		if(!focus.configurationId) {
			focus.configurationId = this.configurationId 
		}
		return super.save(focus, callback)
	}
	
	createNewFocus(callback) {
		let p = new Promise((resolve, reject) => {
			resolve(this.synchronousPostProcessor({
				configurationId: this.configurationId
			}))
		})
		
		return addCallbackToPromise(p, callback)
	}
	
	prepLocals(req, res, focus) {
		super.prepLocals(req, res, focus)
		let dvars = res.locals.dreck
		
		dvars.modifyUrl = req.baseUrl + '/configuration'
		dvars.editUrl = req.baseUrl + '/configuration'
	}
	
	afterModify(req, res, next, focus) {
		return res.redirect(this.afterModifyUrl)
	}
	
	addToRouter(router) {
		router.get('/configuration', this.editGET.bind(this))
		router.post('/configuration', this.modifyPOST.bind(this))
		return router
	}
}

module.exports = ConfigurationDreck


