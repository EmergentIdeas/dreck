let inject = (req, focus, bannedInjectMembers, next) => {
	for(let entry of Object.entries(req.body)) {
		let key = entry[0]
		if(bannedInjectMembers.includes(key)) {
			continue
		}
		if(key.indexOf('.') > -1 || key.indexOf('/') > -1 || key.indexOf('\\') > -1) {
			let parts = key.split('/').join('.').split('\\').join('.').split('.')
			let cur = focus
			while(parts.length > 1) {
				let nextName = parts.shift()
				let nextCur = cur[nextName]
				if(!nextCur) {
					nextCur = {}
					cur[nextName] = nextCur
				}
				cur = nextCur
			}
			cur[parts[0]] = entry[1]
		}
	}
	next()
}

module.exports = inject