import formInjector from "form-value-injector"
import commingle from "commingle"
import simplePropertyInjector from "./binders/simple-property-injector.mjs"
import filog from "filter-log"

function getSingleFocus(foci) {
	return Array.isArray(foci) ? foci[0] : foci
}

export class Dreck {
	constructor(options) {
		options ||= {}
		Object.assign(this, {
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
				index: 'dreck/standard-layout/list',
				indexTiles: 'dreck/standard-layout/list-sortable',
				new: 'dreck/standard-layout/create',
				show: 'dreck/standard-layout/show',
				edit: 'dreck/standard-layout/edit',
				missing: 'dreck/standard-layout/missing'
			},
			contentType: 'text/html; charset=utf-8',
			dataService: null,
			locals: {
				/* templates used to put the editor code in a "frame" */
				pretemplate: 'app_pre',
				posttemplate: 'app_post',
				
				/* set to change the fields when created/edited */
				fieldsTemplate: 'dreck/standard-layout/fields',
				/* optional, set if you need the create fields to be different from the edit fields */
				editFieldsTemplate: undefined,
				createFieldsTemplate: undefined,

				/* The field labels at the top of the data table */
				fieldHeaderCellsTemplate: 'dreck/standard-layout/list-row-header-cells',
				/* The td elements for the data of each row */
				fieldDataCellsTemplate: 'dreck/standard-layout/list-row-data-cells',
				
				/* The preview tile on the sortable list */
				sortableTileContentTemplate: 'dreck/standard-layout/sortable-tile-content',

				
				/* part of the structure. generally not necessary to change */
				indexRowsContentTemplate: 'dreck/standard-layout/index-rows-content',
				sortableTileTemplate: 'dreck/standard-layout/sortable-tile',


			},
			bannedInjectMembers: ['_id', 'id'],
			allowedInjectMembers: [],
			injectors: [],
			formInformation: [],
			log: filog('dreck:'),
			useSortOrder: true
		})
		this.injectors.push((req, focus, next) => {
			simplePropertyInjector(req, focus, this.bannedInjectMembers, next)
		})

		this.safeAssignOptions(options)
	}
	
	safeAssignOptions(options) {
		let { templatePrefix, contentType, dataService, bannedInjectMembers, allowedInjectMembers, injectors, log, useSortOrder } = options

		let mergeableOptions = { templatePrefix, contentType, dataService, bannedInjectMembers, allowedInjectMembers, injectors, log, useSortOrder }
		for (let key of Object.keys(mergeableOptions)) {
			if (mergeableOptions[key] === null || mergeableOptions[key] === undefined) {
				delete mergeableOptions[key]
			}
		}
		Object.assign(this, mergeableOptions)

		Object.assign(this.templates, options.templates)
		Object.assign(this.locals, options.locals)
	}

	async indexGET(req, res, next) {
		let focus = await this.fetch(this.createQuery(req, res))
		if (focus && focus.length > 0) {
			await this.sort(req, res, focus)
		}
		this.prepLocals(req, res, focus)
		res.locals.dreck.title = this.listTitle(focus)
		res.locals.focus = focus
		if (this.useSortOrder) {
			res.render(this.templatePrefix + this.templates.indexTiles)
		}
		else {
			res.render(this.templatePrefix + this.templates.index)
		}
	}

	async newGET(req, res, next) {
		let focus = await this.createNewFocus()
		focus = await this.addAdditionalFormInformation(focus, req, res)
		this.prepLocals(req, res, focus)
		res.locals.dreck.title = this.createTitle(getSingleFocus(focus))
		this.addFormInjector(req, res, getSingleFocus(focus))
		res.render(this.templatePrefix + this.templates.new)
	}

	async createPOST(req, res, next) {
		let focus = await this.createNewFocus()
		focus = await this.updateFocus(req, res, focus)
		try {
			focus = await this.validateCreate(req, res, focus)
			try {
				await this.save(focus)
				return this.afterCreate(req, res, next, focus)
			}
			catch (e) {
				return next(e)
			}
		}
		catch (err) {
			this.log.error(err)

			// show the new object page again
			focus = await this.addAdditionalFormInformation([focus], req, res)
			this.prepLocals(req, res, updated)
			res.locals.dreck.title = this.createTitle(focus)
			this.addFormInjector(req, res, focus)
			res.render(this.templatePrefix + this.templates.new)
		}
	}

	async showGET(req, res, next) {
		let focus = await this.fetch(this.createQuery(req, res))
		if (!focus || focus.length == 0) {
			this.log.error('Missing for show: ' + req.originalUrl)
			this.prepLocals(req, res)
			res.render(this.templatePrefix + this.templates.missing)
		}
		else {
			this.prepLocals(req, res, focus[0])
			res.locals.dreck.title = this.showTitle(focus[0])
			res.render(this.templatePrefix + this.templates.show)
		}
	}

	async editGET(req, res, next) {
		let focus = await this.fetch(this.createQuery(req, res))
		if (!focus || focus.length == 0) {
			this.log.error('Missing for edit screen: ' + req.originalUrl)
			this.prepLocals(req, res)
			res.render(this.templatePrefix + this.templates.missing)
		}
		else {
			focus = await this.addAdditionalFormInformation(focus, req, res)
			this.prepLocals(req, res, focus[0])
			res.locals.dreck.title = this.editTitle(focus[0])
			this.addFormInjector(req, res, focus[0])
			res.render(this.templatePrefix + this.templates.edit)
		}
	}

	async modifyPOST(req, res, next) {
		let focus = await this.fetch(this.createQuery(req, res))
		if (Array.isArray(focus)) {
			if (focus.length == 1) {
				focus = focus[0]
			}
			else {
				return next(new Error('Could not find object with id ' + req.params.focusId))
			}
		}
		focus = await this.updateFocus(req, res, focus)
		try {
			focus = await this.validateModify(req, res, focus)
			try {
				await this.save(focus)
				return this.afterModify(req, res, next, focus)
			}
			catch (e) {
				this.log.error(err)
				next(err)
			}
		}
		catch (err) {
			this.log.error(err)

			// show the edit screen again
			this.prepLocals(req, res, focus)
			res.locals.dreck.title = this.editTitle(focus)
			this.addFormInjector(req, res, focus)
			res.render(this.templatePrefix + this.templates.edit)
		}
	}

	addFormInjector(req, res, focus) {
		res.addFilter((chunk) => formInjector(chunk, focus))
	}

	updatePUT(req, res, next) {

	}

	destroyDELETE(req, res, next) {

	}

	async destroyPOST(req, res, next) {
		let focus = await this.fetch(this.createQuery(req, res))
		if (Array.isArray(focus)) {
			if (focus.length == 1) {
				focus = focus[0]
			}
			else {
				return next(new Error('Could not find object with id ' + req.params.focusId))
			}
		}

		try {
			focus = await this.deleteFocus(req, res, focus)
		}
		catch (err) {
			this.log.error(err)
		}
		finally {
			return this.afterDelete(req, res, next)
		}
	}

	createQuery(req, res) {
		if (req.params.focusId) {
			return this.createIdQuery(req.params.focusId)
		}
		return {}
	}

	createIdQuery(id) {
		return this.dataService.createIdQuery(id)
	}

	async fetch(query) {
		let results = await this.dataService.fetch(query)
		results = this.postFetchesProcessor(results)
		return results
	}

	async updateFocus(req, res, focus) {
		let p = new Promise((resolve, reject) => {

			if (this.injectors.length > 0) {
				commingle(this.injectors)(req, focus, () => {
					resolve(focus)
				})
			}
			else {
				resolve(focus)
			}
		})
		return p
	}

	sort(req, res, focus) {
		if (Array.isArray(focus) && this.useSortOrder) {
			focus.sort((one, two) => {
				return (one.sortOrder || 0) > (two.sortOrder || 0) ? 1 : -1
			})
		}
		return focus
	}

	async setSortOrderPOST(req, res, next) {
		let promises = []
		let focus = await this.fetch({})
		for (let item of focus) {
			if ((item._id && item._id in req.body) || (item.id && item.id in req.body)) {
				item.sortOrder = parseInt(req.body[item._id] || req.body[item.id] || 0)
				promises.push(this.save(item))
			}
		}
		Promise.all(promises).then(() => {
			res.end('success')
		}).catch(err => {
			res.end('failed')
		})
	}

	async deleteFocus(req, res, focus) {
		await this.dataService.remove({ id: focus.id })
	}

	async save(focus) {
		let [result] = await this.dataService.save(focus)
		return result
	}

	async validateCreate(req, res, focus) {
		return focus
	}

	async validateModify(req, res, focus) {
		return focus
	}
	async validateDelete(req, res, focus) {
		return focus
	}


	async createNewFocus() {
		return this.synchronousPostProcessor({})
	}

	async addAdditionalFormInformation(focus, req, res) {
		for(let info of this.formInformation) {
			let f = await info(focus, req, res)
			if(f) {
				focus = f
			}
		}
		return focus
	}

	async postFetchesProcessor(objs) {
		let results = []

		for (let obj of objs) {
			results.push(await this.postFetchProcessor(obj))
		}

		return results
	}
	/**
	  *	Transforms a single object from raw js object to classed object or does other post 
	  * load processing.
	  */
	async postFetchProcessor(obj) {
		obj = this.synchronousPostProcessor(obj)
		return obj
	}

	synchronousPostProcessor(obj) {
		if (!obj._id && obj.id) {
			obj._id = obj.id
		}
		return obj
	}

	prepLocals(req, res, focus) {
		Object.assign(res.locals, this.locals)
		if(!res.locals.editFieldsTemplate) {
			res.locals.editFieldsTemplate = res.locals.fieldsTemplate
		}
		if(!res.locals.createFieldsTemplate) {
			res.locals.createFieldsTemplate = res.locals.fieldsTemplate
		}
		let dvars = res.locals.dreck = {}
		dvars.baseUrl = req.baseUrl
		dvars.newUrl = req.baseUrl + this.urls.new[0]
		dvars.createUrl = req.baseUrl + this.urls.create[0]
		dvars.sortUrl = req.baseUrl + this.urls.sort[0]
		dvars.editPrefix = req.baseUrl
		dvars.deletePrefix = req.baseUrl
		if (dvars.editPrefix.lastIndexOf('/') != dvars.editPrefix.length - 1) {
			dvars.editPrefix += '/'
		}
		dvars.deleteSuffix

		if (focus) {
			res.locals.focus = focus
			if (!Array.isArray(focus)) {
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
		if (focus && focus.id) {
			return focus.id
		}
		if (focus && focus._id) {
			if (focus._id.toHexString) {
				return focus._id.toHexString()
			}
			return focus._id
		}

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


export default Dreck
