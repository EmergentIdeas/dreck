let inject = (req, focus, bannedInjectMembers, next) => {
	for(let entry of Object.entries(req.body)) {
		let key = entry[0]
		if(bannedInjectMembers.includes(key)) {
			continue
		}
		if(key.indexOf('.') > -1 || key.indexOf('/') > -1 || key.indexOf('\\') > -1) {
			continue
		}
		if(Array.isArray(focus[key])) {
			focus[key] = []
		}
	}
	for(let entry of Object.entries(req.body)) {
		let key = entry[0]
		if(bannedInjectMembers.includes(key)) {
			continue
		}
		if(key.indexOf('.') > -1 || key.indexOf('/') > -1 || key.indexOf('\\') > -1) {
			continue
		}
		if(Array.isArray(focus[key])) {
			focus[key].push(entry[1])
		}
		else {
			focus[key] = entry[1]
		}
	}
	next()
}

module.exports = inject