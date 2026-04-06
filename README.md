# Dreck

Scaffolding to set up crud operations.

## Install

```bash
npm install dreck
```

## Configuration

```json
{ 
	"dreck": {
		"publicFilesPrefix": "/dreck/files"
		, "alwaysProvideResources": false
	}
}
```

## Integration
```js
import dreckSetup from "../initialize-webhandle-component.mjs"
let dreckManager = await dreckSetup(webhandle)
```


## Making a type specific Hanlder 


```js
import {Dreck} from "dreck"
import InMemoryDataService from '@dankolz/in-memory-data-service'

let data = [ /* some data here */ ]
let dataService = new InMemoryDataService({ })
dataService.collections.default = data

class PeopleDreck extends Dreck {
	constructor(options) {
		super()
		
		this.safeAssignOptions( 
			{
				locals: {
					pretemplate: 'app_pre',
					posttemplate: 'app_post'
				}
			}
		)
		this.safeAssignOptions(options)
	}
}

let router = webhandle.createRouter()
let dreck = new PeopleDreck()
dreck.addToRouter(router)
webhandle.routers.primary.use('/people', router)
```


## Options

What's going on here is a set of url handlers and templates to do CRUD operations. This makes it easy to edit different
types of data. It operates in two modes: a sortable set of tiles, a sorted table of items.

To operate as a set of tiles, you need to set the template for editing the fields and for showing the specific information on the tile.
This is in addition to specifying a template to be rendered before and after the content, providing a "frame" for the crud screens.

To set up a tiles dreck:

```js
dreck = new Dreck({
	locals: {
		pretemplate: 'start'
		, posttemplate: 'end'
		, sortableTileContentTemplate: 'people/people-tile'
		, fieldsTemplate: 'people/people-fields'
	}
	, dataService: dataService
})
```

To set up a table style dreck, you need to specify a template for the table headers and the data TDs for each data row.
```js
dreck = new Dreck({
	locals: {
		pretemplate: 'start'
		, posttemplate: 'end'
		, fieldHeaderCellsTemplate: 'people/people-list-header'
		, fieldDataCellsTemplate: 'people/people-list-row'
		, fieldsTemplate: 'people/people-fields'
	}
	, dataService: dataService
	, useSortOrder: false
})
```

`dataService` is an instance of `@dankolz/abstract-data-service`. The in memory service is useful for testing and building
more complex services, but probably you'll want a mongodb collection to back it. This will be something like:

```js
import MongoDataService from "@dankolz/mongodb-data-service";
import EventEmitter from "node:events";

let mongoDb = webhandle.primaryDatabase || webhandle.dbs['mydatabase'] || (/*something*/)
let collection = mongoDb.collection('collectionname')

let events = new EventEmitter()

let dataService = new MongoDataService({
	collections: {
		default: collection
	}
	, notification: events
})
```