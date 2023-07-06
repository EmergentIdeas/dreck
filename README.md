# Dreck

Scaffolding to set up crud operations.

## Making a type specific Hanlder 


```
const Dreck = require('dreck')


class DatabaseServerDreck extends Dreck {
	constructor(options) {
		super(Object.assign( 
			{
				templatePrefix: 'database-servers/',
				locals: {
					pretemplate: 'app_pre',
					posttemplate: 'app_post'
				}
			}
			, options
		))
	}
}

module.exports = DatabaseServerDreck
```