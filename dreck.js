const _ = require('underscore')
const formInjector = require('form-value-injector')
const commingle = require('commingle')

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

class Dreck {
	constructor(options) {
		_.extend(this, {
			urls: {
				index: ['', '/'],				// GET show all
				new: ['/new'],					// GET show form to create
				create: ['/new'],				// POST submit form data to create
				show: ['/:focusId'],			// GET show a non-editiable summary of an object
				edit: ['/:focusId/edit'],		// GET show a from to edit
				modify: ['/:focusId/edit'],		// POST modify an existing object
				update: ['/:focusId'],			// PUT update an object
				destroy: ['/:focusId']			// DELETE delete an object
				
			},
			templatePrefix: '',
			templates: {
				index: 'list',
				new: 'create',
				show: 'show',
				edit: 'edit',
				missing: 'missing'
			},
			mongoCollection: null,
			locals: {},
			bannedInjectMembers: ['_id'],
			allowedInjectMembers: []
		}, options)
	}
	
	indexGET(req, res, next) {
		
	}
	
	newGET(req, res, next) {
		this.createNewFocus().then((focus) => {
			this.prepLocals(req, res, focus)
			res.locals.dreck.title = this.createTitle(focus[0])
			res.render(this.templatePrefix + this.templates.new)
		})
	}
	
	createPOST(req, res, next) {
		this.createNewFocus().then((focus) => {
			this.updateFocus(req, res, focus).then((updated) => {
				this.validateCreate(res, res, updated).then((validated) => {
					this.save(validated).then(() => {
						this.afterCreate(req, res, next, focus)
					}).catch((err) => {
						next(err)
					})
				}).catch((err) => {
					this.prepLocals(req, res, updated)
					res.locals.dreck.title = this.createTitle(updated)
					res.render(this.templatePrefix + this.templates.new)
				})
			})
		})
	}
	
	showGET(req, res, next) {
		this.fetch(this.createQuery(req, res))
		.then((focus) => {
			if(!focus || focus.length == 0) {
				this.prepLocals(req, res)
				res.render(this.templatePrefix + this.templates.missing)
			}
			else {
				this.prepLocals(req, res, focus[0])
				res.locals.dreck.title = this.showTitle(focus[0])
				res.render(this.templatePrefix + this.templates.show)
			}
		})
	}
	
	editGET(req, res, next) {
		this.fetch(this.createQuery(req, res))
		.then((focus) => {
			_.extend(res.locals, this.locals)
			if(!focus || focus.length == 0) {
				this.prepLocals(req, res)
				res.render(this.templatePrefix + this.templates.missing)
			}
			else {
				this.prepLocals(req, res, focus[0])
				res.locals.dreck.title = this.editTitle(focus[0])
				res.addFilter((chunk) => formInjector(chunk, focus[0]))
				res.render(this.templatePrefix + this.templates.edit)
			}
		})
	}
	
	modifyPOST(req, res, next) {
		this.fetch(this.createIdQuery(req.params.focusId)).then((focus) => {
			this.updateFocus(req, res, focus).then((updated) => {
				this.validateModify(res, res, updated).then((validated) => {
					this.save(validated).then(() => {
						this.afterModify(req, res, next, focus)
					}).catch((err) => {
						next(err)
					})
				}).catch((err) => {
					this.prepLocals(req, res, updated)
					res.locals.dreck.title = this.editTitle(updated)
					res.addFilter((chunk) => formInjector(chunk, updated))
					res.render(this.templatePrefix + this.templates.edit)
				})
			})
		})
	}
	
	updatePUT(req, res, next) {
		
	}
	
	destroyDELETE(req, res, next) {
		
	}
	
	createQuery(req, res) {
		if(req.params.focusId) {
			return this.createIdQuery(req.params.focusId)
		}
	}
	
	createIdQuery(id) {
		return {
			id: Buffer.from(id, "hex"),
			_bsontype: "ObjectID"
		}
	}
	
	fetch(query, callback) {
		let p = new Promise((resolve, reject) => {
			this.mongoCollection.find(query).toArray((err, result) => {
				if(err) {
					return reject(err)
				}
				if(result) {
					this.postFetchesProcessor(result).then((processed) => {
						resolve(processed)
					})
				}
				else {
					resolve(result)
				}
			})
		})
		return addCallbackToPromise(p, callback)
	}
	
	updateFocus(req, res, focus, callback) {
		let p = new Promise((resolve, reject) => {
			resolve(focus)
		})		
		return addCallbackToPromise(p, callback)
	}
	
	validateCreate(req, res, focus, callback) {
		let p = new Promise((resolve, reject) => {
			resolve(focus)
		})		
		return addCallbackToPromise(p, callback)
	}

	validateModify(req, res, focus, callback) {
		let p = new Promise((resolve, reject) => {
			resolve(focus)
		})		
		return addCallbackToPromise(p, callback)
	}

	
	createNewFocus(callback) {
		let p = new Promise((resolve, reject) => {
			resolve({})
		})
		
		return addCallbackToPromise(p, callback)
	}
	
	postFetchesProcessor(objs, callback) {
		let processors = []
		let results = []
		for(const ind in objs) {
			processors.push((o, t, next) => {
				this.postFetchProcessor(objs[ind]).then((changed) => {
					results[ind] = changed
					next()
				})
			})
		}
		
		let p = new Promise((resolve, reject) => {
			if(processors.length >= 1) {
				commingle([processors])({}, {}, () => {
					resolve(results)
				})
			}
			else {
				resolve(objs)
			}
		})
		return addCallbackToPromise(p, callback)
	}
	/**
	  *	Transforms a single object from raw js object to classed object or does other post 
	  * load processing.
	  */
	postFetchProcessor(obj, callback) {
		
		let p = new Promise((resolve, reject) => {
			obj = this.synchronousPostProcessor(obj)
			resolve(obj)
		})
		return addCallbackToPromise(p, callback)
	}
	
	synchronousPostProcessor(obj) {
		obj.test = 123
		return obj
	}
	
	prepLocals(req, res, focus) {
		_.extend(res.locals, this.locals)
		let dvars = res.locals.dreck = {}
		dvars.baseUrl = req.baseUrl
		dvars.newUrl = req.baseUrl + this.urls.new[0]
		dvars.createUrl = req.baseUrl + this.urls.create[0]
		
		if(focus) {
			res.locals.focus = focus
			if(!Array.isArray(focus)) {
				dvars.modifyUrl = req.baseUrl + this.urls.modify[0].replace(':focusId', this.getFocusId(focus))
				dvars.editUrl = req.baseUrl + this.urls.edit[0].replace(':focusId', this.getFocusId(focus))
			}
		}
		else {
			
		}
	}
	
	createTitle(focus) {
		return 'Create'
	}
	
	editTitle(focus) {
		return 'Edit'
	}
	
	listTitle(items) {
		return 'List'
	}
	
	showTitle(items) {
		return 'View'
	}
	
	getFocusId(focus) {
		if(focus && focus._id) {
			if(focus._id.toHexString) {
				return focus._id.toHexString()
			}
			return focus._id
		}
		
		return null
	}
	
	afterCreate(req, res, next, focus) {
		return res.redirect(req.baseUrl)
	}
	
	addToRouter(router) {
		router.get(this.urls.index, this.indexGET.bind(this))
		router.get(this.urls.new, this.newGET.bind(this))
		router.post(this.urls.create, this.createPOST.bind(this))
		router.get(this.urls.show, this.showGET.bind(this))
		router.get(this.urls.edit, this.editGET.bind(this))
		router.get(this.urls.modify, this.modifyPOST.bind(this))
		router.put(this.urls.update, this.updatePUT.bind(this))
		router.delete(this.urls.destroy, this.destroyDELETE.bind(this))
		return router
	}
}

module.exports = Dreck


