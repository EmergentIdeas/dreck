import createInitializeWebhandleComponent from "@webhandle/initialize-webhandle-component/create-initialize-webhandle-component.mjs"
import ComponentManager from "@webhandle/initialize-webhandle-component/component-manager.mjs"
import path from "node:path"
import gridSetup from "@dankolz/ei-css-grid/initialize-webhandle-component.mjs"
import stylesSetup from "ei-form-styles-1/initialize-webhandle-component.mjs"
import setupDragSortableList from "@webhandle/drag-sortable-list/initialize-webhandle-component.mjs"

const initializeWebhandleComponent = createInitializeWebhandleComponent()

initializeWebhandleComponent.componentName = 'dreck'
initializeWebhandleComponent.componentDir = import.meta.dirname
initializeWebhandleComponent.defaultConfig = {
	"publicFilesPrefix": '/' + initializeWebhandleComponent.componentName + "/files"
	, "alwaysProvideResources": false
}
initializeWebhandleComponent.staticFilePath = 'public'
initializeWebhandleComponent.templatePath = 'views'


initializeWebhandleComponent.setup = async function(webhandle, config) {
	let manager = new ComponentManager()
	manager.config = config
	let gridManager = await gridSetup(webhandle)
	let stylesManager = await stylesSetup(webhandle)
	let managerDragSortableList = await setupDragSortableList(webhandle)
	
	webhandle.routers.preDynamic.use((req, res, next) => {
		if(config.alwaysProvideResources || !initializeWebhandleComponent.supportsMultipleImportMaps(req)) {
			manager.addExternalResources(res.locals.externalResourceManager)
		}
		next()
	})
	
	manager.addExternalResources = (externalResourceManager, options) => {
		gridManager.addExternalResources(externalResourceManager)
		stylesManager.addExternalResources(externalResourceManager)
		managerDragSortableList.addExternalResources(externalResourceManager)

		externalResourceManager.includeResource({
			mimeType: 'text/css'
			, url: config.publicFilesPrefix + '/css/styles.css'
		})

		externalResourceManager.includeResource({
			url: config.publicFilesPrefix + '/js/dreck-pages.mjs'
			, mimeType: 'application/javascript'
			, resourceType: 'module'
			, name: initializeWebhandleComponent.componentName
		})
		
	}

	webhandle.addTemplate(initializeWebhandleComponent.componentName + '/addExternalResources', (data) => {
		let externalResourceManager = initializeWebhandleComponent.getExternalResourceManager(data)
		manager.addExternalResources(externalResourceManager)
	})

	webhandle.addTemplate(initializeWebhandleComponent.componentName + '/doTheThing', (data) => {
		try {
			let externalResourceManager = initializeWebhandleComponent.getExternalResourceManager(data)
			manager.addExternalResources(externalResourceManager)

			let resources = externalResourceManager.render()
			let action = `
	<script type="module">
			import { component } from "${initializeWebhandleComponent.componentName}"
			component()
	</script>`

			return resources + action
		}
		catch(e) {
			console.error(e)
		}
	})

	// Allow access to the component and style code
	let filePath = path.join(initializeWebhandleComponent.componentDir, initializeWebhandleComponent.staticFilePath)
	manager.staticPaths.push(
		webhandle.addStaticDir(
			filePath,
			{
				urlPrefix: config.publicFilesPrefix
				, fixedSetOfFiles: true
			}
		)
	)
	
	webhandle.addTemplateDir(
		path.join(initializeWebhandleComponent.componentDir, initializeWebhandleComponent.templatePath)
		, {
			immutable: true
		}
	)

	return manager
}

export default initializeWebhandleComponent
