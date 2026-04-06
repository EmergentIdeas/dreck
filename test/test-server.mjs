import { Dreck } from "../dreck.mjs"
import InMemoryDataService from '@dankolz/in-memory-data-service'
import dreckSetup from "../initialize-webhandle-component.mjs"

let data = [
	{
		id: '1'
		, name: 'a'
	}
	, {
		id: '2'
		, name: 'b'
	}
]
export default async function setup(webhandle) {
	webhandle.development = true
	let dreckManager = await dreckSetup(webhandle)
	
	let dataService = new InMemoryDataService({ })
	dataService.collections.default = data


	let router = webhandle.createRouter()
	let dreck = new Dreck({
		locals: {
			pretemplate: 'start',
			posttemplate: 'end'
		}
		, dataService: dataService
	})
	dreck.addToRouter(router)
	webhandle.routers.primary.use('/test1', router)


	router = webhandle.createRouter()
	dreck = new Dreck({
		locals: {
			pretemplate: 'start'
			, posttemplate: 'end'
			, sortableTileContentTemplate: 'test/test1-tile'
			, fieldsTemplate: 'test/test1-fields'
		}
		, dataService: dataService
	})
	dreck.addToRouter(router)
	webhandle.routers.primary.use('/test2', router)


	router = webhandle.createRouter()
	dreck = new Dreck({
		locals: {
			pretemplate: 'start'
			, posttemplate: 'end'
			, fieldsTemplate: 'test/test1-fields'
		}
		, dataService: dataService
		, useSortOrder: false
	})
	dreck.addToRouter(router)
	webhandle.routers.primary.use('/test3', router)
	

	router = webhandle.createRouter()
	dreck = new Dreck({
		locals: {
			pretemplate: 'start'
			, posttemplate: 'end'
			, fieldHeaderCellsTemplate: 'test/test1-list-header'
			, fieldDataCellsTemplate: 'test/test1-list-row'
			, fieldsTemplate: 'test/test1-fields'
		}
		, dataService: dataService
		, useSortOrder: false
	})
	dreck.addToRouter(router)
	webhandle.routers.primary.use('/test4', router)
}