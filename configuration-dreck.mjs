import Dreck from "./dreck.mjs"

/**
 * options: {
 * 		configurationId (string),
 * 		afterModifyUrl: (string)
 * }
 */
export class ConfigurationDreck extends Dreck {
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

	async fetch(query, callback) {
		try {
			let result = await this.dataService.fetch(query)

			if (!result || result.length == 0) {
				result = await this.createNewFocus()
				return [result]
			}
			result = await this.postFetchesProcessor(result)
			return result
		}
		catch (err) {
			this.log.error(err)
			throw err
		}
	}

	save(focus) {
		if (!focus.configurationId) {
			focus.configurationId = this.configurationId
		}
		return super.save(focus)
	}

	async createNewFocus(callback) {
		return await this.synchronousPostProcessor({
			configurationId: this.configurationId
		})
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



