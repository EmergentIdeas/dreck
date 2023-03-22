function createValuedCheckboxInjector(inputName) {
	return (req, focus, next) => {
		if(req.body[inputName]) {
			if(Array.isArray(req.body[inputName])) {
				focus[inputName] = req.body[inputName]
			}
			else {
				focus[inputName] = [req.body[inputName]]
			}
		}
		else {
			focus[inputName] = []
		}
		next()
	}	
}

module.exports = createValuedCheckboxInjector