const _ = require('underscore')
const formInjector = require('form-value-injector')
const commingle = require('commingle')
const simplePropertyInjector = require('./binders/simple-property-injector')
const filog = require('filter-log')
const MongoDataService = require('@dankolz/mongodb-data-service')

const addCallbackToPromise = require('add-callback-to-promise')

function getSingleFocus(foci) {
	return Array.isArray(foci) ? foci[0] : foci
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
				destroy: ['/:focusId'],			// DELETE delete an object
				delete: ['/:focusId/delete'],	// POST delete with a POST
				sort: ['/sort']					// POST set the sortOrder attribute by _id
				
			},
			templatePrefix: '',
			templates: {
				index: 'list',
				new: 'create',
				show: 'show',
				edit: 'edit',
				missing: 'missing'
			},
			contentType: 'text/html; charset=utf-8',
			mongoCollection: null,
			dataService: null,
			locals: {},
			bannedInjectMembers: ['_id'],
			allowedInjectMembers: [],
			injectors: [(req, focus, next) => {
				simplePropertyInjector(req, focus, this.bannedInjectMembers, next)
			}],
			log: filog('dreck:'),
			useSortOrder: true
		}, options)
		
		if(this.mongoCollection && !this.dataService) {
			this.dataService = new MongoDataService({
				collections: {
					default: this.mongoCollection
				}
			})
			this.dataService.postFetchesProcessor = async function(result, collectionName) {
				return new Promise((resolve, reject) => {
					if(!result._id && result.id) {
						result._id = result.id
					}
					resolve(result)
				})
			}
		}
		
	}
	
	indexGET(req, res, next) {
		this.fetch(this.createQuery(req, res))
		.then((focus) => {
			if(!focus || focus.length == 0) {
				this.prepLocals(req, res)
				res.locals.dreck.title = this.listTitle(focus)
				res.render(this.templatePrefix + this.templates.index)
			}
			else {
				this.prepLocals(req, res, focus)
				this.sort(req, res, focus).then((focus) => {
					res.locals.dreck.title = this.listTitle(focus)
					res.locals.focus = focus
					res.render(this.templatePrefix + this.templates.index)
				})
			}

		})
	}
	
	newGET(req, res, next) {
		this.createNewFocus().then((focus) => {
			this.addAdditionalFormInformation(focus, req, res).then((focus) => {
				this.prepLocals(req, res, focus)
				res.locals.dreck.title = this.createTitle(getSingleFocus(focus))
				this.addFormInjector(req, res, getSingleFocus(focus))
				res.render(this.templatePrefix + this.templates.new)
			})
		})
	}
	
	createPOST(req, res, next) {
		this.createNewFocus().then((focus) => {
			this.updateFocus(req, res, focus).then((updated) => {
				this.validateCreate(req, res, updated).then((validated) => {
					this.save(validated).then(() => {
						this.afterCreate(req, res, next, focus)
					}).catch((err) => {
						next(err)
					})
				}).catch((err) => {
					this.log(err)
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
				this.log.error('Missing for show: ' + req.originalUrl)
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
				this.log.error('Missing for edit screen: ' + req.originalUrl)
				this.prepLocals(req, res)
				res.render(this.templatePrefix + this.templates.missing)
			}
			else {
				this.addAdditionalFormInformation(focus, req, res).then((focus) => {
					this.prepLocals(req, res, focus[0])
					res.locals.dreck.title = this.editTitle(focus[0])
					this.addFormInjector(req, res, focus[0])
					res.render(this.templatePrefix + this.templates.edit)
				})
			}
		})
	}
	
	modifyPOST(req, res, next) {
		this.fetch(this.createQuery(req, res)).then((focus) => {
			if(Array.isArray(focus)) {
				if(focus.length == 1) {
					focus = focus[0]
				}
				else {
					next(new Error('Could not find object with id ' + req.params.focusId))
				}
			}
			this.updateFocus(req, res, focus).then((updated) => {
				this.validateModify(req, res, updated).then((validated) => {
					this.save(validated).then(() => {
						this.afterModify(req, res, next, focus)
					}).catch((err) => {
						this.log.error(err)
						next(err)
					})
				}).catch((err) => {
					this.log.error(err)
					this.prepLocals(req, res, updated)
					res.locals.dreck.title = this.editTitle(updated)
					this.addFormInjector(req, res, updated)
					res.render(this.templatePrefix + this.templates.edit)
				})
			})
		})
	}
	
	addFormInjector(req, res, focus) {
		res.addFilter((chunk) => formInjector(chunk, focus))
	}
	
	updatePUT(req, res, next) {
		
	}
	
	destroyDELETE(req, res, next) {
		
	}
	
	destroyPOST(req, res, next) {
		this.fetch(this.createQuery(req, res)).then((focus) => {
			if(Array.isArray(focus)) {
				if(focus.length == 1) {
					focus = focus[0]
				}
				else {
					next(new Error('Could not find object with id ' + req.params.focusId))
				}
			}
			this.deleteFocus(req, res, focus).then((validated) => {
				this.afterDelete(req, res, next)
			}).catch((err) => {
				this.log.error(err)
				this.afterDelete(req, res, next)
			})
		})
	}
	
	createQuery(req, res) {
		if(req.params.focusId) {
			return this.createIdQuery(req.params.focusId)
		}
	}
	
	createIdQuery(id) {
		return this.dataService.createIdQuery(id)
	}
	
	fetch(query, callback) {
		let p = new Promise((resolve, reject) => {
			this.dataService.fetch(query).then(result => {
				this.postFetchesProcessor(result).then((processed) => {
					resolve(processed)
				})

			}).catch(e => {
				return reject(e)
			})
		})
		return addCallbackToPromise(p, callback)
	}
	
	updateFocus(req, res, focus, callback) {
		let p = new Promise((resolve, reject) => {
			
			if(this.injectors.length > 0) {
				commingle(this.injectors)(req, focus, () => {
					resolve(focus)
				})
			}
			else {
				resolve(focus)
			}
		})		
		return addCallbackToPromise(p, callback)
	}
	
	sort(req, res, focus, callback) {
		let p = new Promise((resolve, reject) => {
			if(Array.isArray(focus)) {
				if(this.useSortOrder) {
					focus.sort((one, two) => {
						return (one.sortOrder || 0) > (two.sortOrder || 0) ? 1 : -1
					})
				}
			}
			resolve(focus)
		})		
		return addCallbackToPromise(p, callback)
	}

	setSortOrderPOST(req, res, next) {
		this.fetch({}).then((focus) => {
			let promises = []	
			for(let item of focus) {
				if(req.body[item._id]) {
					item.sortOrder = parseInt(req.body[item._id])
					promises.push(this.save(item))
				}
			}
			Promise.all(promises).then(() => {
				res.end('success')
			}).catch(err => {
				res.end('failed')
			})
		})
	}
	
	deleteFocus(req, res, focus, callback) {
		let p = this.dataService.remove({ _id: focus._id})	
		return addCallbackToPromise(p, callback)
	}
	
	save(focus, callback) {
		let p = new Promise((resolve, reject) => {
			this.dataService.save(focus).then(([result]) => {
				resolve(result)
			})
			.catch(e => {
				reject(e)
			})
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
	validateDelete(req, res, focus, callback) {
		let p = new Promise((resolve, reject) => {
			resolve(focus)
		})		
		return addCallbackToPromise(p, callback)
	}

	
	createNewFocus(callback) {
		let p = new Promise((resolve, reject) => {
			resolve(this.synchronousPostProcessor({}))
		})
		
		return addCallbackToPromise(p, callback)
	}
	
	addAdditionalFormInformation(focus, req, res, callback) {
		let p = new Promise((resolve, reject) => {
			resolve(focus)
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
		return obj
	}
	
	prepLocals(req, res, focus) {
		_.extend(res.locals, this.locals)
		let dvars = res.locals.dreck = {}
		dvars.baseUrl = req.baseUrl
		dvars.newUrl = req.baseUrl + this.urls.new[0]
		dvars.createUrl = req.baseUrl + this.urls.create[0]
		dvars.sortUrl = req.baseUrl + this.urls.sort[0]
		dvars.editPrefix = req.baseUrl
		dvars.deletePrefix = req.baseUrl
		if(dvars.editPrefix.lastIndexOf('/') != dvars.editPrefix.length - 1) {
			dvars.editPrefix += '/'
		}
		dvars.deleteSuffix
		
		if(focus) {
			res.locals.focus = focus
			if(!Array.isArray(focus)) {
				dvars.modifyUrl = req.baseUrl + this.urls.modify[0].replace(':focusId', this.getFocusId(focus))
				dvars.editUrl = req.baseUrl + this.urls.edit[0].replace(':focusId', this.getFocusId(focus))
			}
		}
		else {
			
		}
		
		res.setHeader('Content-Type', this.contentType)
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
		if(focus && focus.id) {
			return focus.id
		}
		// if(focus && focus._id) {
		// 	if(focus._id.toHexString) {
		// 		return focus._id.toHexString()
		// 	}
		// 	return focus._id
		// }
		
		return null
	}
	
	afterCreate(req, res, next, focus) {
		return res.redirect(req.baseUrl)
	}
	
	afterModify(req, res, next, focus) {
		return res.redirect(req.baseUrl)
	}
	
	afterDelete(req, res, next, focus) {
		return res.redirect(req.baseUrl)
	}
	
	addToRouter(router) {
		router.get(this.urls.index, this.indexGET.bind(this))
		router.get(this.urls.new, this.newGET.bind(this))
		router.post(this.urls.create, this.createPOST.bind(this))
		router.get(this.urls.show, this.showGET.bind(this))
		router.get(this.urls.edit, this.editGET.bind(this))
		router.post(this.urls.modify, this.modifyPOST.bind(this))
		router.put(this.urls.update, this.updatePUT.bind(this))
		router.delete(this.urls.destroy, this.destroyDELETE.bind(this))
		router.post(this.urls.delete, this.destroyPOST.bind(this))
		router.post(this.urls.sort, this.setSortOrderPOST.bind(this))
		return router
	}
}

module.exports = Dreck


